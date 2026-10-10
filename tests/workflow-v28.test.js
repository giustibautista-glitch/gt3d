'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function newPort(){return new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});}
test('V2.8: pedido real de inicio a entrega, bloqueos de anticipo, stock y saldo',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-v28-'));
 const port=await newPort(),pwd='Test-Strong-GT3D-2026';
 const srv=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),GT3D_DATA_DIR:temp,ADMIN_PASSWORD:pwd},stdio:['ignore','pipe','pipe']});
 t.after(()=>{srv.kill();fs.rmSync(temp,{force:true,recursive:true});});
 let stderr='';srv.stderr.on('data',x=>stderr+=x);
 const base=`http://127.0.0.1:${port}`;
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(80);}
 let cookie='';const req=async(method,p,b=null,admin=true)=>{
  let res=await fetch(base+p,{method,headers:{...(b?{'Content-Type':'application/json'}:{}),...(admin?{cookie}:{})},body:b?JSON.stringify(b):undefined});
  return {status:res.status,data:await res.json().catch(()=>({}))};
 };
 const input={client_name:'Ana Cliente',phone:'3415555555',email:'ana@example.com',city:'Rosario',privacy_consent:true,service:'impresion',description:'Quiero dos soportes técnicos para una repisa.',quantity:2,material:'PLA',color:'Negro',details:{dimensions:'50 mm',usage:'Funcional'},files:[]};
 const publicOrder=await req('POST','/api/requests',input,false);assert.equal(publicOrder.status,201);
 const id=publicOrder.data.id;
 assert.equal((await req('POST','/api/login',{password:pwd},false)).status,200);
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pwd})});
 cookie=login.headers.get('set-cookie').split(';')[0];
 const admin=await req('GET','/api/admin/state');assert.equal(admin.status,200);
 assert.equal(admin.data.requests[0].details.dimensions,'50 mm');
 assert.equal(admin.data.requests[0].internal_notes,'');
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{internal_notes:'Cliente necesita encastre limpio, ajustar prototipo'})).status,200);
 const publicData=await req('GET','/api/public',null,false);
 assert.ok(!JSON.stringify(publicData.data).includes('Cliente necesita encastre limpio'));
 // 1. quoted from client, cash not allowed for deposit
 const inventory=await req('POST','/api/admin/inventory',{category:'filamento',name:'PLA negro bobina real',material:'PLA',color:'Negro',unit:'g',stock:150,min_stock:20,cost_unit:22});
 assert.equal(inventory.status,201);
 const fil=inventory.data.id;
 const quote={quote:15000,cost:7500,deposit:7500,grams:120,filament_id:fil,print_hours:2.5,status:'cotizada'};
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,quote)).status,200);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{client_approved:1})).status,200);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{quote:15100})).status,200);
 assert.equal((await req('GET','/api/admin/state')).data.requests.find(x=>x.id===id).client_approved,0,'Cambiar el precio exige nueva aprobación');
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{quote:15000})).status,200);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'confirmada'})).status,409,'No debe confirmar sin transferencia');
 assert.equal((await req('POST','/api/admin/payments',{request_id:id,kind:'anticipo',amount:7500,method:'Efectivo',date:'2026-10-09'})).status,400);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'esperando_anticipo'})).status,200);
 assert.equal((await req('POST','/api/admin/payments',{request_id:id,kind:'anticipo',amount:5000,method:'Transferencia',date:'2026-10-09'})).status,201);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'confirmada'})).status,409,'Transferencia parcial no habilita producción');
 assert.equal((await req('POST','/api/admin/payments',{request_id:id,kind:'anticipo',amount:2500,method:'Transferencia',date:'2026-10-09'})).status,201);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'confirmada'})).status,409,'Cliente debe haber aprobado');
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'confirmada',client_approved:1})).status,200);
 let state=(await req('GET','/api/admin/state')).data;
 assert.equal(state.inventory.find(x=>x.id===fil).reserved,120);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'lista',actual_grams:115})).status,200);
 state=(await req('GET','/api/admin/state')).data;
 assert.equal(state.inventory.find(x=>x.id===fil).stock,35);
 assert.equal(state.inventory.find(x=>x.id===fil).reserved,0);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'entregado'})).status,409);
 assert.equal((await req('POST','/api/admin/payments',{request_id:id,kind:'saldo',amount:7600,method:'Efectivo',date:'2026-10-09'})).status,409,'No permite registrar más que saldo');
 assert.equal((await req('POST','/api/admin/payments',{request_id:id,kind:'saldo',amount:7500,method:'Efectivo',date:'2026-10-09'})).status,201);
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'entregado'})).status,200);
 state=(await req('GET','/api/admin/state')).data;
 assert.equal(state.requests.find(x=>x.id===id).status,'entregado');
 assert.equal(state.inventory.find(x=>x.id===fil).stock,35,'No se consume dos veces');
 assert.equal((await req('PATCH',`/api/admin/requests/${id}`,{status:'lista'})).status,409,'Un pedido entregado no se reabre accidentalmente');
 assert.ok(state.events.filter(e=>e.request_id===id).some(e=>e.kind==='pago'),'El historial conserva pagos');
 assert.ok(state.events.filter(e=>e.request_id===id).some(e=>e.kind==='estado'),'El historial conserva estados');
 // 2. Reserve clash stock and malformed operations
 const another=await req('POST','/api/requests',{...input,client_name:'Cliente 2',phone:'3416666677',description:'Necesito una copia de la pieza para mañana'},false);
 assert.equal(another.status,201);
 const id2=another.data.id;
 assert.equal((await req('PATCH',`/api/admin/requests/${id2}`,{quote:8000,cost:4000,deposit:4000,grams:90,print_hours:2,filament_id:fil,status:'cotizada'})).status,200);
 assert.equal((await req('POST','/api/admin/payments',{request_id:id2,kind:'anticipo',amount:4000,method:'Transferencia',date:'2026-10-09'})).status,201);
 assert.equal((await req('PATCH',`/api/admin/requests/${id2}`,{status:'confirmada',client_approved:1})).status,409,'Faltan 90g físicos');
 assert.equal((await req('GET','/api/admin/state')).data.requests.find(x=>x.id===id2).status,'cotizada','No mutar estado en fallo');
 // 3. Producto oculto (foto original) no accesible por URL alternativa
 assert.equal((await req('PATCH','/api/admin/products/1',{active:0})).status,200);
 assert.equal((await fetch(base+'/api/product-image/1')).status,404);
 assert.equal((await fetch(base+'/assets/catalog/01.webp')).status,404);
 assert.equal((await fetch(base+'/assets/catalog/01.webp',{headers:{cookie}})).status,200);
 assert.ok(!stderr.includes('Error [SQLITE'),stderr);
});

test('V2.8: archivos frontend contienen bandeja, WhatsApp del cliente y cotizador seguro',()=>{
 const a=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 assert.match(a,/Bandeja de próximas acciones/);
 assert.match(a,/case 'order-wa':\{let r=.*whatsappTo\(r\.phone/);
 assert.match(a,/Anticipo \(transferencia\)/);
 assert.match(a,/data-action="order-add-payment"/);
 assert.match(a,/if\(q\.grams>0&&!n\(q\.filament_id\)\)/);
 assert.match(a,/internal_notes/);
});
