'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function portLibre(){return new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});}

test('Universitarios: formulario público -> Admin -> presupuesto sin perder escala y CAD',async t=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-universitarios-'));
 const port=await portLibre(),password='Test-GT3D-universitarios-2026';
 const base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),GT3D_DATA_DIR:dataDir,ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 t.after(()=>{server.kill();fs.rmSync(dataDir,{recursive:true,force:true});});
 let ok=false;
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){ok=true;break;}}catch{}await delay(75);}
 assert.ok(ok,logs);
 let cookie='';
 async function req(method,url,payload,authorized=false){
  const response=await fetch(base+url,{method,headers:{...(payload!==undefined?{'Content-Type':'application/json'}:{}),...(authorized?{cookie}:{})},body:payload!==undefined?JSON.stringify(payload):undefined});
  const raw=await response.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}
  return {status:response.status,body};
 }
 const publicPage=await req('GET','/app.js');assert.equal(publicPage.status,200);
 assert.match(publicPage.body,/Maquetas y proyectos universitarios/);
 assert.doesNotMatch(publicPage.body,/Escala \(si corresponde\)/);
 assert.match(publicPage.body,/¿Tenés una fecha límite\? \(opcional\)/);
 const baseInput={client_name:'Estudiante UNR',phone:'3412345678',email:'universidad@example.com',city:'Rosario',service:'universitarios',description:'Necesito imprimir edificios a escala para la entrega de Arquitectura',quantity:12,material:'PLA',color:'Blanco',desired_date:'2026-12-10',delivery:'Retiro coordinado',privacy_consent:true,
  details:{university:'UNR',career:'Arquitectura',course:'Proyecto Arquitectónico',project_type:'Maqueta arquitectónica',files_ready:'Tengo CAD / planos y necesitan revisión',scale:'1:200',dimensions:'30 × 45 × 10 cm',finish:'Estándar, sin pintar'},files:[{name:'volumen.dwg',mime:'application/octet-stream',data:Buffer.from('DIBUJO DE PRUEBA').toString('base64')}]};
 let order=await req('POST','/api/requests',baseInput);
 assert.equal(order.status,201,JSON.stringify(order.body));
 const id=order.body.id;
 order=await req('POST','/api/requests',{...baseInput,client_name:'Pedido inválido',service:'maquetas-falso'});
 assert.equal(order.status,400,'servicios inválidos siguen rechazados');
 order=await req('POST','/api/requests',{...baseInput,client_name:'Estudiante Ingeniería',description:'Diseño para máquina de ingeniería con planillas de referencia',details:{...baseInput.details,career:'Ingeniería Mecánica',files_ready:'Necesito modelar o adaptar piezas'},files:[{name:'modelo.skp',data:Buffer.from('SKETCHUP').toString('base64')}],quantity:1});
 assert.equal(order.status,201,JSON.stringify(order.body));
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 let admin=await req('GET','/api/admin/state',undefined,true);
 assert.equal(admin.status,200);assert.equal(admin.body.settings.mult_universitarios,1.85);
 assert.equal(admin.body.settings.public_university_days,'5 a 15 días hábiles');
 const found=admin.body.requests.find(x=>x.id===id);assert.ok(found);
 assert.equal(found.service,'universitarios');assert.equal(found.details.scale,'1:200');assert.equal(found.details.university,'UNR');assert.equal(found.details.files_ready,'Tengo CAD / planos y necesitan revisión');
 assert.equal(found.desired_date,'2026-12-10');assert.equal(found.quantity,12);assert.equal(found.files[0].name,'volumen.dwg');
 assert.equal((await req('PATCH','/api/admin/settings',{mult_universitarios:2.0},true)).status,200);
 admin=await req('GET','/api/admin/state',undefined,true);assert.equal(admin.body.settings.mult_universitarios,2);
 const quote=await req('PATCH',`/api/admin/requests/${id}`,{quote:31500,cost:16000,deposit:15750,pricing_service:'universitarios',pricing_multiplier:2,status:'cotizada'},true);
 assert.equal(quote.status,200,JSON.stringify(quote.body));
 admin=await req('GET','/api/admin/state',undefined,true);
 assert.equal(admin.body.requests.find(x=>x.id===id).pricing_service,'universitarios');
 assert.equal(admin.body.requests.find(x=>x.id===id).quote,31500);
 const publicState=await req('GET','/api/public');assert.equal(publicState.status,200);
 assert.equal(publicState.body.settings.public_university_days,'5 a 15 días hábiles');
 assert.ok(!JSON.stringify(publicState.body).includes('Estudiante UNR'),'datos de clientes no se exponen al catálogo público');
 const edit=await req('PATCH','/api/admin/settings',{public_pla_days:'3 a 8 días hábiles',public_design_days:'20 a 30 días hábiles'},true);
 assert.equal(edit.status,200);
 assert.equal((await req('GET','/api/public')).body.settings.public_university_days,'5 a 15 días hábiles','plazo universitario no depende de otros servicios');
 const uniEdit=await req('PATCH','/api/admin/settings',{public_university_days:'6 a 14 días hábiles'},true);
 assert.equal(uniEdit.status,200);
 assert.equal((await req('GET','/api/public')).body.settings.public_university_days,'6 a 14 días hábiles','edición universitaria se publica');
});

test('Universitarios: la web presenta el plazo único y Admin muestra sus campos',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const marker of ["'universitarios'",'universitarios','Maqueta arquitectónica','Maqueta urbana','Piezas para maqueta','Sin definir','mult_universitarios'])assert.ok(app.includes(marker),marker);
 assert.match(app,/Maquetas y proyectos universitarios \(con o sin modelado\)/);
 assert.match(index,/maquetas para Arquitectura/);
});
