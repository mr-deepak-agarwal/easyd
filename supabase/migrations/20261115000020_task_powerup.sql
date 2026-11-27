-- Task power-up: workflow stages, dependencies, repeating tasks and saved views.
--
-- "status" stays created/completed, so scoring, risk, reminders and reports are untouched.
-- While a task is open it also has a workflow "stage": To do, In progress or In review.

alter table public.tasks
  add column stage          text not null default 'todo' check (stage in ('todo','in_progress','review')),
  add column started_at     timestamptz,
  add column repeat_rule    text check (repeat_rule in ('daily','weekly','monthly')),
  add column repeat_until   date,
  add column recurs_from_id bigint references public.tasks(id) on delete set null;
create unique index tasks_recurs_once on public.tasks (recurs_from_id) where recurs_from_id is not null;
create index tasks_stage on public.tasks (stage) where status = 'created';

-- First time a task goes In progress, remember when. Reopening a task puts it back to To do.
create or replace function public._trg_task_stage() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'created' and old.status = 'completed' and new.stage = old.stage then new.stage := 'todo'; end if;
  if new.status = 'created' and new.stage in ('in_progress','review') and new.started_at is null then new.started_at := now(); end if;
  return new;
end $$;
create trigger task_stage before update on public.tasks for each row execute function public._trg_task_stage();

-- ------------------------------------------------------------------ dependencies
create table public.task_dependencies (
  task_id       bigint not null references public.tasks(id) on delete cascade,
  depends_on_id bigint not null references public.tasks(id) on delete cascade,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  primary key (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);
create index on public.task_dependencies (depends_on_id);
alter table public.task_dependencies enable row level security;
grant select on public.task_dependencies to authenticated;
create policy "dependencies visible" on public.task_dependencies for select to authenticated
  using (public.can_see_task(task_id) or public.can_see_task(depends_on_id));

-- Adds "p_task waits for p_blocker". Refuses loops (A waits for B waits for A).
create or replace function public.add_task_dependency(p_task bigint, p_blocker bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_task = p_blocker then raise exception 'A task cannot wait for itself'; end if;
  if not public.can_edit_task(p_task) then raise exception 'You are not allowed to change this task'; end if;
  if not public.can_see_task(p_blocker) then raise exception 'That task does not exist'; end if;
  if exists (
    with recursive up(id) as (
      select p_blocker
      union
      select d.depends_on_id from public.task_dependencies d join up on d.task_id = up.id
    ) select 1 from up where id = p_task
  ) then raise exception 'That would make the tasks wait for each other'; end if;
  insert into public.task_dependencies (task_id, depends_on_id, created_by) values (p_task, p_blocker, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.remove_task_dependency(p_task bigint, p_blocker bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.can_edit_task(p_task) then raise exception 'You are not allowed to change this task'; end if;
  delete from public.task_dependencies where task_id = p_task and depends_on_id = p_blocker;
end $$;
revoke all on function public.add_task_dependency(bigint, bigint), public.remove_task_dependency(bigint, bigint) from public, anon;
grant execute on function public.add_task_dependency(bigint, bigint), public.remove_task_dependency(bigint, bigint) to authenticated;

-- A task cannot be completed while something it waits for is still open. Runs for every path (board, form, import by API).
create or replace function public._trg_task_blocked() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_names text;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select string_agg('"' || b.title || '"', ', ' order by b.id) into v_names
      from public.task_dependencies d join public.tasks b on b.id = d.depends_on_id
     where d.task_id = new.id and b.status <> 'completed';
    if v_names is not null then raise exception 'Finish % first', left(v_names, 160); end if;
  end if;
  return new;
end $$;
create trigger task_blocked before update of status on public.tasks for each row execute function public._trg_task_blocked();

-- ------------------------------------------------------------------ repeating tasks
-- When a repeating task is completed, the next one is created (once), due after today.
create or replace function public._trg_task_repeat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_step interval; v_base date; v_next date; v_n int := 1; v_id bigint; v_shift int;
begin
  if not (new.status = 'completed' and old.status <> 'completed' and new.repeat_rule is not null) then return new; end if;
  v_step := case new.repeat_rule when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;
  v_base := coalesce(new.ends_on, (now() at time zone 'Asia/Kolkata')::date);
  v_next := (v_base + v_n * v_step)::date;
  while v_next < (now() at time zone 'Asia/Kolkata')::date and v_n < 400 loop
    v_n := v_n + 1; v_next := (v_base + v_n * v_step)::date;
  end loop;
  if new.repeat_until is not null and v_next > new.repeat_until then return new; end if;
  v_shift := v_next - v_base;
  insert into public.tasks (project_id, title, description, starts_on, ends_on, status, stage, created_by, created_at, repeat_rule, repeat_until, recurs_from_id)
  values (new.project_id, new.title, new.description, case when new.starts_on is null then null else new.starts_on + v_shift end, v_next, 'created', 'todo', new.created_by, now(), new.repeat_rule, new.repeat_until, new.id)
  on conflict (recurs_from_id) where recurs_from_id is not null do nothing
  returning id into v_id;
  if v_id is not null then
    insert into public.task_participants (task_id, profile_id, is_responsible)
    select v_id, profile_id, is_responsible from public.task_participants where task_id = new.id;
  end if;
  return new;
end $$;
create trigger task_repeat after update of status on public.tasks for each row execute function public._trg_task_repeat();

-- A repeated copy is not "a new task someone gave you"; people already own it.
create or replace function public._trg_task_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select id, title, recurs_from_id into t from public.tasks where id = new.task_id;
  if t.recurs_from_id is not null then return new; end if;
  perform public._notify(new.profile_id, 'task_assigned',
    case when new.is_responsible then public._person_name(auth.uid()) || ' gave you a task' else public._person_name(auth.uid()) || ' added you to a task' end,
    t.title, '/tasks/' || t.id, auth.uid());
  return new;
end $$;

-- Tell the people waiting when the last blocker is done.
create or replace function public._trg_task_unblocked() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not (new.status = 'completed' and old.status <> 'completed') then return new; end if;
  for r in
    select d.task_id, t.title, tp.profile_id
      from public.task_dependencies d
      join public.tasks t on t.id = d.task_id and t.status = 'created'
      join public.task_participants tp on tp.task_id = t.id and tp.is_responsible
     where d.depends_on_id = new.id
       and not exists (select 1 from public.task_dependencies d2 join public.tasks b on b.id = d2.depends_on_id
                        where d2.task_id = d.task_id and b.status <> 'completed')
  loop
    perform public._notify(r.profile_id, 'task_unblocked', 'Ready to start: "' || new.title || '" is done', r.title, '/tasks/' || r.task_id, auth.uid(), 'unblocked:' || r.task_id || ':' || new.id);
  end loop;
  return new;
end $$;
create trigger task_unblocked after update of status on public.tasks for each row execute function public._trg_task_unblocked();

-- ------------------------------------------------------------------ saved views (per person)
create table public.saved_views (
  id          bigint generated by default as identity primary key,
  profile_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  scope       text not null default 'tasks' check (scope in ('tasks')),
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  query       text not null check (char_length(query) <= 500),
  created_at  timestamptz not null default now(),
  unique (profile_id, scope, name)
);
alter table public.saved_views enable row level security;
grant select, insert, delete on public.saved_views to authenticated;
create policy "own views read" on public.saved_views for select to authenticated using (profile_id = auth.uid());
create policy "own views add" on public.saved_views for insert to authenticated with check (profile_id = auth.uid());
create policy "own views delete" on public.saved_views for delete to authenticated using (profile_id = auth.uid());
