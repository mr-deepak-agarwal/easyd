-- Phase 5: tasks and calendar.

-- General tasks are visible only to their creator, the people on them and admin (as in the old system).
-- Project tasks are visible to everyone who can see the project.
create or replace function public.can_see_task(tid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or exists (select 1 from public.tasks t where t.id = tid and (
            t.created_by = auth.uid()
         or (t.project_id is not null and public.can_see_project(t.project_id))))
      or exists (select 1 from public.task_participants tp where tp.task_id = tid and tp.profile_id = auth.uid())
$$;

-- Who may change a task: its creator, a responsible person, admin, or whoever runs the project.
create or replace function public.can_edit_task(tid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or exists (select 1 from public.tasks t where t.id = tid and (
            t.created_by = auth.uid()
         or (t.project_id is not null and public.can_manage_project(t.project_id))))
      or exists (select 1 from public.task_participants tp where tp.task_id = tid and tp.profile_id = auth.uid() and tp.is_responsible)
$$;

drop policy "tasks update" on public.tasks;
create policy "tasks update" on public.tasks for update to authenticated
  using (public.can_edit_task(id)) with check (public.can_edit_task(id));
drop policy "task_participants manage" on public.task_participants;
create policy "task_participants manage" on public.task_participants for all to authenticated
  using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id));
-- A creator must be able to add the first participants to a task they have just made.
-- (can_edit_task already covers the creator.)

-- Team calendar: everyone sees who is away and whose birthday it is, but not reasons or dates of birth.
create or replace function public.calendar_leaves(p_from date, p_to date)
returns table (name text, leave_type text, leave_from date, leave_to date)
language sql stable security definer set search_path = '' as $$
  select p.name, l.leave_type, l.leave_from, l.leave_to
    from public.leave_applications l join public.profiles p on p.id = l.profile_id
   where auth.uid() is not null and l.status = 'approved' and p.active and l.leave_to >= p_from and l.leave_from <= p_to
$$;

create or replace function public.calendar_birthdays()
returns table (name text, month integer, day integer)
language sql stable security definer set search_path = '' as $$
  select p.name, extract(month from d.dob)::int, extract(day from d.dob)::int
    from public.employee_details d join public.profiles p on p.id = d.profile_id
   where auth.uid() is not null and p.active and d.dob is not null
$$;

revoke all on function public.can_edit_task(bigint), public.calendar_leaves(date, date), public.calendar_birthdays() from public, anon;
grant execute on function public.can_edit_task(bigint), public.calendar_leaves(date, date), public.calendar_birthdays() to authenticated;

-- A task's creator must be able to read it straight back on insert ("insert ... returning").
-- The helper function cannot see a row created in the same statement, so test the column directly first.
drop policy "tasks visible" on public.tasks;
create policy "tasks visible" on public.tasks for select to authenticated
  using (created_by = auth.uid() or public.can_see_task(id));
