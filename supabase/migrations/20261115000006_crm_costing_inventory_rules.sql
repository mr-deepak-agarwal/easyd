-- Phase 3: CRM, costing and inventory rules.

-- Only admin and teamlead2 may edit costing (the old rule let bd add rows too).
drop policy "costing write" on public.project_costing;
create policy "costing write" on public.project_costing for all to authenticated
  using (public.has_role('admin','teamlead2')) with check (public.has_role('admin','teamlead2'));

-- Approve a lead: creates the project and moves the lead's costing, follow-ups and documents onto it,
-- all in one transaction. Admin and bd only (same as the old system).
create or replace function public.approve_lead(p_lead_id bigint, p_name text, p_department_id bigint, p_project_type text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare l public.leads; pid bigint;
begin
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

create or replace function public.reject_lead(p_lead_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin','bd') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Enter a reason'; end if;
  update public.leads set status = 'rejected', reject_reason = trim(p_reason), rejected_by = auth.uid(), rejected_at = now()
   where id = p_lead_id and status = 'pending';
  if not found then raise exception 'This lead has already been decided'; end if;
end $$;

-- Stock: add (or top up) an item, and consume. Admin and teamlead2 only.
create or replace function public.add_stock(p_item text, p_category text, p_description text, p_qty integer,
                                            p_price numeric, p_purchase_date date, p_buffer integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare sid bigint;
begin
  if not public.has_role('admin','teamlead2') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be more than zero'; end if;
  select id into sid from public.stock_items
   where lower(item) = lower(trim(p_item)) and lower(coalesce(category,'')) = lower(coalesce(trim(p_category),'')) for update;
  if found then
    update public.stock_items set quantity = quantity + p_qty, price = coalesce(p_price, price),
           purchase_date = coalesce(p_purchase_date, purchase_date), buffer = coalesce(p_buffer, buffer) where id = sid;
  else
    insert into public.stock_items (item, description, category, quantity, price, purchase_date, buffer, added_by, added_at)
    values (trim(p_item), p_description, nullif(trim(p_category),''), p_qty, p_price, p_purchase_date, coalesce(p_buffer,0), auth.uid(), now())
    returning id into sid;
  end if;
  -- restocked above the buffer: it no longer needs buying
  delete from public.purchase_requests pr using public.stock_items s
   where s.id = sid and lower(pr.item) = lower(s.item) and lower(coalesce(pr.category,'')) = lower(coalesce(s.category,''))
     and s.quantity > s.buffer;
  return sid;
end $$;

create or replace function public.consume_stock(p_item_id bigint, p_qty integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare s public.stock_items; remaining integer;
begin
  if not public.has_role('admin','teamlead2') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be more than zero'; end if;
  select * into s from public.stock_items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;
  if s.quantity < p_qty then raise exception 'Only % in stock', s.quantity; end if;
  remaining := s.quantity - p_qty;
  update public.stock_items set quantity = remaining where id = p_item_id;
  insert into public.stock_consumption (item, category, quantity, buffer, consumed_at) values (s.item, s.category, p_qty, s.buffer, now());
  if remaining <= s.buffer and not exists (
       select 1 from public.purchase_requests where lower(item) = lower(s.item) and lower(coalesce(category,'')) = lower(coalesce(s.category,''))) then
    insert into public.purchase_requests (item, category, current_stock, created_at) values (s.item, s.category, remaining, now());
  end if;
  return remaining;
end $$;

revoke all on function public.approve_lead(bigint, text, bigint, text), public.reject_lead(bigint, text),
  public.add_stock(text, text, text, integer, numeric, date, integer), public.consume_stock(bigint, integer) from public, anon;
grant execute on function public.approve_lead(bigint, text, bigint, text), public.reject_lead(bigint, text),
  public.add_stock(text, text, text, integer, numeric, date, integer), public.consume_stock(bigint, integer) to authenticated;
