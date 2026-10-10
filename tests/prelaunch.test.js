'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');

async function boot(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-prelaunch-'));
  const server=http.createServer(()=>{});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;server.close();
  const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'SuperClaveAuditoriaV23!',GT3D_DATA_DIR:temp},stdio:['ignore','pipe','pipe']});
  const base=`http://localhost:${port}`;
  let output='';child.stdout.on('data',b=>output+=b.toString());child.stderr.on('data',b=>output+=b.toString());
  for(let n=0;n<100;n++){
   try{const r=await fetch(base+'/api/health');if(r.ok)return {base,temp,child,output:()=>output};}catch{}
   if(child.exitCode!==null)throw Error('Servidor detenido: '+output);
   await new Promise(r=>setTimeout(r,40));
  }
  throw Error('No inicia servidor: '+output);
}

async function request(base,url,method='GET',data,cookie){
 const options={method,headers:{...(cookie?{'Cookie':cookie}:{})}};
 if(data!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(data);}
 const r=await fetch(base+url,options);const raw=Buffer.from(await r.arrayBuffer());let json;
 try{json=JSON.parse(raw.toString('utf8'));}catch{}
 return {status:r.status,json,headers:r.headers,raw};
}

test('pruebas de prepublicación: acceso, respaldo, fotos privadas y transacciones',async()=>{
 const {base,temp,child,output}=await boot();
 try{
  let r=await request(base,'/api/admin/state');assert.equal(r.status,401);
  let pub=await request(base,'/api/public');assert.equal(pub.status,200);assert.equal(pub.json.settings.whatsapp,'5493412140690');
  const staticJS=await request(base,'/app.js?v=2.3.0');assert.equal(staticJS.status,200);assert.match(staticJS.headers.get('cache-control'),/no-cache/);
  const login=await request(base,'/api/login','POST',{password:'SuperClaveAuditoriaV23!'});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const state=await request(base,'/api/admin/state','GET',undefined,cookie);assert.equal(state.status,200);
  assert.equal(state.json.settings.model_rate,12000);
  // Foto oculta: no puede filtrarse a visitantes. Admin puede usarla para editar.
  const hidden=await request(base,'/api/admin/products/1','PATCH',{active:0},cookie);assert.equal(hidden.status,200);
  assert.equal((await request(base,'/api/product-image/1')).status,404);
  assert.equal((await request(base,'/api/product-image/1','GET',undefined,cookie)).status,200);
  // Archivos adjuntos protegidos y parte del respaldo.
  const created=await request(base,'/api/requests','POST',{client_name:'Prueba Final',phone:'3411234567',description:'Pieza para prueba de respaldo',service:'impresion',color:'Gris',privacy_consent:true,files:[{name:'modelo.stl',mime:'application/octet-stream',data:Buffer.from('solid gt3d\nendsolid gt3d').toString('base64')}]});
  assert.equal(created.status,201);
  const state2=(await request(base,'/api/admin/state','GET',undefined,cookie)).json;
  const rec=state2.requests.find(x=>x.id===created.json.id);assert.ok(rec);assert.equal(rec.files.length,1);
  assert.equal((await request(base,'/api/admin/files/'+rec.files[0].id)).status,401);
  assert.equal((await request(base,'/api/admin/files/'+rec.files[0].id,'GET',undefined,cookie)).status,200);
  // Cambio parcialmente inválido jamás deja media configuración guardada.
  r=await request(base,'/api/admin/settings','PATCH',{model_rate:13000,mult_impresion:-3},cookie);
  assert.equal(r.status,400);
  assert.equal((await request(base,'/api/admin/state','GET',undefined,cookie)).json.settings.model_rate,12000);
  // Calendario: si falla una inserción, no borra la disponibilidad anterior.
  const machines=state2.machines;assert.ok(machines.length);
  const mid=machines[0].id;
  r=await request(base,'/api/admin/weekly','POST',{machine_id:mid,shifts:[{weekday:1,start:'09:00',end:'17:00'}]},cookie);assert.equal(r.status,200);
  r=await request(base,'/api/admin/shifts','POST',{machine_id:mid,date:'2026-11-02',shifts:[{start:'09:00',end:'18:00'}]},cookie);assert.equal(r.status,200);
  const shiftsBefore=(await request(base,'/api/admin/state','GET',undefined,cookie)).json.shifts.filter(x=>x.date==='2026-11-02');assert.equal(shiftsBefore.length,1);
  r=await request(base,'/api/admin/shifts','POST',{machine_id:mid,date:'2026-11-02',shifts:[{start:'08:00',end:'16:00'},{start:'08:00',end:'16:00'}]},cookie);
  assert.equal(r.status,500);
  const shiftsAfter=(await request(base,'/api/admin/state','GET',undefined,cookie)).json.shifts.filter(x=>x.date==='2026-11-02');assert.deepEqual(shiftsAfter.map(x=>x.start_time),['09:00']);
  // El backup debe ser un SQLite válido y contener el pedido y sus adjuntos.
  const backup=await request(base,'/api/admin/backup','GET',undefined,cookie);
  assert.equal(backup.status,200,'Respaldo fallido: '+backup.raw.toString());
  assert.ok(backup.raw.subarray(0,16).toString().startsWith('SQLite format 3'));
  const restored=path.join(temp,'verificacion-restauracion.sqlite');fs.writeFileSync(restored,backup.raw);
  const db=new DatabaseSync(restored,{readOnly:true});
  assert.equal(db.prepare('SELECT count(*) c FROM requests').get().c,1);
  assert.equal(db.prepare('SELECT count(*) c FROM uploads').get().c,1);
  db.close();
  await request(base,'/api/logout','POST',{},cookie);
  assert.equal((await request(base,'/api/admin/state','GET',undefined,cookie)).status,401);
  console.log('PASS prelaunch: sesión, privacidad fotos/archivos, rollback, copia SQLite/restauración, logout.');
 }finally{
  child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,1600)});
  fs.rmSync(temp,{recursive:true,force:true});
 }
},{timeout:15000});
