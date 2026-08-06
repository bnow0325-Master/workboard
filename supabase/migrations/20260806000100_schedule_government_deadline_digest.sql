create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.government_deadline_digest_runs (
  run_date date primary key,
  queued_at timestamptz not null default now(),
  request_id bigint,
  task_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb
);

alter table public.government_deadline_digest_runs enable row level security;
revoke all on table public.government_deadline_digest_runs from anon, authenticated;

create or replace function public.send_government_deadline_digest(
  p_run_date date default timezone('Asia/Seoul', now())::date,
  p_force boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  sync_payload jsonb;
  inserted_run_date date;
  overdue_lines text;
  today_lines text;
  upcoming_lines text;
  digest_message text;
  notification_payload jsonb;
  selected_task_count integer := 0;
  queued_request_id bigint;
begin
  if p_force then
    delete from public.government_deadline_digest_runs
    where run_date = p_run_date;
  end if;

  insert into public.government_deadline_digest_runs (run_date)
  values (p_run_date)
  on conflict (run_date) do nothing
  returning run_date into inserted_run_date;

  if inserted_run_date is null then
    return null;
  end if;

  select p.content::jsonb
  into sync_payload
  from public.projects p
  where p.title like '__BNOW_GOVERNMENT_BOARD_SYNC__%'
    and p.content is not null
    and left(ltrim(p.content), 1) = '{'
  order by p.content::jsonb ->> 'savedAt' desc nulls last, p.created_at desc
  limit 1;

  with pending_tasks as (
    select
      left(coalesce(nullif(trim(task ->> 'name'), ''), '제목 없음'), 160) as task_name,
      case
        when task ->> 'dueDate' ~ '^\d{4}-\d{2}-\d{2}$'
          then (task ->> 'dueDate')::date
        else null
      end as due_date
    from jsonb_array_elements(coalesce(sync_payload -> 'tasks', '[]'::jsonb)) as task
    where coalesce(task ->> 'resultStatus', '') in ('준비중', '검토중')
      and coalesce(trim(task ->> 'submittedDate'), '') = ''
  ), due_tasks as (
    select task_name, due_date
    from pending_tasks
    where due_date is not null
      and due_date <= p_run_date + 7
  )
  select
    count(*),
    string_agg(
      format('- %s (D+%s) | %s', due_date, p_run_date - due_date, task_name),
      E'\n' order by due_date, task_name
    ) filter (where due_date < p_run_date),
    string_agg(
      format('- %s | %s', due_date, task_name),
      E'\n' order by task_name
    ) filter (where due_date = p_run_date),
    string_agg(
      format('- %s (D-%s) | %s', due_date, due_date - p_run_date, task_name),
      E'\n' order by due_date, task_name
    ) filter (where due_date > p_run_date)
  into selected_task_count, overdue_lines, today_lines, upcoming_lines
  from due_tasks;

  digest_message := concat_ws(
    E'\n\n',
    case when overdue_lines is not null then '■ 기한 초과' || E'\n' || overdue_lines end,
    case when today_lines is not null then '■ 오늘 마감' || E'\n' || today_lines end,
    case when upcoming_lines is not null then '■ 7일 이내' || E'\n' || upcoming_lines end
  );

  if selected_task_count = 0 then
    digest_message := '■ 오늘 확인할 마감 과제 없음' || E'\n'
      || '기한 초과 및 7일 이내 미제출 과제가 없습니다.';
  end if;

  notification_payload := jsonb_build_object(
    'type', 'deadline',
    'projectTitle', format('정부과제 만기일 요약 (%s)', p_run_date),
    'recipientName', '채민강',
    'message', digest_message,
    'pageUrl', 'https://main.bnow.co.kr/government/'
  );

  select net.http_post(
    url := 'https://lwwfzwdjaedrfckyduno.supabase.co/functions/v1/notify-jandi',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := notification_payload
  ) into queued_request_id;

  update public.government_deadline_digest_runs
  set request_id = queued_request_id,
      task_count = selected_task_count,
      payload = notification_payload
  where run_date = p_run_date;

  return queued_request_id;
end;
$$;

revoke all on function public.send_government_deadline_digest(date, boolean) from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'bnow-government-deadline-digest'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

-- Supabase Cron uses UTC. 00:00 UTC is 09:00 in Asia/Seoul.
select cron.schedule(
  'bnow-government-deadline-digest',
  '0 0 * * *',
  $$select public.send_government_deadline_digest();$$
);
