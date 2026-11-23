-- Project risk inputs: one row per open project the caller can see. The warnings themselves are worked out
-- by fixed rules in the app (src/lib/risk.ts); AI only turns them into a readable summary.
-- Security definer so managers get totals without opening every raw time entry.
create or replace function public.report_project_risks()
returns table (
  project_id bigint, project_name text, client_name text, end_date date, status text,
  planned_hours numeric, logged_minutes bigint, progress_pct numeric,
  milestones_open integer, milestones_overdue integer, tasks_open integer, tasks_overdue integer,
  last_time_entry date, top_overdue_person text, top_overdue_count integer
) language plpgsql security definer stable set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_mgmt() then raise exception 'Not allowed'; end if;
  return query
  select p.id, p.name, c.firm_name, p.end_date, p.status,
    coalesce((select sum(t.num_hours) from public.project_team t where t.project_id = p.id), 0),
    coalesce((select sum(e.minutes) from public.time_entries e where e.project_id = p.id), 0)::bigint,
    coalesce((select sum(m.percentage) from public.project_milestones m where m.project_id = p.id and m.complete), 0)::numeric,
    (select count(*) from public.project_milestones m where m.project_id = p.id and not m.complete)::int,
    (select count(*) from public.project_milestones m where m.project_id = p.id and not m.complete and m.end_date < v_today)::int,
    (select count(*) from public.tasks k where k.project_id = p.id and k.status = 'created')::int,
    (select count(*) from public.tasks k where k.project_id = p.id and k.status = 'created' and k.ends_on < v_today)::int,
    (select max(e.entry_date) from public.time_entries e where e.project_id = p.id),
    top.name, coalesce(top.n, 0)::int
  from public.projects p
  left join public.clients c on c.id = p.client_id
  left join lateral (
    select pr.name, count(*) as n
      from public.tasks k join public.task_participants tp on tp.task_id = k.id and tp.is_responsible
      join public.profiles pr on pr.id = tp.profile_id
     where k.project_id = p.id and k.status = 'created' and k.ends_on < v_today
     group by pr.name order by count(*) desc, pr.name limit 1) top on true
  where p.status = 'approved' and public.can_see_project(p.id)
  order by p.name;
end $$;
grant execute on function public.report_project_risks() to authenticated;
