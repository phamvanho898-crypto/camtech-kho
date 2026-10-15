-- Run as the database administrator in a dedicated, initialized CAMTECH project.
-- All test writes are rolled back. No password or user ID belongs in this file.
begin;
do $$ begin
 if (select count(*) from public.stock_workspaces)<>1 then
  raise exception 'Tests require exactly one initialized workspace';
 end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object(
 'sub',(select owner_id::text from public.stock_workspaces limit 1),
 'role','authenticated')::text,true);
set local role authenticated;
do $$
declare
 original jsonb; snap jsonb; payload jsonb; movement jsonb; product_id text;
 receipt uuid:=gen_random_uuid(); claims text:=current_setting('request.jwt.claims');
 order_id text; order_items jsonb; order_index integer; initial_movements integer;
 tests integer:=0;
begin
 original:=public.stock_load(); snap:=original;
 if jsonb_array_length(original->'data'->'products')=0 then raise exception 'Empty test warehouse';end if;
 tests:=tests+1;
 if has_function_privilege('anon','public.stock_load()','EXECUTE')
 or has_function_privilege('anon','public.stock_save(bigint,jsonb,uuid)','EXECUTE') then
  raise exception 'Anonymous RPC execution permitted';
 end if;tests:=tests+1;
 if has_table_privilege('anon','public.stock_workspaces','SELECT')
 or has_table_privilege('authenticated','public.stock_workspaces','UPDATE')
 or has_table_privilege('authenticated','public.stock_requests','SELECT') then
  raise exception 'Unexpected direct data access';
 end if;tests:=tests+1;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('stock_load','stock_save') and p.prosecdef) then
  raise exception 'Exposed privileged routine';
 end if;tests:=tests+1;
 product_id:=original->'data'->'products'->0->>'id';
 initial_movements:=jsonb_array_length(original->'data'->'movements');
 movement:=jsonb_build_object('id',gen_random_uuid(),'type','in','date',current_date,
  'items',jsonb_build_array(jsonb_build_object('productId',product_id,'qty',1)),
  'partner','ROLLBACK TEST','createdAt',now());
 payload:=jsonb_set(original->'data','{movements}',original->'data'->'movements'||jsonb_build_array(movement));
 snap:=public.stock_save((original->>'version')::bigint,payload,receipt);
 if (snap->>'version')::bigint<>(original->>'version')::bigint+1
 or jsonb_array_length(snap->'data'->'movements')<>initial_movements+1 then
  raise exception 'Save did not persist one receipt';
 end if;tests:=tests+1;
 if public.stock_load()<>snap then raise exception 'A second load missed the save';end if;tests:=tests+1;
 if public.stock_save((original->>'version')::bigint,payload,receipt)<>snap then
  raise exception 'Retry duplicated a receipt';
 end if;tests:=tests+1;
 begin
  perform public.stock_save((original->>'version')::bigint,payload,gen_random_uuid());
  raise exception 'Stale revision accepted';
 exception when others then if sqlerrm<>'VERSION_CONFLICT' then raise;end if;end;
 tests:=tests+1;
 movement:=jsonb_build_object('id',gen_random_uuid(),'type','out','date',current_date,
  'items',jsonb_build_array(jsonb_build_object('productId',product_id,'qty',1000000000)));
 payload:=jsonb_set(snap->'data','{movements}',snap->'data'->'movements'||jsonb_build_array(movement));
 begin
  perform public.stock_save((snap->>'version')::bigint,payload,gen_random_uuid());
  raise exception 'Overselling accepted';
 exception when others then if position('không đủ hàng' in sqlerrm)=0 then raise;end if;end;
 if public.stock_load()<>snap then raise exception 'Rejected save changed data';end if;
 tests:=tests+1;
 begin
  update public.stock_workspaces set version=version+1;
  raise exception 'Direct write permitted';
 exception when insufficient_privilege then null;end;tests:=tests+1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 if exists(select 1 from public.stock_workspaces) then raise exception 'RLS exposed another owner';end if;
 perform set_config('request.jwt.claims',claims,true);tests:=tests+1;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin
  perform public.stock_load();raise exception 'Missing identity accepted';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',claims,true);tests:=tests+1;
 select (ordinality-1)::integer,value->>'id',value->'items'
 into order_index,order_id,order_items
 from jsonb_array_elements(snap->'data'->'orders') with ordinality
 where value->>'status'='draft' limit 1;
 if order_id is null then raise exception 'Tests require one fulfillable draft order';end if;
 payload:=jsonb_set(snap->'data',array['orders',order_index::text,'status'],'"reserved"'::jsonb);
 snap:=public.stock_save((snap->>'version')::bigint,payload,gen_random_uuid());
 if snap->'data'->'orders'->order_index->>'status'<>'reserved' then raise exception 'Reserve failed';end if;
 tests:=tests+1;
 payload:=jsonb_set(snap->'data',array['orders',order_index::text,'status'],'"shipped"'::jsonb);
 movement:=jsonb_build_object('id',gen_random_uuid(),'type','out','date',current_date,
  'items',order_items,'orderId',order_id,'createdAt',now());
 payload:=jsonb_set(payload,'{movements}',payload->'movements'||jsonb_build_array(movement));
 snap:=public.stock_save((snap->>'version')::bigint,payload,gen_random_uuid());
 if snap->'data'->'orders'->order_index->>'status'<>'shipped' then raise exception 'Ship failed';end if;
 tests:=tests+1;
 movement:=jsonb_set(movement,'{id}',to_jsonb(gen_random_uuid()));
 payload:=jsonb_set(snap->'data','{movements}',snap->'data'->'movements'||jsonb_build_array(movement));
 begin
  perform public.stock_save((snap->>'version')::bigint,payload,gen_random_uuid());
  raise exception 'Duplicate shipment accepted';
 exception when others then if position('đúng một phiếu xuất' in sqlerrm)=0 then raise;end if;end;
 tests:=tests+1;
 payload:=jsonb_set(snap->'data','{movements}','[]'::jsonb);
 begin
  perform public.stock_save((snap->>'version')::bigint,payload,gen_random_uuid());
  raise exception 'History deletion accepted';
 exception when others then if position('Không được xóa hoặc sửa phiếu' in sqlerrm)=0 then raise;end if;end;
 tests:=tests+1;
 perform set_config('camtech.test_results',jsonb_build_object('passed',tests,'writes','rolled back')::text,true);
end $$;
select current_setting('camtech.test_results')::jsonb as result;
rollback;
