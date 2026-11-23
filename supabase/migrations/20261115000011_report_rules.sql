-- Phase 7b: report functions. Time entries are private to each person (and admin / teamlead / teamlead2),
-- so the efficiency reports go through these functions instead of opening the raw rows to every manager.

-- Estimated vs actual hours and cost for each member of a project.
create or replace function public.report_project_efficiency(p_project bigint)
returns table (profile_id uuid, name text, grade text, est_hours numeric, actual_minutes bigint, rate numeric)
language plpgsql security definer stable set search_path = '' as $$
begin
  if not (public.is_mgmt() and public.can_see_project(p_project)) then raise exception 'Not allowed'; end if;
  return query
    select t.member_id, coalesce(pr.name, t.member_name), d.grade, coalesce(t.num_hours, 0),
           coalesce((select sum(e.minutes) from public.time_entries e where e.project_id = p_project and e.profile_id = t.member_id), 0)::bigint,
           coalesce((select g.cost from public.costing_grades g where g.grade = d.grade order by g.id desc limit 1), 0)
      from public.project_team t
      left join public.profiles pr on pr.id = t.member_id
      left join public.employee_details d on d.profile_id = t.member_id
     where t.project_id = p_project
     order by 2;
end $$;

-- One person's estimated vs actual hours per project, plus time that is not chargeable, in a date range.
create or replace function public.report_employee_efficiency(p_profile uuid, p_from date, p_to date)
returns table (project_id bigint, project_name text, client_name text, est_hours numeric, actual_minutes bigint)
language plpgsql security definer stable set search_path = '' as $$
begin
  if not (p_profile = auth.uid() or public.has_role('admin','teamlead','teamlead2')) then raise exception 'Not allowed'; end if;
  return query
    select x.pid, p.name, c.firm_name, coalesce(max(t.num_hours), 0), sum(x.minutes)::bigint
      from (select e.project_id as pid, e.minutes from public.time_entries e
             where e.profile_id = p_profile and e.entry_date between p_from and p_to and e.project_id is not null) x
      join public.projects p on p.id = x.pid
      left join public.clients c on c.id = p.client_id
      left join public.project_team t on t.project_id = x.pid and t.member_id = p_profile
     group by x.pid, p.name, c.firm_name
     order by 2;
end $$;

create or replace function public.report_employee_nonchargeable(p_profile uuid, p_from date, p_to date)
returns table (category text, minutes bigint)
language plpgsql security definer stable set search_path = '' as $$
begin
  if not (p_profile = auth.uid() or public.has_role('admin','teamlead','teamlead2')) then raise exception 'Not allowed'; end if;
  return query
    select coalesce(nullif(e.non_chargeable_category, ''), 'Other'), sum(e.minutes)::bigint
      from public.time_entries e
     where e.profile_id = p_profile and e.entry_date between p_from and p_to and e.project_id is null
     group by 1 order by 2 desc;
end $$;

grant execute on function public.report_project_efficiency(bigint), public.report_employee_efficiency(uuid,date,date),
  public.report_employee_nonchargeable(uuid,date,date) to authenticated;
