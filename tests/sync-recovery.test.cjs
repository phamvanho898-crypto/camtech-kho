const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),C=require('../core.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const functions=source.slice(source.indexOf('function saveSession('),source.indexOf('const product='));
const snapshot=()=>({version:7,data:{products:[{id:'p',sku:'PU6x4-WT',color:'Trắng trong',name:'Ống khí PU',unit:'Cuộn',opening:8}],orders:[],movements:[]}});
function setup(){
 const nodes=new Map(),store=new Map(),calls=[],renders=[];
 const $=selector=>{if(!nodes.has(selector))nodes.set(selector,{hidden:false,textContent:'',value:'',innerHTML:'',open:false,close(){this.open=false;}});return nodes.get(selector);};
 const session={user:{id:'owner',email:'owner@example.test'},expires_at:1,access_token:'expired-test-token',refresh_token:'test-refresh'};
 const context={C,Date,Intl,session,state:C.blank(),revision:0,pending:null,refreshing:null,reportReady:false,reportSyncedAt:null,demo:false,busy:false,loading:false,loadError:'',tab:'stock',
  localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  sessionKey:()=> 'test.session',pendingKey:()=> 'test.pending:owner',
  $, $$:()=>[],sync(){},toast(){},errorText:e=>e.message,
  render(){renders.push({ready:context.reportReady,error:context.loadError});},
  request:async path=>{calls.push(path);throw Error('unexpected request');}
 };
 vm.createContext(context);vm.runInContext(functions,context);
 return {c:context,$,store,calls,renders};
}
test('Refresh token bị từ chối 400 trả về đăng nhập, giữ phiếu chưa xác nhận trên thiết bị',async()=>{
 const {c,$,store,calls}=setup();store.set('test.session','old');store.set('test.pending:owner','unconfirmed-receipt');
 c.pending={p_request:'pending'};
 c.request=async path=>{calls.push(path);throw Object.assign(Error('Invalid Refresh Token: Refresh Token Not Found'),{status:400,code:'refresh_token_not_found'});};
 await c.load();
 assert.equal(c.session,null);assert.equal($('#shell').hidden,true);assert.equal($('#gate').hidden,false);assert.match($('#gate-error').textContent,/đăng nhập lại/);assert.equal($('#email').value,'owner@example.test');
 assert.equal(store.has('test.session'),false);assert.equal(store.get('test.pending:owner'),'unconfirmed-receipt');
 assert.deepEqual(calls,['/auth/v1/token?grant_type=refresh_token']);assert.equal(c.loading,false);assert.equal(c.busy,false);
});
test('Lỗi mạng khi làm mới phiên giữ phiên và số liệu đã tải, hiện lỗi để thử lại',async()=>{
 const {c,$}=setup();c.state=snapshot().data;c.reportReady=true;
 c.request=async()=>{throw TypeError('Failed to fetch');};
 await c.load();assert.equal(c.session.user.id,'owner');assert.equal(c.state.products[0].opening,8);assert.equal(c.reportReady,true);
 assert.match(c.loadError,/Kiểm tra mạng/);assert.equal($('#shell').hidden,false);assert.equal(c.loading,false);
});
test('Làm mới phiên thành công đọc lại kho hiện có, không tạo phiếu và không ghi tồn',async()=>{
 const {c,calls}=setup();
 c.request=async path=>{calls.push(path);return path.startsWith('/auth/')?{user:{id:'owner',email:'owner@example.test'},access_token:'new-test-token',refresh_token:'new-test-refresh',expires_in:3600}:snapshot();};
 await c.load();assert.equal(c.revision,7);assert.equal(c.state.products[0].sku,'PU6x4-WT');assert.equal(c.reportReady,true);assert.equal(c.loadError,'');
 assert.deepEqual(calls,['/auth/v1/token?grant_type=refresh_token','/rest/v1/rpc/stock_load']);
});
test('Đổi tài khoản trong lúc refresh không ghi đè phiên mới bằng phiên cũ',async()=>{
 const {c}=setup();let complete;
 c.request=()=>new Promise(resolve=>complete=resolve);
 const loading=c.load();const next={user:{id:'other'},access_token:'other-test',expires_at:Date.now()/1000+3600};c.session=next;
 complete({user:{id:'owner'},access_token:'old-owner-result',expires_in:3600});await loading;
 assert.equal(c.session,next);assert.equal(c.reportReady,false);assert.match(c.loadError,/Tài khoản đã thay đổi/);
});
test('Phản hồi kho của tài khoản cũ không được đưa vào tài khoản mới',async()=>{
 const {c}=setup();c.session.expires_at=Date.now()/1000+3600;let complete;
 c.request=()=>new Promise(resolve=>complete=resolve);
 const loading=c.load();await Promise.resolve();c.session={user:{id:'other'}};complete(snapshot());await loading;
 assert.equal(c.state.products.length,0);assert.equal(c.reportReady,false);assert.match(c.loadError,/Tài khoản đã thay đổi/);
});
test('Lỗi đọc lại sau VERSION_CONFLICT được xử lý và có thể thử lại',async()=>{
 const {c,calls}=setup();c.session.expires_at=Date.now()/1000+3600;c.pending={p_request:'pending'};
 c.request=async path=>{calls.push(path);throw Error(path.endsWith('stock_save')?'VERSION_CONFLICT':'Máy chủ tạm thời không phản hồi');};
 await c.load();assert.equal(c.pending,null);assert.equal(c.busy,false);assert.equal(c.loading,false);assert.match(c.loadError,/Máy chủ tạm thời/);
 assert.deepEqual(calls,['/rest/v1/rpc/stock_save','/rest/v1/rpc/stock_load']);
});
test('Chưa tải kho thành công không cho ghi phiếu từ trạng thái trống',async()=>{
 const {c,calls}=setup();await assert.rejects(c.commit({type:'product',id:'new',sku:'PU6x4-W'}),/Chờ tải dữ liệu/);assert.equal(calls.length,0);assert.equal(c.state.products.length,0);
});
test('Hai lần tải đồng thời chỉ gửi một yêu cầu đọc',async()=>{
 const {c,calls}=setup();c.session.expires_at=Date.now()/1000+3600;let complete;
 c.request=path=>{calls.push(path);return new Promise(resolve=>complete=resolve);};
 const first=c.load();await c.load();await Promise.resolve();complete(snapshot());await first;
 assert.deepEqual(calls,['/rest/v1/rpc/stock_load']);assert.equal(c.revision,7);
});
