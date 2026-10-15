(function(root,factory){const api=factory(typeof module==='object'?require('./core.js'):root.KhoCore);if(typeof module==='object')module.exports=api;else root.KhoReports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const labels={all:'Toàn bộ tồn kho',zero:'Hết khả dụng',low:'Sắp hết hàng'};
 const fold=value=>String(value??'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 const size=p=>p.sku.match(/^(PU\d+(?:\.\d+)?x\d+(?:\.\d+)?)-/i)?.[1]||'Khác';
 const status=p=>p.balance<=0?'Hết tồn thực tế':p.available<=0?'Đã giữ hết':p.available<=2?'Sắp hết':'Còn hàng';
 function prepare(state,options={}){
  const filter=options.filter||'all';if(!Object.hasOwn(labels,filter))throw Error('Bộ lọc báo cáo không hợp lệ.');
  const asOf=new Date(options.asOf||Date.now());if(!Number.isFinite(asOf.getTime()))throw Error('Thời điểm báo cáo không hợp lệ.');
  const all=C.inventory(state),query=String(options.search||''),selectedSize=options.size||'all';
  const items=all.filter(p=>fold(p.sku+' '+p.name+' '+p.color).includes(fold(query))&&(selectedSize==='all'||size(p)===selectedSize)&&(filter==='all'||filter==='zero'&&p.available<=0||filter==='low'&&p.available>0&&p.available<=2));
  if(filter==='low')items.sort((a,b)=>a.available-b.available||a.sku.localeCompare(b.sku,undefined,{numeric:true}));
  const totals=new Map();
  for(const p of items){const unit=p.unit||'Chưa có đơn vị',t=totals.get(unit)||{unit,balance:0,reserved:0,available:0};for(const key of ['balance','reserved','available'])t[key]=C.round(t[key]+p[key]);totals.set(unit,t);}
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(asOf).map(p=>[p.type,p.value]));
  const stamp=`${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
  return {filter,label:labels[filter],query,size:selectedSize,asOf:asOf.toISOString(),timeLabel:new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'medium'}).format(asOf),version:options.version??null,demo:Boolean(options.demo),items,totals:[...totals.values()],sizes:[...new Set(all.map(size))],counts:{all:all.length,zero:all.filter(p=>p.available<=0).length,physicalZero:all.filter(p=>p.balance<=0).length,low:all.filter(p=>p.available>0&&p.available<=2).length},filename:`CAMTECH_${options.demo?'BAN_THU_':''}Bao_cao_${{all:'ton_kho',zero:'het_kha_dung',low:'sap_het'}[filter]}_${stamp}.xlsx`};
 }
 function workbook(report,ExcelJS){
  if(!report.items.length)throw Error('Không có mã hàng để xuất theo bộ lọc này.');
  const book=new ExcelJS.Workbook();book.creator='CAMTECH';book.created=new Date(report.asOf);book.modified=new Date(report.asOf);
  const sheet=book.addWorksheet('Bao cao ton kho',{views:[{state:'frozen',xSplit:1,ySplit:8,showGridLines:false}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}}});
  sheet.columns=[{width:24},{width:28},{width:25},{width:12},{width:16},{width:13},{width:16},{width:25}];
  sheet.getCell('A1').value='CAMTECH / BÁO CÁO TỒN KHO';sheet.getRow(1).height=34;
  sheet.getCell('A1').font={name:'Arial',size:17,bold:true,color:{argb:'FF213E58'}};
  sheet.getCell('A2').value=report.label+(report.demo?' — BẢN THỬ, KHÔNG PHẢI KHO THẬT':'');
  sheet.getCell('A3').value=`Thời điểm: ${report.timeLabel} (giờ Việt Nam)${report.version===null||report.demo?'':` • Phiên bản dữ liệu: ${report.version}`}`;
  sheet.getCell('A4').value=`Phạm vi: ${report.size==='all'?'Tất cả kích cỡ':report.size} • Từ khóa: ${report.query||'Tất cả'} • ${report.items.length} mã hàng`;
  sheet.getCell('A5').value='WT = Trắng trong; W = Trắng đục. Khả dụng = Tồn thực tế − Đã giữ.';
  sheet.getCell('A6').value='Hết khả dụng: ≤ 0; Sắp hết: > 0 và ≤ 2 theo đơn vị của từng mã. Báo cáo chốt tại thời điểm xuất.';
  for(let r=2;r<=6;r++){sheet.getRow(r).height=24;sheet.getRow(r).font={name:'Arial',size:11,color:{argb:'FF526174'}};}
  sheet.getCell('A2').font={name:'Arial',size:12,bold:true,color:{argb:report.demo?'FFAC2631':'FF213E58'}};
  sheet.getRow(8).values=['Mã hàng','Tên hàng','Màu sắc','Đơn vị','Tồn thực tế','Đã giữ','Khả dụng','Tình trạng'];
  sheet.getRow(8).height=31;
  sheet.getRow(8).eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF213E58'}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.border={right:{style:'thin',color:{argb:'FFFFFFFF'}}};});
  for(const [index,p] of report.items.entries()){
   const row=sheet.addRow([p.sku,p.name||'',p.color||'',p.unit,p.balance,p.reserved,p.available,status(p)]);
   row.height=Math.max(29,Math.ceil(Math.max(p.sku.length/24,(p.name||'').length/28,(p.color||'').length/25))*17+8);
   row.eachCell({includeEmpty:true},(cell,col)=>{cell.font={name:'Arial',size:11,color:{argb:'FF253649'},bold:col===1||col===7};cell.alignment={vertical:'middle',horizontal:col>=5&&col<=7?'right':'left',wrapText:col<5||col===8};if(index%2)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F5F9'}};if(col>=5&&col<=7)cell.numFmt=Number.isInteger(cell.value)?'#,##0':'#,##0.###';});
   if(p.available<=2){const cell=row.getCell(7);cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:p.available<=0?'FFFCE8EA':'FFFFF0CD'}};cell.font={name:'Arial',size:11,bold:true,color:{argb:p.available<=0?'FFAC2631':'FF8A5700'}};}
  }
  const last=8+report.items.length;sheet.autoFilter=`A8:H${last}`;sheet.pageSetup.printTitlesRow='1:8';
  sheet.addRow([]);
  for(const t of report.totals){const row=sheet.addRow(['TỔNG THEO ĐƠN VỊ','','',t.unit,t.balance,t.reserved,t.available,'']);row.height=28;row.eachCell({includeEmpty:true},(cell,col)=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FF213E58'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9F5EF'}};cell.alignment={vertical:'middle',horizontal:col>=5&&col<=7?'right':'left'};if(col>=5&&col<=7)cell.numFmt=Number.isInteger(cell.value)?'#,##0':'#,##0.###';});}
  sheet.pageSetup.printArea=`A1:H${sheet.rowCount}`;
  sheet.headerFooter.oddFooter='&LCAMTECH — Kho chính&RTrang &P / &N';
  return book;
 }
 return {prepare,status,workbook};
});
