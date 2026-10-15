(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.KhoSlips=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const format=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(v);
 const round=v=>Math.round((v+Number.EPSILON)*1000)/1000;
 function dateParts(date){
  const match=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/),parsed=new Date(date+'T00:00:00Z');
  if(!match||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw Error('Ngày phiếu không hợp lệ.');
  return {iso:date,label:`${match[3]}/${match[2]}/${match[1]}`,compact:match.slice(1).join('')};
 }
 function number(movement){
  const date=dateParts(movement.date),code=String(movement.id||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
  if(!code)throw Error('Phiếu chưa có mã giao dịch.');
  return `PX-${date.compact}-${code.slice(-12)}`;
 }
 function prepare(state,movementId){
  const movement=state.movements.find(m=>m.id===movementId);
  if(!movement||movement.type!=='out')throw Error('Chỉ lập phiếu từ giao dịch xuất kho đã lưu.');
  if(!Array.isArray(movement.items)||!movement.items.length)throw Error('Phiếu chưa có hàng hóa.');
  const order=movement.orderId?state.orders.find(o=>o.id===movement.orderId):null;
  const products=new Map(state.products.map(p=>[p.id,p])),totals=new Map();
  const items=movement.items.map((item,index)=>{
   const product=products.get(item.productId),qty=Number(item.qty);
   if(!product)throw Error('Không tìm thấy mã hàng của phiếu xuất.');
   if(!Number.isFinite(qty)||qty<=0||round(qty)!==qty)throw Error('Số lượng phiếu xuất không hợp lệ.');
   const unit=String(product.unit||'').trim();if(!unit)throw Error('Mã hàng chưa có đơn vị tính.');
   totals.set(unit,round((totals.get(unit)||0)+qty));
   return {index:index+1,sku:product.sku,name:product.name||'',color:product.color||'',unit,qty};
  });
  return {number:number(movement),id:movement.id,date:dateParts(movement.date).label,
   partner:movement.partner||order?.customer||'',note:movement.note||'',
   orderRef:order?.ref||'',warehouse:'Kho chính',items,totals:[...totals].map(([unit,qty])=>({unit,qty}))};
 }
 function render(data,options={}){
  const e=escape;
  return `<article class="issue-paper" aria-label="Phiếu xuất kho ${e(data.number)}">
   ${options.demo?'<div class="issue-demo">BẢN THỬ — KHÔNG DÙNG GIAO HÀNG</div>':''}
   <div class="issue-company"><b>CÔNG TY TNHH CAMTECH</b><span>Quản lý nhập xuất tồn kho</span></div>
   <div class="issue-title"><h1>PHIẾU XUẤT KHO</h1><p>Ngày ${e(data.date)}</p><p class="issue-number">Số phiếu: <b>${e(data.number)}</b></p></div>
   <dl class="issue-details"><div><dt>Khách hàng / người nhận:</dt><dd>${e(data.partner)||'<span class="issue-blank">................................................................................</span>'}</dd></div><div><dt>Kho xuất:</dt><dd>${e(data.warehouse)}</dd></div>${data.orderRef?`<div><dt>Đơn hàng tham chiếu:</dt><dd>${e(data.orderRef)}</dd></div>`:''}<div><dt>Ghi chú / lý do xuất:</dt><dd>${e(data.note)||'Xuất hàng'}</dd></div></dl>
   <table class="issue-items"><thead><tr><th scope="col">STT</th><th scope="col">Mã hàng</th><th scope="col">Tên hàng / màu</th><th scope="col">Đơn vị</th><th scope="col" class="issue-qty">Số lượng xuất</th></tr></thead><tbody>${data.items.map(item=>`<tr><td>${item.index}</td><td class="issue-sku">${e(item.sku)}</td><td>${e(item.name)}<span class="issue-color">${e(item.color)}</span></td><td>${e(item.unit)}</td><td class="issue-qty"><b>${format(item.qty)}</b></td></tr>`).join('')}</tbody></table>
   <div class="issue-total"><b>Tổng số lượng xuất:</b><span>${data.totals.map(total=>`<b>${format(total.qty)}</b> ${e(total.unit)}`).join(' · ')}</span></div>
   <p class="issue-legend"><b>WT</b> = Trắng trong &nbsp; · &nbsp; <b>W</b> = Trắng đục</p>
   <div class="issue-signatures"><div><b>Người lập phiếu</b><span>(Ký, ghi rõ họ tên)</span><div class="issue-sign-space"></div></div><div><b>Người nhận hàng</b><span>(Ký, ghi rõ họ tên)</span><div class="issue-sign-space"></div></div><div><b>Thủ kho</b><span>(Ký, ghi rõ họ tên)</span><div class="issue-sign-space"></div></div></div>
  </article>`;
 }
 return {number,prepare,render};
});
