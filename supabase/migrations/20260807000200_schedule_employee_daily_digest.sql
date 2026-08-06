create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.employee_daily_digest_runs (
  run_date date not null,
  recipient_email text not null,
  recipient_name text not null,
  queued_at timestamptz not null default now(),
  request_id bigint,
  task_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  primary key (run_date, recipient_email)
);

alter table public.employee_daily_digest_runs enable row level security;
revoke all on table public.employee_daily_digest_runs from anon, authenticated;

create or replace function public.send_employee_daily_digests(
  p_run_date date default timezone('Asia/Seoul', now())::date,
  p_force boolean default false,
  p_recipient_email text default null
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  member_record record;
  task_lines text;
  selected_task_count integer;
  notification_payload jsonb;
  queued_request_id bigint;
  publishable_key text;
  inserted_count integer;
  queued_count integer := 0;
begin
  select decrypted_secret
  into publishable_key
  from vault.decrypted_secrets
  where name = 'workboard_publishable_key';

  if publishable_key is null then
    raise exception 'workboard_publishable_key is not configured in Vault';
  end if;

  if p_force then
    delete from public.employee_daily_digest_runs
    where run_date = p_run_date
      and (p_recipient_email is null or recipient_email = lower(trim(p_recipient_email)));
  end if;

  for member_record in
    select
      lower(trim(m.email)) as email,
      case
        when lower(trim(m.email)) = 'wei.huang@bnow.co.kr' then 'WEI'
        else trim(m.full_name)
      end as display_name
    from public.app_members m
    where m.is_active = true
      and m.full_name <> '이세언'
      and (p_recipient_email is null or lower(trim(m.email)) = lower(trim(p_recipient_email)))
      and exists (
        select 1
        from public.projects p
        where lower(trim(p.assignee_email)) = lower(trim(m.email))
          and p.status not in ('완료', '보관')
          and p.title <> '__BNOW_IDPW_BOARD__'
          and p.title not like '__BNOW_GOVERNMENT_BOARD_SYNC__%'
      )
    order by m.full_name
  loop
    select
      count(*),
      string_agg(
        format(
          '- [%s] %s (%s) | %s',
          p.status,
          p.due_date,
          case
            when p.due_date < p_run_date then format('D+%s', p_run_date - p.due_date)
            when p.due_date = p_run_date then '오늘 마감'
            else format('D-%s', p.due_date - p_run_date)
          end,
          left(p.title, 160)
        ),
        E'\n' order by p.due_date, p.title
      )
    into selected_task_count, task_lines
    from public.projects p
    where lower(trim(p.assignee_email)) = member_record.email
      and p.status not in ('완료', '보관')
      and p.title <> '__BNOW_IDPW_BOARD__'
      and p.title not like '__BNOW_GOVERNMENT_BOARD_SYNC__%';

    notification_payload := jsonb_build_object(
      'type', 'schedule',
      'projectTitle', format('오늘의 등록 일정 (%s)', p_run_date),
      'recipientName', member_record.display_name,
      'senderName', '워크보드 자동 알림',
      'message', format(
        '확인할 일정 %s건입니다.%s%s%s%s',
        selected_task_count,
        E'\n\n',
        task_lines,
        E'\n\n',
        '완료한 업무는 워크보드에서 상태를 업데이트해 주세요.'
      ),
      'pageUrl', 'https://main.bnow.co.kr/'
    );

    insert into public.employee_daily_digest_runs (
      run_date,
      recipient_email,
      recipient_name,
      task_count,
      payload
    ) values (
      p_run_date,
      member_record.email,
      member_record.display_name,
      selected_task_count,
      notification_payload
    )
    on conflict (run_date, recipient_email) do nothing;

    get diagnostics inserted_count = row_count;
    if inserted_count = 0 then
      continue;
    end if;

    select net.http_post(
      url := 'https://lwwfzwdjaedrfckyduno.supabase.co/functions/v1/notify-jandi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', publishable_key,
        'Authorization', 'Bearer ' || publishable_key
      ),
      body := notification_payload
    ) into queued_request_id;

    update public.employee_daily_digest_runs
    set request_id = queued_request_id
    where run_date = p_run_date
      and recipient_email = member_record.email;

    queued_count := queued_count + 1;
  end loop;

  return queued_count;
end;
$$;

revoke all on function public.send_employee_daily_digests(date, boolean, text)
from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'bnow-employee-daily-digests'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

-- Supabase Cron uses UTC. 00:00 UTC is 09:00 in Asia/Seoul.
select cron.schedule(
  'bnow-employee-daily-digests',
  '0 0 * * *',
  $$select public.send_employee_daily_digests();$$
);
