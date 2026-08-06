create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.instagram_upload_reminder_runs (
  run_date date primary key,
  queued_at timestamptz not null default now(),
  request_id bigint,
  payload jsonb not null default '{}'::jsonb
);

alter table public.instagram_upload_reminder_runs enable row level security;
revoke all on table public.instagram_upload_reminder_runs from anon, authenticated;

create or replace function public.send_wei_instagram_upload_reminder(
  p_run_date date default timezone('Asia/Seoul', now())::date,
  p_force boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  inserted_run_date date;
  notification_payload jsonb;
  queued_request_id bigint;
  publishable_key text;
  weekday_label text;
begin
  if not p_force and extract(isodow from p_run_date) not in (1, 3, 5) then
    return null;
  end if;

  select decrypted_secret
  into publishable_key
  from vault.decrypted_secrets
  where name = 'workboard_publishable_key';

  if publishable_key is null then
    raise exception 'workboard_publishable_key is not configured in Vault';
  end if;

  if p_force then
    delete from public.instagram_upload_reminder_runs
    where run_date = p_run_date;
  end if;

  insert into public.instagram_upload_reminder_runs (run_date)
  values (p_run_date)
  on conflict (run_date) do nothing
  returning run_date into inserted_run_date;

  if inserted_run_date is null then
    return null;
  end if;

  weekday_label := case extract(isodow from p_run_date)
    when 1 then '월요일'
    when 2 then '화요일'
    when 3 then '수요일'
    when 4 then '목요일'
    when 5 then '금요일'
    when 6 then '토요일'
    else '일요일'
  end;

  notification_payload := jsonb_build_object(
    'type', 'confirm_request',
    'projectTitle', format('인스타그램 업로드 일정 (%s)', p_run_date),
    'recipientName', 'WEI',
    'senderName', '자동 일정 알림',
    'message', format('%s 인스타그램 업로드 일정입니다. 업로드 후 완료 여부를 워크보드에 공유해 주세요.', weekday_label),
    'pageUrl', 'https://www.instagram.com/'
  );

  select net.http_post(
    url := 'https://lwwfzwdjaedrfckyduno.supabase.co/functions/v1/notify-jandi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', publishable_key,
      'Authorization', 'Bearer ' || publishable_key
    ),
    body := notification_payload
  ) into queued_request_id;

  update public.instagram_upload_reminder_runs
  set request_id = queued_request_id,
      payload = notification_payload
  where run_date = p_run_date;

  return queued_request_id;
end;
$$;

revoke all on function public.send_wei_instagram_upload_reminder(date, boolean) from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'bnow-wei-instagram-upload-reminder'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

-- Supabase Cron uses UTC. 03:00 UTC is 12:00 in Asia/Seoul.
select cron.schedule(
  'bnow-wei-instagram-upload-reminder',
  '0 3 * * 1,3,5',
  $$select public.send_wei_instagram_upload_reminder();$$
);
