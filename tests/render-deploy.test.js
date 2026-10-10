'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');

const delay = ms => new Promise(r=>setTimeout(r,ms));
const freePort = () => new Promise(resolve => {const s=net.createServer();s.listen(0, '127.0.0.1', ()=>{const p=s.address().port;s.close(()=>resolve(p));});});

async function boot(env, port){
 const child=spawn(process.execPath, ['server.js'], {cwd:root, env:{...process.env, ...env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',c=>log+=c);child.stderr.on('data',c=>log+=c);
 for(let i=0;i<80;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.status===200)return {child,log:()=>log};}catch{}
  if(child.exitCode!==null)throw new Error('No inició: '+log);
  await delay(60);
 }
 child.kill();throw new Error('Tiempo de espera agotado: '+log);
}

test('Render production: requiere claves fuera del código, no publica admin sin ellas', async()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-prod-reject-'));
 try{
  const proc=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,NODE_ENV:'production',GT3D_DATA_DIR:d,ADMIN_PASSWORD:'',SESSION_SECRET:''},stdio:['ignore','pipe','pipe']});
  let logs='';proc.stderr.on('data',x=>logs+=x);
  const code=await new Promise(resolve=>proc.once('exit',resolve));
  assert.notEqual(code,0);
  assert.match(logs,/ADMIN_PASSWORD/);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});

test('Render demo: health, noindex, banner, solicitud y Admin con cookie Secure', async t=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-render-test-'));
 const port=await freePort();
 const booted=await boot({NODE_ENV:'production',GT3D_DEMO_MODE:'1',GT3D_DATA_DIR:d,ADMIN_PASSWORD:'ClavePrivadaRenderDemoPruebas2026',SESSION_SECRET:'secreto-largo-fijo-para-conservar-la-sesion-de-pruebas-2026'},port);
 t.after(async()=>{booted.child.kill();await delay(100);fs.rmSync(d,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${port}`;
 const health=await (await fetch(url+'/api/health')).json();assert.equal(health.demo,true);
 const robots=await fetch(url+'/robots.txt');assert.equal(robots.status,200);assert.match(await robots.text(),/Disallow: \//);
 const page=await fetch(url+'/');assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);
 const pub=await (await fetch(url+'/api/public')).json();assert.equal(pub.demo,true);assert.ok(pub.products.length>0);
 const js=await (await fetch(url+'/app.js')).text();assert.match(js,/Sitio de prueba de GT-3D/);
 const post=await fetch(url+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Cliente ficticio',phone:'3411234567',service:'universitarios',description:'Maqueta universitaria para probar formulario',color:'Negro',privacy_consent:true,quantity:1,files:[]})});assert.equal(post.status,201);
 const login=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-proto':'https'},body:JSON.stringify({password:'ClavePrivadaRenderDemoPruebas2026'})});assert.equal(login.status,200);
 assert.match(login.headers.get('set-cookie'),/Secure/);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(url+'/api/admin/state')).status,401);
 const admin=await (await fetch(url+'/api/admin/state',{headers:{Cookie:cookie}})).json();assert.ok(admin.requests.length>=1);
});
