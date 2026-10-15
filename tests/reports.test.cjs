const test=require('node:test'),assert=require('node:assert/strict'),R=require('../reports.js');
const clock='2026-10-15T17:30:00Z';
function seed(){return {
 products:[
  {id:'w',sku:'PU6x4-W',name:'Ống khí PU',color:'Trắng đục',unit:'Cuộn',opening:3},
  {id:'wt',sku:'PU6x4-WT',name:'Ống khí PU',color:'Trắng trong',unit:'Cuộn',opening:5},
  {id:'lb',sku:'PU6x4-LB',name:'Ống khí PU',color:'Xanh dương nhạt',unit:'Cuộn',opening:7},
  {id:'z',sku:'PU8x5-R',name:'Ống khí PU',color:'Đỏ',unit:'Cuộn',opening:0},
  {id:'m',sku:'TEST-M',name:'Ống theo mét',color:'Đen',unit:'Mét',opening:.125},
  {id:'edge',sku:'PU8x5-B',name:'Ống khí PU',color:'Đen',unit:'Cuộn',opening:2.001}
 ],
 movements:[{id:'m1',type:'out',items:[{productId:'w',qty:1}]}],
 orders:[{id:'r',status:'reserved',items:[{productId:'lb',qty:7}]},{id:'d',status:'draft',items:[{productId:'wt',qty:5}]},{id:'s',status:'shipped',items:[{productId:'wt',qty:1}]}],
 voidedMovements:[{movement:{type:'out',items:[{productId:'wt',qty:5}]}}]
};}
test('Báo cáo dùng tồn thực tế, chỉ trừ đơn đang giữ, bỏ qua phiếu đã hoàn',()=>{
 const state=seed(),before=JSON.stringify(state),r=R.prepare(state,{asOf:clock});
 assert.deepEqual(r.counts,{all:6,zero:2,physicalZero:1,low:2});
 const lb=r.items.find(p=>p.id==='lb');assert.deepEqual([lb.balance,lb.reserved,lb.available],[7,7,0]);
 assert.equal(R.status(lb),'Đã giữ hết');assert.equal(R.status(r.items.find(p=>p.id==='z')),'Hết tồn thực tế');
 assert.equal(r.items.find(p=>p.id==='wt').available,5);assert.equal(JSON.stringify(state),before);
});
test('Hết và sắp hết tách riêng, đúng biên 0 / 2 / 2.001 và số thập phân',()=>{
 const low=R.prepare(seed(),{filter:'low',asOf:clock});
 assert.deepEqual(low.items.map(p=>p.id),['m','w']);
 assert.deepEqual(R.prepare(seed(),{filter:'zero',asOf:clock}).items.map(p=>p.id).sort(),['lb','z']);
});
test('Kết hợp loại báo cáo, kích cỡ và từ khóa không dấu; W/WT riêng',()=>{
 const r=R.prepare(seed(),{size:'PU6x4',search:'trang trong',asOf:clock});
 assert.deepEqual(r.items.map(p=>p.sku),['PU6x4-WT']);
 assert.equal(r.counts.all,6);
 assert.equal(R.prepare(seed(),{size:'PU8x5',filter:'low',asOf:clock}).items.length,0);
});
test('Tổng cộng chỉ gồm danh sách lọc và không gộp đơn vị khác nhau',()=>{
 const low=R.prepare(seed(),{filter:'low',asOf:clock});
 assert.deepEqual(low.totals,[{unit:'Mét',balance:.125,reserved:0,available:.125},{unit:'Cuộn',balance:2,reserved:0,available:2}]);
});
test('Tên file theo ngày giờ Việt Nam và có nhãn bản thử',()=>{
 const r=R.prepare(seed(),{filter:'zero',asOf:clock,demo:true});
 assert.equal(r.filename,'CAMTECH_BAN_THU_Bao_cao_het_kha_dung_2026-10-16_00-30-00.xlsx');
 assert.throws(()=>R.prepare(seed(),{filter:'bad'}),/Bộ lọc/);
 assert.throws(()=>R.prepare(seed(),{asOf:'bad'}),/Thời điểm/);
 assert.throws(()=>R.workbook(R.prepare({products:[],movements:[],orders:[]})),/Không có mã/);
});
