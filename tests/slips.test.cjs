const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js'),S=require('../slips.js');
function seed(){return {
 products:[{id:'w',sku:'PU6x4-W',name:'Ống khí PU',color:'Trắng đục',unit:'Cuộn',opening:8},{id:'wt',sku:'PU6x4-WT',name:'Ống khí PU',color:'Trắng trong',unit:'Cuộn',opening:10}],
 movements:[],orders:[]
};}
const id='12345678-1234-4567-89ab-123456789abc';
function outgoing(){return C.apply(seed(),{id,type:'out',date:'2026-10-15',partner:'Khách A',note:'Giao tại kho',items:[{productId:'w',qty:2},{productId:'wt',qty:3}]});}

test('Phiếu xuất giữ đúng mã W/WT, màu, đơn vị và số lượng',()=>{
 const state=outgoing(),slip=S.prepare(state,id);
 assert.deepEqual(slip.items.map(i=>[i.sku,i.color,i.unit,i.qty]),[['PU6x4-W','Trắng đục','Cuộn',2],['PU6x4-WT','Trắng trong','Cuộn',3]]);
 assert.deepEqual(slip.totals,[{unit:'Cuộn',qty:5}]);assert.equal(slip.date,'15/10/2026');assert.equal(slip.partner,'Khách A');
});
test('Số phiếu ổn định khi in lại và tải sang thiết bị khác',()=>{
 const state=outgoing(),copy=JSON.parse(JSON.stringify(state));
 assert.equal(S.prepare(state,id).number,S.prepare(copy,id).number);
 assert.equal(S.prepare(state,id).number,'PX-20261015-123456789ABC');
});
test('Không tạo phiếu từ nhập kho, đơn nháp hoặc giao dịch chưa lưu',()=>{
 const s=C.apply(seed(),{id,type:'in',items:[{productId:'w',qty:1}]});
 assert.throws(()=>S.prepare(s,id),/xuất kho đã lưu/);
 assert.throws(()=>S.prepare(seed(),id),/xuất kho đã lưu/);
});
test('Giao từ đơn tạo đúng một phiếu và giữ tham chiếu đơn',()=>{
 let s=C.apply(seed(),{id:'order-1',type:'order',customer:'Khách B',ref:'DH-001',items:[{productId:'wt',qty:2}]});
 s=C.apply(s,{id,type:'ship',orderId:'order-1',date:'2026-10-15'});
 const data=S.prepare(s,id);assert.equal(data.partner,'Khách B');assert.equal(data.orderRef,'DH-001');assert.equal(data.items[0].qty,2);
});
test('Xem và in lại không thay đổi số tồn, lịch sử hay trạng thái đơn',()=>{
 const state=outgoing(),before=JSON.stringify(state);
 for(let i=0;i<3;i++)S.render(S.prepare(state,id));
 assert.equal(JSON.stringify(state),before);assert.equal(C.inventory(state).find(p=>p.id==='w').balance,6);
});
test('Không cộng gộp các đơn vị khác nhau; làm tròn tổng số thập phân',()=>{
 const state=outgoing();state.products.push({id:'m',sku:'TEST-M',name:'Ống',unit:'Mét',color:'Đen'});
 state.movements[0].items=[{productId:'w',qty:.1},{productId:'wt',qty:.2},{productId:'m',qty:4}];
 assert.deepEqual(S.prepare(state,id).totals,[{unit:'Cuộn',qty:.3},{unit:'Mét',qty:4}]);
});
test('Nội dung người dùng được thoát HTML và bản thử có nhãn rõ',()=>{
 const state=outgoing();state.movements[0].partner='<img src=x onerror=alert(1)>';state.movements[0].note='<script>bad</script>';
 const html=S.render(S.prepare(state,id),{demo:true});
 assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;script&gt;bad/);assert.match(html,/BẢN THỬ/);
});
test('Chặn ngày sai, số lượng không hợp lệ hoặc mất mã hàng',()=>{
 for(const qty of [0,-1,Infinity,1.0001]){const s=outgoing();s.movements[0].items[0].qty=qty;assert.throws(()=>S.prepare(s,id),/Số lượng/);}
 const s=outgoing();for(const date of ['2026-02-30','2026-13-01','bad']){s.movements[0].date=date;assert.throws(()=>S.prepare(s,id),/Ngày/);}
 s.movements[0].date='2026-10-15';s.products=[];assert.throws(()=>S.prepare(s,id),/Không tìm thấy mã/);
});
test('Phiếu nhiều dòng giữ đầy đủ hàng hóa và chỗ ký nhận',()=>{
 const s=outgoing();s.products=Array.from({length:80},(_,i)=>({id:'p-'+i,sku:'TEST-'+i,name:'Mã thử '+i,color:'Đen',unit:'Cuộn',opening:1}));s.movements[0].items=s.products.map(p=>({productId:p.id,qty:1}));
 const html=S.render(S.prepare(s,id));assert.equal((html.match(/class="issue-sku"/g)||[]).length,80);
 for(const label of ['Người lập phiếu','Người nhận hàng','Thủ kho'])assert.ok(html.includes(label));
});
