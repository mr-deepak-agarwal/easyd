insert into public.departments (id, name, active, has_sub) overriding system value values
  (1,'Market Research',true,false),(2,'Financial Analytics',true,false),(3,'Accounts & Audit',true,true),
  (4,'HR',true,false),(5,'Legal',true,false),(6,'IPO Advisory Service',true,false)
on conflict (id) do nothing;
insert into public.sub_departments (id, department_id, name) overriding system value values
  (1,3,'All'),(2,3,'GST'),(3,3,'TDS')
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.departments','id'), 6);
select setval(pg_get_serial_sequence('public.sub_departments','id'), 3);
