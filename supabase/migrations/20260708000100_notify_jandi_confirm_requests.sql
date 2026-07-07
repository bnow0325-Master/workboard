create extension if not exists pg_net with schema extensions;

create or replace function public.notify_jandi_on_confirm_request()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  recipient_name text;
  message_text text;
  project_title text;
  project_due_date text;
  sender_name text;
begin
  if new.body !~ '^\[확인요망:[^:]+:[^\]]+\]' then
    return new;
  end if;

  recipient_name := substring(new.body from '^\[확인요망:[^:]+:([^\]]+)\]');
  message_text := regexp_replace(new.body, '^\[확인요망:[^\]]+\]\s*', '');

  select p.title, p.due_date::text
    into project_title, project_due_date
    from public.projects p
   where p.id = new.project_id;

  select coalesce(m.full_name, new.writer_email)
    into sender_name
    from public.app_members m
   where m.email = new.writer_email;

  perform net.http_post(
    url := 'https://lwwfzwdjaedrfckyduno.supabase.co/functions/v1/notify-jandi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_LGd8ijujuQtCRYQtlrgnqw_EWqvRW50'
    ),
    body := jsonb_build_object(
      'type', 'confirm_request',
      'projectTitle', coalesce(project_title, ''),
      'recipientName', coalesce(recipient_name, ''),
      'senderName', coalesce(sender_name, new.writer_email),
      'message', coalesce(message_text, ''),
      'dueDate', coalesce(project_due_date, ''),
      'pageUrl', 'https://bnow0325-master.github.io/workboard/'
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_jandi_on_confirm_request on public.project_comments;

create trigger trg_notify_jandi_on_confirm_request
after insert on public.project_comments
for each row
execute function public.notify_jandi_on_confirm_request();
