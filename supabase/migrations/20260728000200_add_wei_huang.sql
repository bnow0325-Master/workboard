insert into public.app_members (email, full_name, role, is_active)
values ('wei.huang@bnow.co.kr', 'Wei', 'member', true)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    is_active = excluded.is_active;
