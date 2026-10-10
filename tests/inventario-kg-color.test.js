'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'..');
const port=()=>new Promise(ok=>{const srv=net.createServer();srv.listen(0,'127.0.0.1',()=>{let p=srv.address().port;srv.close(()=>ok(p));});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('kg/$por kg: stock, costo, movimientos, validación de color y migración antigua',async t=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-kg-'));let ps=null;
 t.after(async()=>{if(ps&&!ps.killed)ps.kill();fs.rmSync(dataDir,{recursive:true,force:true});});
 async function boot(){const p=await port();ps=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(p),GT3D_DATA_DIR:dataDir,ADMIN_PASSWORD:'Prueba-Filamentos-2026'},stdio:'pipe'});const base=`http://127.0.0.1:${p}`;for(let x=0;x<80;x++){try{if((await fetch(base+'/api/health')).ok)return base;}catch{}await sleep(60)}throw Error('Servidor no inició');}
 const base=await boot();let cookie='';
 async function api(method,route,payload,host=base){const res=await fetch(host+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:payload?JSON.stringify(payload):undefined});return {status:res.status,data:await res.json()};}
 let o=await api('POST','/api/requests',{client_name:'Sin color',phone:'3411234567',description:'Quiero imprimir un soporte para la oficina',service:'impresion',privacy_consent:true});assert.equal(o.status,400);
 o=await api('POST','/api/requests',{client_name:'Con varios colores',phone:'3411234567',description:'Quiero imprimir un soporte con dos colores diferentes',service:'impresion',color:'Varios colores, aclarar por WhatsApp',privacy_consent:true});assert.equal(o.status,201,JSON.stringify(o.data));
 o=await api('POST','/api/requests',{client_name:'Solo diseño',phone:'3411234567',description:'Quiero un diseño digital sin fabricación',service:'modelado',privacy_consent:true});assert.equal(o.status,201,JSON.stringify(o.data));
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'Prueba-Filamentos-2026'})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const invalid=await api('POST','/api/admin/inventory',{category:'filamento',name:'Bobina sin color',material:'PLA',unit:'kg',stock:1,min_stock:0.2,cost_unit:25000});assert.equal(invalid.status,400);
 const fil=await api('POST','/api/admin/inventory',{category:'filamento',name:'Bobina PLA blanco',material:'PLA',color:'Blanco',unit:'kg',stock:1,min_stock:.2,cost_unit:25000});assert.equal(fil.status,201,JSON.stringify(fil.data));const id=fil.data.id;
 assert.equal(fil.data.unit,'g');assert.equal(fil.data.stock,1000);assert.equal(fil.data.min_stock,200);assert.equal(fil.data.cost_unit,25);
 let state=(await api('GET','/api/admin/state')).data;let item=state.inventory.find(x=>x.id===id);assert.equal(item.stock,1000);assert.equal(item.cost_unit*100,2500,'100 g equivalen a $2500');
 o=await api('POST','/api/admin/move',{inventory_id:id,unit:'kg',amount:.5,reason:'Compré media bobina'});assert.equal(o.status,200,JSON.stringify(o.data));assert.equal(o.data.stock,1500);
 o=await api('POST','/api/admin/move',{inventory_id:id,unit:'kg',amount:-.25,reason:'Uso de 250 gramos'});assert.equal(o.status,200);assert.equal(o.data.stock,1250);
 o=await api('POST','/api/admin/move',{inventory_id:id,unit:'kg',amount:-3,reason:'Uso imposible'});assert.equal(o.status,400);
 state=(await api('GET','/api/admin/state')).data;item=state.inventory.find(x=>x.id===id);assert.equal(item.stock,1250);
 // Simular la bobina de versiones anteriores que se había almacenado con unidad 'kg'.
 await new Promise(resolve=>{ps.once('exit',resolve);ps.kill();});ps=null;
 const db=new DatabaseSync(path.join(dataDir,'gt3d.sqlite'));
 const oldid=Number(db.prepare("INSERT INTO inventory(category,name,material,color,unit,stock,min_stock,cost_unit,created_at) VALUES('filamento','Bobina antigua','PETG','Negro','kg',1.2,.1,30000,'2026-10-10')").run().lastInsertRowid);
 db.prepare("INSERT INTO inventory_moves(inventory_id,amount,reason,created_at) VALUES(?,?,?,?)").run(oldid,.2,'Antes de migrar','2026-10-10');db.close();
 const b2=await boot();const after=await api('GET','/api/admin/state',null,b2);assert.equal(after.status,200);
 const old=after.data.inventory.find(x=>x.id===oldid);assert.equal(old.unit,'g');assert.equal(old.stock,1200);assert.equal(old.min_stock,100);assert.equal(old.cost_unit,30);
 assert.equal(after.data.moves.find(x=>x.inventory_id===oldid).amount,200);
});

test('el formulario de impresión pide color y el inventario presenta kg y $/kg',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/name=\\?"color\\?" required/);
 assert.match(app,/Varios colores, aclarar por WhatsApp/);
 assert.match(app,/Precio por kilogramo \(\$\/kg\)/);
 assert.match(app,/inventoryQuantityText\(x,'stock'\)/);
 assert.match(app,/inventoryQuantityText\(item,'stock'\)/);
});
