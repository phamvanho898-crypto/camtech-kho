const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../core.js'),R=require('../reports.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const formatters=source.slice(source.indexOf('const safe='),source.indexOf('const today='));
const functions=source.slice(source.indexOf('function reportView(){'),source.indexOf('function itemOptions(){'));
function setup(){
 const elements=new Map(),element=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',focus(){},setSelectionRange(){}});return elements.get(selector);};
 const state={products:[{id:'p',sku:'PU6x4-WT',name:'<img src=x onerror=bad()>',color:'Trắng trong',unit:'Cuộn',opening:2}],orders:[],movements:[]};
 const context={C,KhoReports:R,Intl,Date,reportFilter:'all',reportSearch:'',reportSize:'all',reportReady:true,reportSyncedAt:new Date('2026-10-15T06:40:00Z'),reportExporting:false,excelLoading:null,revision:5,demo:true,busy:false,pending:null,tab:'reports',session:null,state,document:{activeElement:null,querySelector:element},$:element,$$:()=>[],window:{ExcelJS:{}},toast(){},errorText:e=>e.message};
 vm.createContext(context);vm.runInContext(formatters+functions,context);
 return {context,element,render(){context.reportView();return element('#view-reports').innerHTML;}};
}
test('Báo cáo hiển thị an toàn, giữ bộ lọc và vị trí gõ sau cập nhật',()=>{
 const v=setup();let cursor;
 v.context.reportFilter='low';v.context.reportSearch='trang';
 v.context.document.activeElement={id:'report-search',selectionStart:3};v.element('#report-search').setSelectionRange=(a,b)=>cursor=[a,b];
 const html=v.render();assert.match(html,/PU6x4-WT/);assert.doesNotMatch(html,/<img /);assert.match(html,/&lt;img/);
 assert.match(html,/report-low" data-report-filter="low" aria-pressed="true"/);assert.deepEqual(cursor,[3,3]);
});
test('Chưa tải dữ liệu, danh sách rỗng và phiếu chưa xác nhận không cho xuất',()=>{
 const v=setup();v.context.reportReady=false;assert.match(v.render(),/Chưa có số liệu/);assert.doesNotMatch(v.render(),/id="export-report"/);
 v.context.reportReady=true;v.context.reportSearch='khongco';assert.match(v.render(),/id="export-report" disabled/);
 v.context.reportSearch='';v.context.pending={};assert.match(v.render(),/id="export-report" disabled/);
});
test('Xuất kiểm tra dữ liệu mới bằng stock_load, giữ phạm vi lọc và không ghi kho',async()=>{
 const v=setup(),c=v.context,events=[];c.demo=false;c.session={user:{id:'owner'}};
 c.reportSearch='trang';c.reportFilter='low';c.reportView=()=>{};
 c.rpc=async(name)=>{events.push(name);const state=structuredClone(c.state);state.products[0].opening=1;return {version:6,data:state};};
 c.accept=snapshot=>{c.state=snapshot.data;c.revision=snapshot.version;};
 c.KhoReports={...R,workbook(report){assert.equal(report.version,6);assert.equal(report.items[0].balance,1);assert.equal(report.query,'trang');return{xlsx:{writeBuffer:async()=>new Uint8Array([1,2,3])}};}};
 c.Blob=Blob;c.URL={createObjectURL(){return'blob:report';},revokeObjectURL(){}};c.setTimeout=()=>0;
 c.document.body={append(){}};c.document.createElement=()=>({click(){events.push('download');},remove(){}});
 await c.exportReport();assert.deepEqual(events,['stock_load','download']);assert.equal(c.reportExporting,false);
});
test('Lỗi đồng bộ không tải file cũ; phiếu đang chờ không gọi đọc/xuất',async()=>{
 const v=setup(),c=v.context,events=[];c.demo=false;c.session={user:{id:'owner'}};c.reportView=()=>{};
 c.rpc=async()=>{events.push('read');throw Error('Mất kết nối');};c.toast=msg=>events.push(msg);
 await c.exportReport();assert.equal(events[0],'read');assert.match(events[1],/Chưa xuất được báo cáo: Mất kết nối/);assert.equal(c.reportExporting,false);
 events.length=0;c.pending={};await c.exportReport();assert.equal(events.length,1);assert.match(events[0],/Chờ phiếu/);
});
