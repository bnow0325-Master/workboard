create extension if not exists pgcrypto;

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('대기 중', '진행 중', '완료', '보관'));

create table if not exists public.project_delete_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  project_snapshot jsonb not null,
  comments_snapshot jsonb not null default '[]'::jsonb,
  deleted_by_email text,
  deleted_at timestamptz not null default now()
);

alter table public.project_delete_logs enable row level security;

drop policy if exists "admins can read project delete logs" on public.project_delete_logs;
create policy "admins can read project delete logs"
on public.project_delete_logs
for select
to authenticated
using (public.is_admin());

create or replace function public.log_project_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comments_json jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
    into comments_json
    from public.project_comments c
   where c.project_id = old.id;

  insert into public.project_delete_logs (
    project_id,
    project_snapshot,
    comments_snapshot,
    deleted_by_email
  )
  values (
    old.id,
    to_jsonb(old),
    comments_json,
    public.current_member_email()
  );

  return old;
end;
$$;

drop trigger if exists trg_log_project_delete on public.projects;

create trigger trg_log_project_delete
before delete on public.projects
for each row
execute function public.log_project_delete();
