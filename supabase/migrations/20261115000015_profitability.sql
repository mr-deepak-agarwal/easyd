-- Stage 2: project profitability. Admin and teamlead2 only (the roles that manage costing and invoices).
--
-- Revenue  = Taxable and Export invoices (Proforma never counts), not deleted, in INR, before GST:
--            lines (rupee value) - advance already billed + out-of-pocket expenses.
-- Collected = the same, for invoices whose payment has been confirmed.
-- Cost     = time x the person's current grade rate + approved reimbursements (+ overheads, shown separately).
-- Overheads = hours logged x the current overhead rate (an assumption; shown on its own line).
-- Rates are today's rates, not the rate at the time of work (the grade table keeps no per-period history of use).
create or replace function public.report_profitability(p_project bigint default null, p_from date default null, p_to date default null)
returns table (
  project_id bigint, project_name text, client_name text, status text,
  quoted numeric, invoiced numeric, collected numeric,
  minutes bigint, unrated_minutes bigint, labour_cost numeric, reimbursements numeric,
  overhead_rate numeric, planned_hours numeric, planned_cost numeric
) language plpgsql security definer stable set search_path = '' as $$
declare v_oh numeric;
begin
  if not public.has_role('admin','teamlead2') then raise exception 'Not allowed'; end if;
  select coalesce((select cost from public.overheads order by id desc limit 1), 0) into v_oh;
  return query
  with rate as (
    select d.profile_id, coalesce((select g.cost from public.costing_grades g where g.grade = d.grade order by g.id desc limit 1), 0) as r,
           exists (select 1 from public.costing_grades g where g.grade = d.grade) as rated
      from public.employee_details d
  ), inv as (
    select i.project_id as pid,
      sum(coalesce((select sum(coalesce(l.rupee_value, l.taxable_value)) from public.invoice_lines l where l.invoice_id = i.id), 0)
          - case when i.invoice_type = 'Export' then 0 else coalesce(i.advance, 0) end + coalesce(i.ope, 0)) as billed,
      sum(case when i.confirmed then
          coalesce((select sum(coalesce(l.rupee_value, l.taxable_value)) from public.invoice_lines l where l.invoice_id = i.id), 0)
          - case when i.invoice_type = 'Export' then 0 else coalesce(i.advance, 0) end + coalesce(i.ope, 0) else 0 end) as got
      from public.invoices i
     where i.deleted_at is null and i.invoice_type <> 'Proforma' and i.project_id is not null
       and (p_from is null or i.invoice_date >= p_from) and (p_to is null or i.invoice_date <= p_to)
     group by i.project_id
  ), tm as (
    select e.project_id as pid, sum(e.minutes) as mins,
           sum(case when coalesce(r.rated, false) then 0 else e.minutes end) as unrated,
           sum(e.minutes / 60.0 * coalesce(r.r, 0)) as cost
      from public.time_entries e left join rate r on r.profile_id = e.profile_id
     where e.project_id is not null
       and (p_from is null or e.entry_date >= p_from) and (p_to is null or e.entry_date <= p_to)
     group by e.project_id
  ), rb as (
    select x.project_id as pid, sum(x.amount) as amt from public.reimbursements x
     where x.status = 'approved' and x.project_id is not null
       and (p_from is null or coalesce(x.period_to, x.added_at::date) >= p_from) and (p_to is null or coalesce(x.period_to, x.added_at::date) <= p_to)
     group by x.project_id
  ), q as (
    select c.project_id as pid, sum(coalesce(c.renegotiated_cost, c.total_cost)) as quoted
      from public.project_costing c where c.active and c.approved_at is not null and c.project_id is not null group by c.project_id
  ), pl as (
    select t.project_id as pid, sum(coalesce(t.num_hours, 0)) as hrs,
           sum(coalesce(t.num_hours, 0) * coalesce(r.r, 0)) as cost
      from public.project_team t left join rate r on r.profile_id = t.member_id group by t.project_id
  )
  select p.id, p.name, c.firm_name, p.status,
         round(coalesce(q.quoted, 0), 2), round(coalesce(inv.billed, 0), 2), round(coalesce(inv.got, 0), 2),
         coalesce(tm.mins, 0)::bigint, coalesce(tm.unrated, 0)::bigint, round(coalesce(tm.cost, 0), 2), round(coalesce(rb.amt, 0), 2),
         v_oh, coalesce(pl.hrs, 0), round(coalesce(pl.cost, 0), 2)
    from public.projects p
    left join public.clients c on c.id = p.client_id
    left join inv on inv.pid = p.id left join tm on tm.pid = p.id left join rb on rb.pid = p.id
    left join q on q.pid = p.id left join pl on pl.pid = p.id
   where (p_project is null or p.id = p_project) and p.status in ('approved','closed')
   order by p.name;
end $$;
grant execute on function public.report_profitability(bigint, date, date) to authenticated;
