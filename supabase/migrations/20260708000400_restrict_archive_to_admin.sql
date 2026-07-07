create or replace function public.restrict_archive_status_to_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
    and (old.status = '보관' or new.status = '보관')
    and not public.is_admin()
  then
    raise exception 'Only admins can archive or restore projects.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restrict_archive_status_to_admin on public.projects;

create trigger trg_restrict_archive_status_to_admin
before update on public.projects
for each row
execute function public.restrict_archive_status_to_admin();
