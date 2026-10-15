const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../core.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const view=source.slice(source.indexOf('const stockSize='),source.indexOf('function itemOptions(){'));
const formatters=source.slice(source.indexOf('const safe='),source.indexOf('const today='));
function setup(){
 const elements=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',focus(){},setSelectionRange(){}});return elements.get(selector);};
 const context={
  C,Intl,search:'',filter:'all',sizeFilter:'all',document:{activeElement:null,querySelector:element},
  $:element,$$:()=>[],
  state:{products:[
   {id:'w',sku:'PU6x4-W',name:'Ống khí PU',color:'Trắng đục',unit:'Cuộn',opening:0},
   {id:'wt',sku:'PU6x4-WT',name:'Ống khí PU',color:'Trắng trong',unit:'Cuộn',opening:10},
   {id:'b',sku:'PU8x5-B',name:'Ống khí PU',color:'Đen',unit:'Cuộn',opening:1},
   {id:'r',sku:'PU8x5-R',name:'Ống <img src=x onerror=alert(1)>',color:'Đỏ',unit:'Cuộn',opening:6}
  ],movements:[],orders:[]}
 };
 vm.createContext(context);vm.runInContext(formatters+view,context);
 return {context,render(){context.stockView();return element('#view-stock').innerHTML;},element};
}
const rowCount=html=>(html.match(/class="stock-row /g)||[]).length;
test('Bảng nhóm giữ đủ mã và tách nhãn W/WT',()=>{
 const v=setup(),html=v.render();assert.equal(rowCount(html),4);
 assert.equal((html.match(/class="size-group"/g)||[]).length,2);
 assert.match(html,/color-code white-clear/);assert.match(html,/color-code white-opaque/);
 assert.equal(v.context.state.products.length,4);
});
test('Lọc kích cỡ giữ đúng mã hàng tương ứng',()=>{
 const v=setup();v.context.sizeFilter='PU6x4';const html=v.render();
 assert.equal(rowCount(html),2);assert.match(html,/<b class="sku">PU6x4-WT<\/b>/);
 assert.doesNotMatch(html,/<b class="sku">PU8x5-B<\/b>/);
});
test('Tìm màu không dấu vẫn tìm được trắng trong',()=>{
 const v=setup();v.context.search='trang trong';const html=v.render();
 assert.equal(rowCount(html),1);assert.match(html,/<b class="sku">PU6x4-WT<\/b>/);
 assert.doesNotMatch(html,/<b class="sku">PU6x4-W<\/b>/);
});
test('Sắp hết và hết khả dụng không trộn lẫn',()=>{
 const v=setup();v.context.filter='low';let html=v.render();
 assert.equal(rowCount(html),1);assert.match(html,/<b class="sku">PU8x5-B<\/b>/);
 v.context.filter='zero';html=v.render();assert.equal(rowCount(html),1);
 assert.match(html,/<b class="sku">PU6x4-W<\/b>/);
});
test('Tên hàng được hiển thị như văn bản, không chèn HTML',()=>{
 const v=setup(),html=v.render();assert.doesNotMatch(html,/<img /);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
});
test('Không tìm thấy có hướng dẫn; cập nhật giữ vị trí nhập tìm kiếm',()=>{
 const v=setup();let selection;
 v.element('#stock-search').setSelectionRange=(a,b)=>{selection=[a,b];};
 v.context.document.activeElement={id:'stock-search',selectionStart:3};
 v.context.search='nothing';const html=v.render();
 assert.equal(rowCount(html),0);assert.match(html,/Không có mã hàng phù hợp/);
 assert.deepEqual(selection,[3,3]);
});
