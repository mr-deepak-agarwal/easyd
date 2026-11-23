-- Phase 7a: time tracker approvals and payroll.
-- Legacy rules kept: everyone logs their own time; admin, teamlead and teamlead2 can view everyone's;
-- an edit is not applied directly, it is submitted for admin approval (time_tracker_temp).

alter table public.time_entry_edits add column if not exists project_id bigint references public.projects(id);
create unique index if not exists time_entry_edits_one_pending on public.time_entry_edits (time_entry_id);

drop policy if exists "time own or mgmt" on public.time_entries;
drop policy if exists "time add own" on public.time_entries;
drop policy if exists "time edit" on public.time_entries;
drop policy if exists "time delete" on public.time_entries;
create policy "time read" on public.time_entries for select to authenticated
  using (profile_id = auth.uid() or public.has_role('admin','teamlead','teamlead2'));
create policy "time add own" on public.time_entries for insert to authenticated
  with check (profile_id = auth.uid() and minutes between 1 and 1440);
create policy "time admin edit" on public.time_entries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "time delete" on public.time_entries for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "time edits own or mgmt" on public.time_entry_edits;
drop policy if exists "time edits add own" on public.time_entry_edits;
drop policy if exists "time edits mgmt" on public.time_entry_edits;
create policy "time edits read" on public.time_entry_edits for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
-- Requests are made only through request_time_edit(); approvals through the functions below.

create or replace function public.request_time_edit(p_entry_id bigint, p_date date, p_project_id bigint,
  p_category text, p_work text, p_minutes integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare e public.time_entries; v_id bigint;
begin
  select * into e from public.time_entries where id = p_entry_id;
  if not found or e.profile_id <> auth.uid() then raise exception 'Entry not found'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 1440 then raise exception 'Enter between 1 minute and 24 hours'; end if;
  if p_project_id is null and coalesce(p_category,'') = '' then raise exception 'Choose a project or a non-chargeable category'; end if;
  if p_project_id is not null and not exists (select 1 from public.projects where id = p_project_id) then raise exception 'Project not found'; end if;
  insert into public.time_entry_edits (time_entry_id, profile_id, entry_date, project_id, work_accomplished, minutes, non_chargeable_category, remarks, submitted_at)
  values (p_entry_id, auth.uid(), p_date, p_project_id, p_work, p_minutes, nullif(p_category,''), '-', now())
  on conflict (time_entry_id) do update set entry_date = excluded.entry_date, project_id = excluded.project_id,
    work_accomplished = excluded.work_accomplished, minutes = excluded.minutes,
    non_chargeable_category = excluded.non_chargeable_category, submitted_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public._apply_time_edit(p_edit bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare x public.time_entry_edits;
begin
  select * into x from public.time_entry_edits where id = p_edit for update;
  if not found then return; end if;
  update public.time_entries set entry_date = coalesce(x.entry_date, entry_date), project_id = x.project_id,
      project_ref = null, client_name = null, work_accomplished = x.work_accomplished,
      minutes = coalesce(x.minutes, minutes), non_chargeable_category = coalesce(x.non_chargeable_category, '')
   where id = x.time_entry_id;
  delete from public.time_entry_edits where id = p_edit;
end $$;
revoke all on function public._apply_time_edit(bigint) from public, anon, authenticated;

create or replace function public.approve_time_edit(p_edit_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can approve edits'; end if;
  if not exists (select 1 from public.time_entry_edits where id = p_edit_id) then raise exception 'Edit not found'; end if;
  perform public._apply_time_edit(p_edit_id);
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'time.edit.approve', 'time_entries', p_edit_id::text);
end $$;

create or replace function public.approve_all_time_edits()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  if not public.is_admin() then raise exception 'Only an admin can approve edits'; end if;
  for r in select id from public.time_entry_edits order by id loop perform public._apply_time_edit(r.id); n := n + 1; end loop;
  insert into public.audit_log (actor_id, action, entity, details) values (auth.uid(), 'time.edit.approve_all', 'time_entries', jsonb_build_object('count', n));
  return n;
end $$;

-- Reject (new): drop the request, the entry stays as it was. The owner may also withdraw their own.
create or replace function public.reject_time_edit(p_edit_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.time_entry_edits where id = p_edit_id and (public.is_admin() or profile_id = auth.uid());
  if not found then raise exception 'Edit not found'; end if;
end $$;

-- ---------------------------------------------------------------- payroll
-- Suggested monthly pay, as in the legacy generator: salary - salary/208 x absent days,
-- where absent days = days in month - days with an attendance row other than 'A'.
-- Like the legacy screen it gives nothing for a person who logged no time that month.
create or replace function public.suggested_salary(p_profile uuid, p_year integer, p_month integer)
returns numeric language plpgsql security definer stable set search_path = '' as $$
declare v_from date := make_date(p_year, p_month, 1); v_to date := (make_date(p_year, p_month, 1) + interval '1 month')::date;
  v_salary numeric; v_present integer; v_days integer := extract(day from (v_to - 1));
begin
  if not public.is_admin() then raise exception 'Only an admin can use payroll'; end if;
  select d.salary into v_salary from public.employee_details d where d.profile_id = p_profile;
  if v_salary is null then return null; end if;
  if not exists (select 1 from public.time_entries where profile_id = p_profile and entry_date >= v_from and entry_date < v_to) then return null; end if;
  select count(*) into v_present from public.attendance
   where profile_id = p_profile and work_date >= v_from and work_date < v_to and coalesce(status,'') <> 'A';
  return round(v_salary - (v_salary / 208) * (v_days - v_present));
end $$;

-- One salary per person per month (the legacy only blocked a second one on the same day).
create or replace function public.add_salary(p_profile uuid, p_pay_date date, p_amount numeric, p_pay_type text, p_description text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare d public.employee_details; v_id bigint;
begin
  if not public.is_admin() then raise exception 'Only an admin can use payroll'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount above zero'; end if;
  select * into d from public.employee_details where profile_id = p_profile;
  if not found then raise exception 'No employee details for this person'; end if;
  if coalesce(p_pay_type,'Salary') = 'Salary' and exists (
      select 1 from public.salary_entries where profile_id = p_profile and pay_type = 'Salary'
        and date_trunc('month', pay_date) = date_trunc('month', p_pay_date)) then
    raise exception 'A salary is already recorded for that month'; end if;
  insert into public.salary_entries (profile_id, pay_type, pay_date, designation, bank_branch, amount, description, entered_on, entered_by)
  values (p_profile, coalesce(p_pay_type,'Salary'), p_pay_date, d.category, d.bank, p_amount, nullif(p_description,''), (now() at time zone 'Asia/Kolkata')::date, auth.uid())
  returning id into v_id;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'payroll.add', 'salary_entries', v_id::text);
  return v_id;
end $$;

grant execute on function public.request_time_edit(bigint,date,bigint,text,text,integer), public.approve_time_edit(bigint),
  public.approve_all_time_edits(), public.reject_time_edit(bigint), public.suggested_salary(uuid,integer,integer),
  public.add_salary(uuid,date,numeric,text,text) to authenticated;
