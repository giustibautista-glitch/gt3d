'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');

function portLibre(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function serverWithDesignDays(plazo){
 const baseDir=fs.mkdtempSync(path.join(os.tmpdir(),'gt3d-plazos-'));
 const folder=path.resolve(__dirname,'..');
 for(const f of ['server.js','app.js','index.html','styles.css'])fs.copyFileSync(path.join(folder,f),path.join(baseDir,f));
 if(plazo){
  const dataDir=path.join(baseDir,'data');fs.mkdirSync(dataDir);
  const db=new DatabaseSync(path.join(dataDir,'gt3d.sqlite'));
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('public_design_days',JSON.stringify(plazo));
  db.close();
 }
 const port=await portLibre();const proc=spawn(process.execPath,['server.js'],{cwd:baseDir,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'Clave-Segura-Para-Test-2026'},stdio:'pipe'});
 let log='';proc.stdout.on('data',d=>log+=d);proc.stderr.on('data',d=>log+=d);
 let response;
 for(let i=0;i<60;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/api/public`);if(r.ok){response=await r.json();break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 return {response,log,cleanup:()=>{proc.kill('SIGTERM');fs.rmSync(baseDir,{recursive:true,force:true});}};
}

test('instalación nueva: modelado 5 a 15 días; impresión y catálogo no cambian',async()=>{
 const p=await serverWithDesignDays();
 try{assert.ok(p.response,p.log);const s=p.response.settings;assert.equal(s.public_design_days,'5 a 15 días hábiles');assert.equal(s.public_university_days,'5 a 15 días hábiles');assert.equal(s.public_pla_days,'5 a 10 días hábiles');assert.equal(s.public_catalog_days,'2 a 3 días hábiles');}finally{p.cleanup();}
});
test('actualización de V2.6: migrar plazo de modelado anterior',async()=>{
 const p=await serverWithDesignDays('5 a 10 días hábiles');
 try{assert.ok(p.response,p.log);assert.equal(p.response.settings.public_design_days,'5 a 15 días hábiles');}finally{p.cleanup();}
});
test('respetar plazo modificado manualmente por administración',async()=>{
 const p=await serverWithDesignDays('7 a 20 días hábiles');
 try{assert.ok(p.response,p.log);assert.equal(p.response.settings.public_design_days,'7 a 20 días hábiles');assert.equal(p.response.settings.public_university_days,'5 a 15 días hábiles');}finally{p.cleanup();}
});
test('texto público distingue trabajos con modelado y con archivo listo',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 for(const name of ['Diseño y modelado','Modelado + impresión','Repuestos con modelado','Prototipos con modelado']){
  assert.ok(app.includes(name+'</span><small>${esc(s.public_design_days)}'),name);
 }
 assert.match(app,/Impresión con archivo listo<\/span><small>\$\{esc\(s\.public_pla_days\)\}/);
});

test('plazo único universitario es independiente de otros servicios',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
 assert.match(app,/Maquetas y proyectos universitarios \(con o sin modelado\)<\/span><small>\$\{esc\(s\.public_university_days/);
 assert.match(app,/Plazo web maquetas y proyectos universitarios \(con o sin modelado\)/);
 assert.match(app,/5 a 15 días hábiles, con o sin modelado/);
 assert.match(server,/public_university_days:'5 a 15 días hábiles'/);
 assert.match(server,/public_university_days:s\.public_university_days/);
});
