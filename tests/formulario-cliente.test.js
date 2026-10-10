'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const port=()=>new Promise(done=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>done(p));});});
test('Formularios: campos opcionales claros, fecha sin definir y no cobrar hasta aceptar',()=>{
 const form=app.slice(app.indexOf('function requestFields(service)'),app.indexOf('function openRequest(service'));
 for(const text of ['Sin definir','(opcional)','request-date-wrapper','Agregar más detalles','Cantidad de piezas *','WhatsApp con característica *','Sin pagar','no hacemos envíos a domicilio']) assert.ok(form.toLowerCase().includes(text.toLowerCase()),text);
 assert.match(form,/date\.disabled=!enabled/);
 assert.match(form,/date\.required=enabled/);
 assert.match(form,/Archivos o fotos \(opcional\)|Adjuntar archivos o fotos \(opcional\)/);
 assert.doesNotMatch(form,/selectField\('Entrega'/);
});
test('Servidor guarda Sin definir como fecha vacía y admite fecha concreta, pero rechaza fechas y cantidades inválidas',async t=>{
 const datadir=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-form-'));
 const p=await port();const ps=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(p),GT3D_DATA_DIR:datadir,ADMIN_PASSWORD:'SecureTestPassword123'},stdio:'pipe'});
 t.after(()=>{ps.kill();fs.rmSync(datadir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${p}`;let alive=false;
 for(let i=0;i<70;i++){try{if((await fetch(base+'/api/health')).ok){alive=true;break;}}catch{}await new Promise(r=>setTimeout(r,70));}
 assert.ok(alive,'El servidor no inició');
 const submit=async payload=>{const res=await fetch(base+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return {code:res.status,json:await res.json()}};
 const baseInput={client_name:'Cliente de prueba',phone:'3415557777',service:'universitarios',description:'Necesito fabricar piezas para una maqueta universitaria',quantity:3,color:'Varios colores, aclarar por WhatsApp',privacy_consent:true,delivery:'Retiro coordinado',files:[]};
 const none=await submit({...baseInput,desired_date:''});assert.equal(none.code,201,JSON.stringify(none.json));
 const dated=await submit({...baseInput,desired_date:'2027-03-10'});assert.equal(dated.code,201,JSON.stringify(dated.json));
 for(const invalid of [{...baseInput,desired_date:'2024-01-01'},{...baseInput,desired_date:'2027-02-30'},{...baseInput,quantity:0},{...baseInput,quantity:1.5},{...baseInput,quantity:10001}]){
  const result=await submit(invalid);assert.equal(result.code,400,JSON.stringify(result.json));
 }
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'SecureTestPassword123'})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];const admin=await (await fetch(base+'/api/admin/state',{headers:{Cookie:cookie}})).json();
 assert.equal(admin.requests.find(r=>r.id===none.json.id).desired_date,'');
 assert.equal(admin.requests.find(r=>r.id===none.json.id).city,'','La ciudad no debe inventarse cuando el cliente no la informó');
 assert.equal(admin.requests.find(r=>r.id===dated.json.id).desired_date,'2027-03-10');
});
