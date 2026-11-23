-- Suggested monthly pay with a proper day rate (client decision):
--   day rate = salary / 26
--   absent days = Mon-Sat working days, minus holidays and approved full-day CL/PL/Comp Off/Optional Holiday,
--                 minus days present (attendance other than 'A', or approved OD / Work From Home)
--   suggested = salary - day rate x absent days, never below zero.
-- Like the legacy screen it gives nothing for a person who logged no time that month.
create or replace function public.suggested_salary(p_profile uuid, p_year integer, p_month integer)
returns numeric language plpgsql security definer stable set search_path = '' as $$
declare v_from date := make_date(p_year, p_month, 1); v_to date := (make_date(p_year, p_month, 1) + interval '1 month')::date;
  v_salary numeric; v_absent integer;
begin
  if not public.is_admin() then raise exception 'Only an admin can use payroll'; end if;
  select d.salary into v_salary from public.employee_details d where d.profile_id = p_profile;
  if v_salary is null then return null; end if;
  if not exists (select 1 from public.time_entries where profile_id = p_profile and entry_date >= v_from and entry_date < v_to) then return null; end if;
  select count(*) into v_absent from (
    select d::date as d from generate_series(v_from, v_to - 1, interval '1 day') d
     where extract(dow from d) <> 0
       and not exists (select 1 from public.holidays h where h.holiday_date = d::date)
       and not exists (select 1 from public.leave_applications l where l.profile_id = p_profile and l.status = 'approved'
             and d::date between l.leave_from and l.leave_to
             and l.leave_type in ('CL Full Day','PL Full Day','Compensatory Off','Optional Holiday'))
  ) w
  where not exists (select 1 from public.attendance a where a.profile_id = p_profile and a.work_date = w.d and coalesce(a.status,'') <> 'A')
    and not exists (select 1 from public.leave_applications l where l.profile_id = p_profile and l.status = 'approved'
             and w.d between l.leave_from and l.leave_to and l.leave_type in ('OD Full Day','OD Half Day','Work From Home'));
  return greatest(0, round(v_salary - (v_salary / 26) * v_absent));
end $$;
