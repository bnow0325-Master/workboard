alter table public.project_comments
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_project_comments_updated_at on public.project_comments;

create trigger trg_project_comments_updated_at
before update on public.project_comments
for each row
execute function public.set_updated_at();

drop policy if exists "members can update own comments" on public.project_comments;
create policy "members can update own comments"
on public.project_comments
for update
to authenticated
using (
  public.is_current_member()
  and writer_email = public.current_member_email()
)
with check (
  public.is_current_member()
  and writer_email = public.current_member_email()
);

drop policy if exists "admins can delete comments" on public.project_comments;
drop policy if exists "elon can delete comments" on public.project_comments;
create policy "elon can delete comments"
on public.project_comments
for delete
to authenticated
using (
  public.current_member_email() = 'elon.choo@bnow.co.kr'
);
