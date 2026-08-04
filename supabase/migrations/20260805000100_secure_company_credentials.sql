create table if not exists public.company_credentials (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  site_url text not null default '',
  login_id text not null,
  login_pw text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_credentials enable row level security;

create or replace function public.can_manage_company_credentials()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.app_members m
     where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       and m.is_active = true
       and m.full_name in ('추동현', '채민강')
  );
$$;

revoke all on function public.can_manage_company_credentials() from public;
grant execute on function public.can_manage_company_credentials() to authenticated;

drop policy if exists "credential managers can read" on public.company_credentials;
create policy "credential managers can read"
on public.company_credentials
for select
to authenticated
using (public.can_manage_company_credentials());

drop policy if exists "credential managers can insert" on public.company_credentials;
create policy "credential managers can insert"
on public.company_credentials
for insert
to authenticated
with check (public.can_manage_company_credentials());

drop policy if exists "credential managers can update" on public.company_credentials;
create policy "credential managers can update"
on public.company_credentials
for update
to authenticated
using (public.can_manage_company_credentials())
with check (public.can_manage_company_credentials());

drop policy if exists "credential managers can delete" on public.company_credentials;
create policy "credential managers can delete"
on public.company_credentials
for delete
to authenticated
using (public.can_manage_company_credentials());

revoke all on table public.company_credentials from anon;
grant select, insert, update, delete on table public.company_credentials to authenticated;

drop trigger if exists trg_company_credentials_updated_at on public.company_credentials;
create trigger trg_company_credentials_updated_at
before update on public.company_credentials
for each row
execute function public.set_updated_at();

insert into public.company_credentials (id, site_name, site_url, login_id, login_pw, note, updated_at)
select
  coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()),
  coalesce(item ->> 'siteName', ''),
  coalesce(item ->> 'siteUrl', ''),
  coalesce(item ->> 'loginId', ''),
  coalesce(item ->> 'loginPw', ''),
  coalesce(item ->> 'note', ''),
  coalesce(nullif(item ->> 'updatedAt', '')::timestamptz, now())
from public.projects p
cross join lateral jsonb_array_elements(p.content::jsonb) item
where p.title = '__BNOW_IDPW_BOARD__'
  and jsonb_typeof(p.content::jsonb) = 'array'
on conflict (id) do update
set site_name = excluded.site_name,
    site_url = excluded.site_url,
    login_id = excluded.login_id,
    login_pw = excluded.login_pw,
    note = excluded.note,
    updated_at = excluded.updated_at;

delete from public.projects where title = '__BNOW_IDPW_BOARD__';
