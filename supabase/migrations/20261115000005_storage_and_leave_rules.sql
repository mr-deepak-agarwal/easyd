-- Easy D phase 2: storage buckets and a tighter leave-approval rule.

-- Leave applications: the old app let only admin, teamlead and teamlead2 see everyone's
-- applications and decide them. BD and employees see only their own.
drop policy if exists "leave read own or mgmt" on public.leave_applications;
drop policy if exists "leave mgmt decide" on public.leave_applications;
create policy "leave read own or approvers" on public.leave_applications for select to authenticated
  using (profile_id = auth.uid() or public.has_role('admin','teamlead','teamlead2'));
create policy "leave approvers decide" on public.leave_applications for update to authenticated
  using (public.has_role('admin','teamlead','teamlead2')) with check (public.has_role('admin','teamlead','teamlead2'));

-- Same for attendance: company register for approvers, own rows for everyone else.
drop policy if exists "attendance own or mgmt" on public.attendance;
create policy "attendance own or approvers" on public.attendance for select to authenticated
  using (profile_id = auth.uid() or public.has_role('admin','bd','teamlead','teamlead2'));

-- Private storage buckets (only runs on Supabase, where the storage schema exists).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('staff', 'staff', false, 5242880),
           ('circulars', 'circulars', false, 10485760),
           ('documents', 'documents', false, 26214400)
    on conflict (id) do nothing;

    -- Files are only ever read through short-lived signed URLs created on the server,
    -- so no browser-facing storage policies are added: everything goes through server actions.
  end if;
end $$;
