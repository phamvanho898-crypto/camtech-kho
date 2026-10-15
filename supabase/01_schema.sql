-- CAMTECH Kho V1. Run once in a dedicated Supabase project's SQL Editor.
-- No changes to other applications' tables or authentication configuration.
begin;
create schema if not exists camtech_private;
revoke all on schema camtech_private from public,anon;
grant usage on schema camtech_private to authenticated;

create table if not exists public.stock_workspaces (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 version bigint not null default 0,
 data jsonb not null default '{"products":[],"movements":[],"orders":[]}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.stock_requests (
 owner_id uuid not null references public.stock_workspaces(owner_id) on delete cascade,
 request_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(owner_id,request_id)
);
alter table public.stock_workspaces enable row level security;
alter table public.stock_requests enable row level security;
drop policy if exists stock_owner_read on public.stock_workspaces;
create policy stock_owner_read on public.stock_workspaces for select to authenticated using ((select auth.uid())=owner_id);
drop policy if exists stock_receipts_internal_only on public.stock_requests;
create policy stock_receipts_internal_only on public.stock_requests for all to authenticated using (false) with check (false);
revoke all on public.stock_workspaces,public.stock_requests from public,anon,authenticated;
grant select on public.stock_workspaces to authenticated;

create or replace function public.stock_validate(s jsonb, previous jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb; m jsonb; o jsonb; i jsonb; old jsonb; found jsonb; q numeric; bal numeric; held numeric; pid text;
begin
 if jsonb_typeof(s)<>'object' or coalesce(jsonb_typeof(s->'products'),'')<>'array' or coalesce(jsonb_typeof(s->'movements'),'')<>'array' or coalesce(jsonb_typeof(s->'orders'),'')<>'array' then raise exception 'Cấu trúc dữ liệu không hợp lệ'; end if;
 if octet_length(s::text)>8388608 then raise exception 'Dữ liệu kho vượt giới hạn V1'; end if;
 if exists(select 1 from jsonb_array_elements(s->'products') x group by x->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(s->'products') x group by upper(x->>'sku') having count(*)>1)
 or exists(select 1 from jsonb_array_elements(s->'movements') x group by x->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(s->'orders') x group by x->>'id' having count(*)>1) then raise exception 'Trùng mã hàng hoặc mã phiếu'; end if;
 for p in select value from jsonb_array_elements(s->'products') loop
  perform (p->>'id')::uuid;
  if coalesce(length(trim(p->>'sku')),0)=0 or coalesce(length(trim(p->>'unit')),0)=0 or coalesce(jsonb_typeof(p->'opening'),'')<>'number' then raise exception 'Mã hàng, đơn vị hoặc tồn đầu không hợp lệ'; end if;
  q=(p->>'opening')::numeric;if q<0 or q>1000000000 or round(q,3)<>q then raise exception 'Tồn đầu không hợp lệ'; end if;
 end loop;
 for old in select value from jsonb_array_elements(previous->'products') loop
  select value into found from jsonb_array_elements(s->'products') where value->>'id'=old->>'id';
  if found is null or found->'opening' is distinct from old->'opening' or found->'sku' is distinct from old->'sku' then raise exception 'Không được xóa mã hoặc sửa tồn đầu của mã đã có'; end if;
 end loop;
 for old in select value from jsonb_array_elements(previous->'movements') loop
  if not (s->'movements' @> jsonb_build_array(old)) then raise exception 'Không được xóa hoặc sửa phiếu đã ghi nhận'; end if;
 end loop;
 for m in select value from jsonb_array_elements(s->'movements') loop
  perform (m->>'id')::uuid;perform (m->>'date')::date;
  if coalesce(m->>'type','') not in ('in','out') or coalesce(jsonb_typeof(m->'items'),'')<>'array' or jsonb_array_length(m->'items')=0 then raise exception 'Phiếu nhập xuất không hợp lệ'; end if;
  if exists(select 1 from jsonb_array_elements(m->'items') x group by x->>'productId' having count(*)>1) then raise exception 'Trùng mã trong phiếu';end if;
  for i in select value from jsonb_array_elements(m->'items') loop
   if coalesce(jsonb_typeof(i->'qty'),'')<>'number' then raise exception 'Số lượng không hợp lệ';end if;
   q=(i->>'qty')::numeric;
   if q<=0 or q>1000000000 or round(q,3)<>q or not exists(select 1 from jsonb_array_elements(s->'products') pr where pr->>'id'=i->>'productId') then raise exception 'Mã hàng hoặc số lượng không hợp lệ';end if;
  end loop;
 end loop;
 for o in select value from jsonb_array_elements(s->'orders') loop
  perform (o->>'id')::uuid;
  if coalesce(o->>'status','') not in ('draft','reserved','shipped','cancelled') or coalesce(length(trim(o->>'customer')),0)=0 or coalesce(jsonb_typeof(o->'items'),'')<>'array' or jsonb_array_length(o->'items')=0 then raise exception 'Đơn chờ không hợp lệ'; end if;
  if exists(select 1 from jsonb_array_elements(o->'items') x group by x->>'productId' having count(*)>1) then raise exception 'Trùng mã trong đơn';end if;
  for i in select value from jsonb_array_elements(o->'items') loop
   if coalesce(jsonb_typeof(i->'qty'),'')<>'number' then raise exception 'Số lượng đơn không hợp lệ';end if;
   q=(i->>'qty')::numeric;
   if q<=0 or q>1000000000 or round(q,3)<>q or not exists(select 1 from jsonb_array_elements(s->'products') pr where pr->>'id'=i->>'productId') then raise exception 'Mã hàng hoặc số lượng đơn không hợp lệ';end if;
  end loop;
  if o->>'status'='shipped' and (select count(*) from jsonb_array_elements(s->'movements') mv where mv->>'orderId'=o->>'id' and mv->>'type'='out' and mv->'items'=o->'items')<>1 then raise exception 'Đơn đã giao phải có đúng một phiếu xuất khớp số lượng';end if;
 end loop;
 for old in select value from jsonb_array_elements(previous->'orders') loop
  select value into found from jsonb_array_elements(s->'orders') where value->>'id'=old->>'id';
  if found is null then raise exception 'Không được xóa đơn chờ';end if;
  if old->>'status' in ('shipped','cancelled') and found<>old then raise exception 'Đơn đã kết thúc không thể thay đổi';end if;
  if found->'items' is distinct from old->'items' or found->'customer' is distinct from old->'customer' then raise exception 'Để sửa hàng, hủy đơn cũ và tạo đơn mới';end if;
 end loop;
 for m in select value from jsonb_array_elements(s->'movements') where value ? 'orderId' loop
  if not exists(select 1 from jsonb_array_elements(s->'orders') ord where ord->>'id'=m->>'orderId' and ord->>'status'='shipped' and ord->'items'=m->'items' and m->>'type'='out') then raise exception 'Phiếu giao đơn không khớp';end if;
 end loop;
 for p in select value from jsonb_array_elements(s->'products') loop
  pid=p->>'id';bal=(p->>'opening')::numeric;held=0;
  for m in select value from jsonb_array_elements(s->'movements') loop
   for i in select value from jsonb_array_elements(m->'items') where value->>'productId'=pid loop
    bal=bal+(i->>'qty')::numeric*(case when m->>'type'='in' then 1 else -1 end);
   end loop;
  end loop;
  for o in select value from jsonb_array_elements(s->'orders') where value->>'status'='reserved' loop
   for i in select value from jsonb_array_elements(o->'items') where value->>'productId'=pid loop held=held+(i->>'qty')::numeric;end loop;
  end loop;
  if bal<0 or held>bal then raise exception '%: không đủ hàng hoặc hàng đã được giữ cho đơn khác',p->>'sku';end if;
 end loop;
end;
$$;

create or replace function camtech_private.stock_load()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.stock_workspaces%rowtype;
begin
 if u is null then raise exception 'Cần đăng nhập' using errcode='42501';end if;
 insert into public.stock_workspaces(owner_id) values(u) on conflict do nothing;
 select * into r from public.stock_workspaces where owner_id=u;
 return jsonb_build_object('version',r.version,'data',r.data);
end;
$$;

create or replace function camtech_private.stock_save(p_expected bigint,p_state jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.stock_workspaces%rowtype;
begin
 if u is null then raise exception 'Cần đăng nhập' using errcode='42501';end if;
 if p_request is null or p_expected is null or p_state is null then raise exception 'Thiếu dữ liệu phiếu';end if;
 insert into public.stock_workspaces(owner_id) values(u) on conflict do nothing;
 select * into r from public.stock_workspaces where owner_id=u for update;
 -- Check receipt before revision: a retry after a lost response cannot duplicate a movement.
 if exists(select 1 from public.stock_requests where owner_id=u and request_id=p_request) then return jsonb_build_object('version',r.version,'data',r.data);end if;
 if r.version<>p_expected then raise exception 'VERSION_CONFLICT';end if;
 perform public.stock_validate(p_state,r.data);
 update public.stock_workspaces set data=p_state,version=version+1,updated_at=now() where owner_id=u returning * into r;
 insert into public.stock_requests(owner_id,request_id) values(u,p_request);
 return jsonb_build_object('version',r.version,'data',r.data);
end;
$$;
-- Exposed RPCs run as the caller; privileged routines stay in an unexposed schema.
-- The private routines still check auth.uid() and constrain all reads/writes by owner.
create or replace function public.stock_load()
returns jsonb language sql security invoker set search_path='' as $$
 select camtech_private.stock_load();
$$;
create or replace function public.stock_save(p_expected bigint,p_state jsonb,p_request uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select camtech_private.stock_save(p_expected,p_state,p_request);
$$;
revoke execute on function camtech_private.stock_load() from public,anon;
revoke execute on function camtech_private.stock_save(bigint,jsonb,uuid) from public,anon;
grant execute on function camtech_private.stock_load() to authenticated;
grant execute on function camtech_private.stock_save(bigint,jsonb,uuid) to authenticated;
revoke execute on function public.stock_validate(jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.stock_load() from public,anon;
revoke execute on function public.stock_save(bigint,jsonb,uuid) from public,anon;
grant execute on function public.stock_load() to authenticated;
grant execute on function public.stock_save(bigint,jsonb,uuid) to authenticated;
commit;
