-- Faster project risks. The first version looked up each project's last time entry one project at a time, which
-- is fine for a few hundred rows of time but took about a minute with the real 77,000 entries. This version adds
-- everything up once per project and joins.
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
  with open_projects as (
    select p.id from public.projects p where p.status = 'approved' and public.can_see_project(p.id)
  ),
  team as (select t.project_id as pid, sum(t.num_hours) as hrs from public.project_team t group by 1),
  tm as (
    select e.project_id as pid, sum(e.minutes)::bigint as mins, max(e.entry_date) as last_day
      from public.time_entries e where e.project_id is not null group by 1),
  ms as (
    select m.project_id as pid,
           coalesce(sum(m.percentage) filter (where m.complete), 0) as done_pct,
           count(*) filter (where not m.complete) as open_n,
           count(*) filter (where not m.complete and m.end_date < v_today) as late_n
      from public.project_milestones m group by 1),
  tk as (
    select k.project_id as pid,
           count(*) filter (where k.status = 'created') as open_n,
           count(*) filter (where k.status = 'created' and k.ends_on < v_today) as late_n
      from public.tasks k where k.project_id is not null group by 1),
  late_by_person as (
    select k.project_id as pid, pr.name, count(*) as n,
           row_number() over (partition by k.project_id order by count(*) desc, pr.name) as rk
      from public.tasks k
      join public.task_participants tp on tp.task_id = k.id and tp.is_responsible
      join public.profiles pr on pr.id = tp.profile_id
     where k.project_id is not null and k.status = 'created' and k.ends_on < v_today
     group by k.project_id, pr.name)
  select p.id, p.name, c.firm_name, p.end_date, p.status,
         coalesce(team.hrs, 0), coalesce(tm.mins, 0), coalesce(ms.done_pct, 0)::numeric,
         coalesce(ms.open_n, 0)::int, coalesce(ms.late_n, 0)::int, coalesce(tk.open_n, 0)::int, coalesce(tk.late_n, 0)::int,
         tm.last_day, lp.name, coalesce(lp.n, 0)::int
    from open_projects o
    join public.projects p on p.id = o.id
    left join public.clients c on c.id = p.client_id
    left join team on team.pid = p.id
    left join tm on tm.pid = p.id
    left join ms on ms.pid = p.id
    left join tk on tk.pid = p.id
    left join late_by_person lp on lp.pid = p.id and lp.rk = 1
   order by p.name;
end $$;
grant execute on function public.report_project_risks() to authenticated;
