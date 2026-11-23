-- Easy D: Row Level Security.
-- Every table is locked down by default; the policies below open exactly what each role needs.
-- These defaults mirror the old menu rules (sidebar.php). The old code only HID links and
-- never enforced them on the server, so this is stricter than before. Confirm during UAT.

-- ---------------------------------------------------------------- helpers
create or replace function public.can_see_project(pid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_mgmt()
      or exists (select 1 from public.project_team t where t.project_id = pid and t.member_id = auth.uid())
      or exists (select 1 from public.projects p where p.id = pid and p.leader_id = auth.uid())
$$;

create or replace function public.can_see_task(tid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_mgmt()
      or exists (select 1 from public.tasks t where t.id = tid and (
            t.created_by = auth.uid()
         or (t.project_id is not null and public.can_see_project(t.project_id))))
      or exists (select 1 from public.task_participants tp where tp.task_id = tid and tp.profile_id = auth.uid())
$$;

create or replace function public.has_role(variadic roles public.user_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() = any(roles), false)
$$;

-- ----------------------------------------------- enable RLS on every table
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ------------------------------------------------ reference data: read all, admin writes
do $$
declare t text;
begin
  foreach t in array array['departments','sub_departments','holidays','circulars','sac_codes','reimbursement_rates'] loop
    execute format('create policy "%1$s read" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ people
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles admin write" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "employee_details own or admin" on public.employee_details for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "employee_details admin write" on public.employee_details for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "salary own or admin" on public.salary_entries for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "salary admin write" on public.salary_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "incentives own or admin" on public.incentives for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "incentives admin write" on public.incentives for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "leave_quota own or mgmt" on public.leave_quota for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "leave_quota admin write" on public.leave_quota for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "leave read own or mgmt" on public.leave_applications for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "leave apply" on public.leave_applications for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
create policy "leave own pending edit" on public.leave_applications for update to authenticated
  using (profile_id = auth.uid() and status = 'pending') with check (profile_id = auth.uid() and status = 'pending');
create policy "leave mgmt decide" on public.leave_applications for update to authenticated
  using (public.is_mgmt()) with check (public.is_mgmt());
create policy "leave admin delete" on public.leave_applications for delete to authenticated using (public.is_admin());

create policy "attendance own or mgmt" on public.attendance for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "attendance admin write" on public.attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "appraisals own or admin" on public.appraisals for select to authenticated
  using (profile_id = auth.uid() or submitted_by = auth.uid() or public.is_admin());
create policy "appraisals give" on public.appraisals for insert to authenticated
  with check (submitted_by = auth.uid());
create policy "appraisals admin write" on public.appraisals for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "suggestions own or admin" on public.suggestions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "suggestions send" on public.suggestions for insert to authenticated
  with check (profile_id = auth.uid());
create policy "suggestions admin reply" on public.suggestions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------- CRM
do $$
declare t text;
begin
  foreach t in array array['clients','client_contacts','leads','followups','pre_projects'] loop
    execute format('create policy "%1$s mgmt read" on public.%1$I for select to authenticated using (public.is_mgmt())', t);
    execute format('create policy "%1$s mgmt write" on public.%1$I for insert to authenticated with check (public.is_mgmt())', t);
    execute format('create policy "%1$s mgmt update" on public.%1$I for update to authenticated using (public.is_mgmt()) with check (public.is_mgmt())', t);
    execute format('create policy "%1$s admin delete" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- ------------------------------------------------------------------- costing
do $$
declare t text;
begin
  foreach t in array array['costing_grades','overheads'] loop
    execute format('create policy "%1$s mgmt read" on public.%1$I for select to authenticated using (public.is_mgmt())', t);
    execute format('create policy "%1$s write" on public.%1$I for all to authenticated using (public.has_role(''admin'',''teamlead2'')) with check (public.has_role(''admin'',''teamlead2''))', t);
  end loop;
end $$;
create policy "costing mgmt read" on public.project_costing for select to authenticated using (public.is_mgmt());
create policy "costing write" on public.project_costing for all to authenticated
  using (public.has_role('admin','bd','teamlead2')) with check (public.has_role('admin','bd','teamlead2'));

-- ------------------------------------------------------------------ projects
create policy "projects visible" on public.projects for select to authenticated using (public.can_see_project(id));
create policy "projects mgmt create" on public.projects for insert to authenticated with check (public.is_mgmt());
create policy "projects mgmt update" on public.projects for update to authenticated
  using (public.is_mgmt() or leader_id = auth.uid()) with check (public.is_mgmt() or leader_id = auth.uid());
create policy "projects admin delete" on public.projects for delete to authenticated using (public.is_admin());

-- Project-scoped child tables: anyone who can see the project can read and add; mgmt can change.
do $$
declare t text;
begin
  foreach t in array array['project_team','project_milestones','project_completions','project_documents',
                           'project_proposals','project_meetings','project_forum_chats'] loop
    execute format('create policy "%1$s read" on public.%1$I for select to authenticated using (project_id is not null and public.can_see_project(project_id))', t);
    execute format('create policy "%1$s add" on public.%1$I for insert to authenticated with check (project_id is not null and public.can_see_project(project_id))', t);
    execute format('create policy "%1$s mgmt update" on public.%1$I for update to authenticated using (public.is_mgmt()) with check (public.is_mgmt())', t);
    execute format('create policy "%1$s mgmt delete" on public.%1$I for delete to authenticated using (public.is_mgmt())', t);
  end loop;
end $$;

-- --------------------------------------------------------------------- invoices
-- Invoices are commercial data: admin, bd and teamlead2 only. (Confirm with the client.)
create policy "invoices read" on public.invoices for select to authenticated using (public.has_role('admin','bd','teamlead2'));
create policy "invoices write" on public.invoices for all to authenticated
  using (public.has_role('admin','teamlead2')) with check (public.has_role('admin','teamlead2'));
create policy "invoice_counters none" on public.invoice_counters for select to authenticated using (false);

-- ---------------------------------------------------------------- reimbursements
create policy "reimb own or mgmt" on public.reimbursements for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "reimb add own" on public.reimbursements for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
create policy "reimb mgmt decide" on public.reimbursements for update to authenticated
  using (public.is_mgmt()) with check (public.is_mgmt());
create policy "reimb admin delete" on public.reimbursements for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------- time tracking
create policy "time own or mgmt" on public.time_entries for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "time add own" on public.time_entries for insert to authenticated
  with check (profile_id = auth.uid());
create policy "time edit" on public.time_entries for update to authenticated
  using (profile_id = auth.uid() or public.is_mgmt()) with check (profile_id = auth.uid() or public.is_mgmt());
create policy "time delete" on public.time_entries for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy "time edits own or mgmt" on public.time_entry_edits for select to authenticated
  using (profile_id = auth.uid() or public.is_mgmt());
create policy "time edits add own" on public.time_entry_edits for insert to authenticated
  with check (profile_id = auth.uid());
create policy "time edits mgmt" on public.time_entry_edits for all to authenticated
  using (public.is_mgmt()) with check (public.is_mgmt());

-- ------------------------------------------------------------------------ tasks
create policy "tasks visible" on public.tasks for select to authenticated using (public.can_see_task(id));
create policy "tasks create" on public.tasks for insert to authenticated
  with check (created_by = auth.uid() and (project_id is null or public.can_see_project(project_id)));
create policy "tasks update" on public.tasks for update to authenticated
  using (public.can_see_task(id)) with check (public.can_see_task(id));
create policy "tasks delete" on public.tasks for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

create policy "task_participants visible" on public.task_participants for select to authenticated
  using (public.can_see_task(task_id));
create policy "task_participants manage" on public.task_participants for all to authenticated
  using (public.can_see_task(task_id)) with check (public.can_see_task(task_id));

create policy "task_comments visible" on public.task_comments for select to authenticated
  using (public.can_see_task(task_id));
create policy "task_comments add" on public.task_comments for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_task(task_id));

-- -------------------------------------------------------------------- inventory
do $$
declare t text;
begin
  foreach t in array array['stock_items','stock_consumption','purchase_requests'] loop
    execute format('create policy "%1$s mgmt read" on public.%1$I for select to authenticated using (public.is_mgmt())', t);
    execute format('create policy "%1$s write" on public.%1$I for all to authenticated using (public.has_role(''admin'',''teamlead2'')) with check (public.has_role(''admin'',''teamlead2''))', t);
  end loop;
end $$;

-- ------------------------------------------------------------------- audit log
create policy "audit admin read" on public.audit_log for select to authenticated using (public.is_admin());
create policy "audit insert own" on public.audit_log for insert to authenticated with check (actor_id = auth.uid());
