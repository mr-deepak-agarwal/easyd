-- Phase 4: project lifecycle rules.

-- Who may run a project: admin, teamlead, teamlead2, the project's leader, or a team member added as "Lead".
create or replace function public.can_manage_project(pid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin','teamlead','teamlead2')
      or exists (select 1 from public.projects p where p.id = pid and p.leader_id = auth.uid())
      or exists (select 1 from public.project_team t where t.project_id = pid and t.member_id = auth.uid() and t.member_type = 'Lead')
$$;

-- One row per person per project.
create unique index project_team_member_once on public.project_team (project_id, member_id) where member_id is not null;

-- Team, milestones, proposals and the project record itself: managers only (documents, meetings and chat stay open to the team).
do $$
declare t text;
begin
  foreach t in array array['project_team','project_milestones','project_proposals'] loop
    execute format('drop policy "%1$s add" on public.%1$I', t);
    execute format('drop policy "%1$s mgmt update" on public.%1$I', t);
    execute format('drop policy "%1$s mgmt delete" on public.%1$I', t);
    execute format('create policy "%1$s manage" on public.%1$I for all to authenticated using (project_id is not null and public.can_manage_project(project_id)) with check (project_id is not null and public.can_manage_project(project_id))', t);
  end loop;
end $$;
-- Completion log is written only by complete_milestone().
drop policy "project_completions add" on public.project_completions;
drop policy "project_completions mgmt update" on public.project_completions;
drop policy "project_completions mgmt delete" on public.project_completions;

drop policy "projects mgmt update" on public.projects;
create policy "projects manage update" on public.projects for update to authenticated
  using (public.can_manage_project(id)) with check (public.can_manage_project(id));

-- Status, approval, closure and progress can only change through the functions below.
create or replace function public.projects_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(current_setting('easyd.rpc', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.percent_complete := 0;
    new.approved_by := null; new.approved_at := null; new.closed_by := null; new.closing_reason := null; new.actual_end_at := null;
  elsif (new.status, new.percent_complete, new.approved_by, new.rejected_by, new.closed_by, new.closing_reason)
        is distinct from (old.status, old.percent_complete, old.approved_by, old.rejected_by, old.closed_by, old.closing_reason) then
    raise exception 'Status and progress can only be changed through approve, reject, complete milestone and close' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger projects_guard_ins before insert on public.projects for each row execute function public.projects_guard();
create trigger projects_guard_upd before update on public.projects for each row execute function public.projects_guard();

-- approve_lead creates an already-approved project; let it through the guard.
create or replace function public.approve_lead(p_lead_id bigint, p_name text, p_department_id bigint, p_project_type text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare l public.leads; pid bigint;
begin
  perform set_config('easyd.rpc', 'on', true);
  if not public.has_role('admin','bd') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into l from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found'; end if;
  if l.status <> 'pending' then raise exception 'This lead has already been decided'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter a project name'; end if;
  insert into public.projects (name, client_id, description, start_date, status, percent_complete, department_id, project_type,
                               approved_by, approved_at, created_by, created_at)
  values (trim(p_name), l.client_id, l.comments, (now() at time zone 'Asia/Kolkata')::date, 'approved', 0, p_department_id, p_project_type,
          auth.uid(), now(), auth.uid(), now())
  returning id into pid;
  update public.leads set status = 'approved', approved_by = auth.uid(), approved_at = now(), approved_project_id = pid where id = p_lead_id;
  update public.project_costing set project_id = pid where lead_id = p_lead_id;
  update public.followups set project_id = pid where lead_id = p_lead_id;
  update public.project_documents set project_id = pid where lead_id = p_lead_id;
  return pid;
end $$;

create or replace function public.decide_project(p_project_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('easyd.rpc', 'on', true);
  if not public.has_role('admin','teamlead2') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_approve then
    update public.projects set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_project_id and status = 'pending';
  else
    update public.projects set status = 'rejected', rejected_by = auth.uid(), rejected_at = now() where id = p_project_id and status = 'pending';
  end if;
  if not found then raise exception 'This project is not waiting for a decision'; end if;
end $$;

-- Marks a milestone done: logs it, and sets the project's progress to the sum of completed milestones (max 100).
create or replace function public.complete_milestone(p_milestone_id bigint, p_reason text)
returns numeric language plpgsql security definer set search_path = '' as $$
declare m public.project_milestones; total numeric;
begin
  perform set_config('easyd.rpc', 'on', true);
  select * into m from public.project_milestones where id = p_milestone_id for update;
  if not found then raise exception 'Milestone not found'; end if;
  if not public.can_manage_project(m.project_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if m.complete then raise exception 'This milestone is already complete'; end if;
  if (select status from public.projects where id = m.project_id) <> 'approved' then raise exception 'The project is not open'; end if;
  insert into public.project_completions (project_id, milestone_id, percent_complete, reason, entry_by, entry_at)
  values (m.project_id, m.id, m.percentage, nullif(trim(p_reason), ''), auth.uid(), now());
  update public.project_milestones set complete = true, updated_by = auth.uid(), updated_at = now() where id = m.id;
  select least(100, coalesce(sum(percent_complete), 0)) into total from public.project_completions where project_id = m.project_id;
  update public.projects set percent_complete = total where id = m.project_id;
  return total;
end $$;

create or replace function public.close_project(p_project_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.projects;
begin
  perform set_config('easyd.rpc', 'on', true);
  select * into p from public.projects where id = p_project_id for update;
  if not found then raise exception 'Project not found'; end if;
  if not public.can_manage_project(p_project_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p.status <> 'approved' then raise exception 'Only an open project can be closed'; end if;
  if not p.final_report then raise exception 'Tick "Final report submitted" before closing'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Enter a closing note'; end if;
  update public.projects set status = 'closed', closed_by = auth.uid(), closing_reason = trim(p_reason), actual_end_at = now() where id = p_project_id;
end $$;

revoke all on function public.decide_project(bigint, boolean), public.complete_milestone(bigint, text), public.close_project(bigint, text),
  public.can_manage_project(bigint) from public, anon;
grant execute on function public.decide_project(bigint, boolean), public.complete_milestone(bigint, text), public.close_project(bigint, text),
  public.can_manage_project(bigint) to authenticated;
