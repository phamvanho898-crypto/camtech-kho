(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.KhoCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=s=>String(s||'').trim().toUpperCase().replaceAll('X','x').replace(/\s/g,'');
 const qty=v=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>1e9||Math.abs(Math.round(n*1000)-n*1000)>1e-7)throw Error('Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.');return n;};
 const round=n=>Math.round((n+Number.EPSILON)*1000)/1000;
 const blank=()=>({products:[],movements:[],orders:[]});
 const color=sku=>({WT:'Trắng trong',W:'Trắng đục',LB:'Xanh dương nhạt',B:'Đen',R:'Đỏ',G:'Xanh lá',Y:'Vàng',O:'Cam'}[norm(sku).split('-').at(-1)]||'Khác');
 function inventory(s){
  return s.products.map(p=>{
   let balance=Number(p.opening||0),reserved=0;
   for(const m of s.movements)for(const i of m.items)if(i.productId===p.id)balance+=Number(i.qty)*(m.type==='in'?1:-1);
   for(const o of s.orders)if(o.status==='reserved')for(const i of o.items)if(i.productId===p.id)reserved+=Number(i.qty);
   balance=round(balance);reserved=round(reserved);return {...p,balance,reserved,available:round(balance-reserved)};
  }).sort((a,b)=>a.sku.localeCompare(b.sku,undefined,{numeric:true}));
 }
 function lines(s,items){
  if(!Array.isArray(items)||!items.length)throw Error('Chọn ít nhất một mã hàng.');
  const out=[],ids=new Set();
  for(const i of items){if(!s.products.some(p=>p.id===i.productId))throw Error('Mã hàng không tồn tại.');if(ids.has(i.productId))throw Error('Mã hàng bị lặp trong phiếu.');ids.add(i.productId);out.push({productId:i.productId,qty:qty(i.qty)});}return out;
 }
 function orderCheck(s,o){
  const rows=inventory(s);return o.items.map(i=>{const p=rows.find(p=>p.id===i.productId);const usable=p.available+(o.status==='reserved'?Number(i.qty):0);return {...p,need:Number(i.qty),short:round(Math.max(0,Number(i.qty)-usable))};});
 }
 function enough(s,items,own){
  for(const i of items){const p=inventory(s).find(p=>p.id===i.productId),a=p.available+(own?.status==='reserved'?Number(i.qty):0);if(a<Number(i.qty))throw Error(`${p.sku}: còn khả dụng ${a} ${p.unit}, cần ${i.qty}.`);}
 }
 function apply(state,a){
  const s=clone(state),id=a.id,now=a.now||new Date().toISOString();
  if(!id)throw Error('Thiếu mã thao tác.');
  if(s.movements.some(m=>m.id===id)||s.orders.some(o=>o.id===id)||s.products.some(p=>p.id===id))return s;
  if(a.type==='product'){
   const sku=norm(a.sku);if(!sku||sku.length>64)throw Error('Nhập mã hàng, tối đa 64 ký tự.');
   if(s.products.some(p=>norm(p.sku)===sku))throw Error('Mã này đã có trong danh mục.');
   s.products.push({id,sku,name:String(a.name||'Ống khí PU').trim().slice(0,150),color:color(sku),unit:String(a.unit||'Cuộn').trim().slice(0,20),opening:0,min:0});
  }else if(a.type==='in'||a.type==='out'){
   const items=lines(s,a.items);if(a.type==='out')enough(s,items);
   s.movements.push({id,type:a.type,date:a.date||now.slice(0,10),items,partner:String(a.partner||'').slice(0,150),note:String(a.note||'').slice(0,500),createdAt:now});
  }else if(a.type==='order'){
   if(!String(a.customer||'').trim())throw Error('Nhập tên khách hàng hoặc mã đơn.');
   s.orders.push({id,customer:String(a.customer).trim().slice(0,150),ref:String(a.ref||'').slice(0,100),due:a.due||'',note:String(a.note||'').slice(0,500),items:lines(s,a.items),status:'draft',createdAt:now});
  }else{
   const o=s.orders.find(o=>o.id===a.orderId);if(!o)throw Error('Không tìm thấy đơn hàng.');
   if(o.status==='shipped'||o.status==='cancelled')throw Error('Đơn đã giao hoặc đã hủy.');
   if(a.type==='reserve'){if(o.status==='reserved')return s;enough(s,o.items);o.status='reserved';}
   else if(a.type==='release'){o.status='draft';}
   else if(a.type==='cancel'){o.status='cancelled';}
   else if(a.type==='ship'){
    enough(s,o.items,o);s.movements.push({id,type:'out',date:a.date||now.slice(0,10),items:clone(o.items),partner:o.customer,note:o.ref||o.note,orderId:o.id,createdAt:now});o.status='shipped';o.shippedAt=now;
   }else throw Error('Thao tác không hợp lệ.');
  }
  for(const p of inventory(s))if(p.balance<0||p.available<0)throw Error('Tồn kho không hợp lệ.');return s;
 }
 return {clone,norm,qty,blank,color,inventory,orderCheck,apply,round};
});
