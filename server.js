'use strict';
// GT-3D V1: servidor Node.js 22+ sin dependencias externas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync, backup } = require('node:sqlite');
const ROOT = __dirname, DATA = path.resolve(process.env.GT3D_DATA_DIR || path.join(ROOT,'data'));
const IS_DEMO = process.env.GT3D_DEMO_MODE === '1';
// Nunca publicar el administrador con contraseñas aleatorias ligadas al disco efímero.
if(process.env.NODE_ENV === 'production') {
 if(!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Configurar ADMIN_PASSWORD (mínimo 12 caracteres) en Render, nunca en GitHub.');
 if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Configurar SESSION_SECRET (mínimo 32 caracteres) en Render.');
}

fs.mkdirSync(DATA,{recursive:true});
const DB = new DatabaseSync(path.join(DATA,'gt3d.sqlite'));
DB.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
DB.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,client_name TEXT,phone TEXT,email TEXT,city TEXT,service TEXT,description TEXT,quantity INTEGER DEFAULT 1,material TEXT,color TEXT,desired_date TEXT,delivery TEXT,details TEXT DEFAULT '{}',status TEXT DEFAULT 'nueva',created_at TEXT,updated_at TEXT,quote REAL DEFAULT 0,cost REAL DEFAULT 0,model_hours REAL DEFAULT 0,print_hours REAL DEFAULT 0,grams REAL DEFAULT 0,actual_grams REAL DEFAULT 0,accessories TEXT DEFAULT '[]',machine_id INTEGER DEFAULT 1,deposit REAL DEFAULT 0,delivery_fee REAL DEFAULT 0,due_date TEXT,planned_start TEXT,planned_end TEXT,review_token TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS uploads(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id INTEGER NOT NULL,name TEXT,mime TEXT,bytes BLOB,created_at TEXT,FOREIGN KEY(request_id) REFERENCES requests(id));
CREATE TABLE IF NOT EXISTS inventory(id INTEGER PRIMARY KEY AUTOINCREMENT,category TEXT,name TEXT,material TEXT,color TEXT,unit TEXT,stock REAL DEFAULT 0,min_stock REAL DEFAULT 0,cost_unit REAL DEFAULT 0,created_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_moves(id INTEGER PRIMARY KEY AUTOINCREMENT,inventory_id INTEGER,request_id INTEGER,amount REAL,reason TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS filament_prices(id INTEGER PRIMARY KEY AUTOINCREMENT,brand TEXT NOT NULL,material TEXT NOT NULL,color TEXT DEFAULT '',kg_price REAL NOT NULL DEFAULT 0,source TEXT DEFAULT '',url TEXT DEFAULT '',observed_at TEXT DEFAULT '',notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id INTEGER,kind TEXT,amount REAL,method TEXT,description TEXT,date TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS request_events(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id INTEGER NOT NULL,kind TEXT NOT NULL,summary TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(request_id) REFERENCES requests(id));
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY AUTOINCREMENT,category TEXT,description TEXT,amount REAL,date TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS machines(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,status TEXT DEFAULT 'activa',cost_hour REAL DEFAULT 300,buffer_pct REAL DEFAULT 20,setup_minutes REAL DEFAULT 30,notes TEXT);
CREATE TABLE IF NOT EXISTS weekly(id INTEGER PRIMARY KEY AUTOINCREMENT,machine_id INTEGER,weekday INTEGER,start_time TEXT,end_time TEXT);
CREATE TABLE IF NOT EXISTS day_shifts(id INTEGER PRIMARY KEY AUTOINCREMENT,machine_id INTEGER,date TEXT,start_time TEXT,end_time TEXT,UNIQUE(machine_id,date,start_time,end_time));
CREATE TABLE IF NOT EXISTS day_overrides(id INTEGER PRIMARY KEY AUTOINCREMENT,machine_id INTEGER,date TEXT,UNIQUE(machine_id,date));
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,category TEXT,description TEXT,price REAL DEFAULT 0,emoji TEXT DEFAULT '◈',active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id INTEGER UNIQUE,name TEXT,rating INTEGER,comment TEXT,status TEXT DEFAULT 'pendiente',created_at TEXT,reply TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS product_photos(product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,mime TEXT NOT NULL,bytes BLOB NOT NULL,updated_at TEXT NOT NULL);
`);
// Unidades canónicas: filamentos siempre en gramos y $/gramo dentro de la base de datos.
// Si había bobinas registradas en kg en una versión anterior, convertir sus saldos y movimientos
// UNA sola vez; la propia unidad='g' impide repetir la migración en el próximo arranque.
const oldKgFilaments=DB.prepare("SELECT id FROM inventory WHERE category='filamento' AND unit='kg'").all();
if(oldKgFilaments.length){
 DB.exec('BEGIN IMMEDIATE');
 try{
  for(const {id} of oldKgFilaments){
   DB.prepare("UPDATE inventory SET stock=ROUND(stock*1000,3),min_stock=ROUND(min_stock*1000,3),cost_unit=cost_unit/1000,unit='g' WHERE id=?").run(id);
   DB.prepare('UPDATE inventory_moves SET amount=ROUND(amount*1000,3) WHERE inventory_id=?').run(id);
  }
  DB.exec('COMMIT');
 }catch(e){DB.exec('ROLLBACK');throw e;}
}
// Migraciones aditivas para stock vinculado a pedidos.
const requestColumns=DB.prepare('PRAGMA table_info(requests)').all().map(x=>x.name);
if(!requestColumns.includes('filament_id'))DB.exec('ALTER TABLE requests ADD COLUMN filament_id INTEGER DEFAULT NULL');
if(!requestColumns.includes('stock_applied'))DB.exec('ALTER TABLE requests ADD COLUMN stock_applied INTEGER DEFAULT 0');
if(!requestColumns.includes('internal_notes'))DB.exec("ALTER TABLE requests ADD COLUMN internal_notes TEXT NOT NULL DEFAULT ''");
if(!requestColumns.includes('client_approved'))DB.exec('ALTER TABLE requests ADD COLUMN client_approved INTEGER NOT NULL DEFAULT 0');
for(const [column,sql] of Object.entries({pricing_multiplier:'REAL DEFAULT NULL',pricing_service:'TEXT DEFAULT NULL',pricing_bulk:'INTEGER DEFAULT 0',pricing_manual:'INTEGER DEFAULT 0'})){if(!requestColumns.includes(column))DB.exec(`ALTER TABLE requests ADD COLUMN ${column} ${sql}`);}
const defaults={brand:'GT-3D',tagline:'Tus ideas, hechas realidad.',city:'Rosario y alrededores',whatsapp:'5493412140690',instagram:'https://www.instagram.com/gt3d.impresiones/',email:'gt3drosario@gmail.com',pickup:'Retiro coordinado en Rosario; ubicación a convenir',delivery_note:'Por ahora no realizamos entregas a domicilio. Solo retiro coordinado.',business_hours:'Días hábiles de 8:00 a 19:00',model_rate:12000,min_model:8000,labor_rate:5000,labor_default_minutes:15,min_print:3500,model_cost_rate:5000,profit_margin:35,mult_impresion:1.85,mult_modelado:1,mult_modelado_impresion:1.85,mult_repuestos:2.20,mult_prototipos:2,mult_universitarios:1.85,mult_catalogo:2.10,mult_mayorista:1.8,bulk_min_quantity:10,bulk_mid_quantity:25,bulk_high_quantity:50,bulk_discount_first:5,bulk_discount_mid:10,bulk_discount_high:18,deposit_pct:50,quote_validity:5,material_waste_pct:8,public_pla_days:'5 a 10 días hábiles',public_design_days:'5 a 15 días hábiles',public_university_days:'5 a 15 días hábiles',public_catalog_days:'2 a 3 días hábiles'};
for(const [k,v] of Object.entries(defaults)) DB.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)').run(k,JSON.stringify(v));
// Actualización V2.7: cambiar el plazo anterior de modelado solo si sigue en su valor predeterminado.
// Conservar un plazo que haya sido editado manualmente desde Admin.
if(!DB.prepare("SELECT value FROM settings WHERE key='modelado_plazo_version'").get()){
 const existing=DB.prepare("SELECT value FROM settings WHERE key='public_design_days'").get();
 if(existing && JSON.parse(existing.value)==='5 a 10 días hábiles'){
  DB.prepare("UPDATE settings SET value=? WHERE key='public_design_days'").run(JSON.stringify('5 a 15 días hábiles'));
 }
 DB.prepare("INSERT INTO settings(key,value) VALUES (?,?)").run('modelado_plazo_version',JSON.stringify('2.7'));
}
// Migrar solo tarifas que coincidan con los valores por defecto de V1.4, sin tocar personalizaciones.
if(!DB.prepare("SELECT value FROM settings WHERE key='pricing_scheme_version'").get()){
 const changes={mult_impresion:[2,1.85],mult_modelado_impresion:[2.5,1.85],mult_repuestos:[3,2.2],mult_prototipos:[2.5,2],mult_catalogo:[2.5,2.1]};
 for(const [k,[oldRate,newRate]] of Object.entries(changes)){
  const current=DB.prepare('SELECT value FROM settings WHERE key=?').get(k);
  if(current&&Number(JSON.parse(current.value))===oldRate)DB.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(newRate),k);
 }
 DB.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('pricing_scheme_version',JSON.stringify('1.5'));
}
if (!DB.prepare('SELECT count(*) n FROM machines').get().n) {
 const id=DB.prepare('INSERT INTO machines(name,status,cost_hour,buffer_pct,setup_minutes) VALUES (?,?,?,?,?)').run('Hellbot Magna 1 V2','activa',400,20,30).lastInsertRowid;
 // La disponibilidad comienza vacía: se configura día por día en GT-3D Admin.
}
if (!DB.prepare('SELECT count(*) n FROM products').get().n) {
 const items=[["Llavero QR de Spotify", "Llaveros", "Para vincular una canción o playlist de Spotify.", 0, "◈"], ["Llavero con nombre o fecha", "Llaveros", "Figura con nombre, iniciales o fecha.", 0, "◈"], ["Llavero personalizado", "Llaveros", "Basado en una imagen, logo, dibujo o diseño.", 0, "◈"], ["Llavero Pokémon iniciales", "Llaveros", "Llavero con figuras de los Pokémon iniciales.", 0, "◈"], ["Llavero 2D", "Llaveros", "Modelos sencillos en dos dimensiones.", 0, "◈"], ["Maceta de cactus", "Macetas", "Modelo tamaño maceta Nº 8.", 0, "◈"], ["Maceta Robert con libro", "Macetas", "Maceta Robert en pose de lectura, Nº 8.", 0, "◈"], ["Maceta Robert Mamá", "Macetas", "Maceta Robert con pequeño acompañante, Nº 8.", 0, "◈"], ["Maceta Robert sentado", "Macetas", "Maceta Robert sentado, Nº 8.", 0, "◈"], ["Maceta Robert cola articulada", "Macetas", "Maceta Robert con cola articulada, Nº 8.", 0, "◈"], ["Maceta con textura", "Macetas", "Maceta con textura exterior, Nº 8.", 0, "◈"], ["Molde para maceta", "Macetas", "Molde para fabricación de macetas de cemento Nº 8.", 0, "◈"], ["Maceta Bulbasaur", "Macetas", "Maceta de aproximadamente 12 cm de ancho.", 0, "◈"], ["Maceta espiralizada", "Macetas", "Maceta Nº 8 de diseño espiralizado.", 0, "◈"], ["Maceta low poly", "Macetas", "Maceta Nº 10 de geometría poligonal.", 0, "◈"], ["Porta sahumerio Darth Vader", "Accesorios", "Porta sahumerio de aproximadamente 10 cm de alto.", 0, "◈"], ["Fundas para iPhone", "Accesorios", "Modelos para iPhone según versión y disponibilidad.", 0, "◈"], ["Porta auriculares", "Accesorios", "Soporte de escritorio para auriculares.", 0, "◈"], ["Porta celular", "Accesorios", "Base o soporte para teléfono.", 0, "◈"], ["Porta celular con marca", "Accesorios", "Soporte para teléfono con logo o marca personalizada.", 0, "◈"], ["Smurf Cat", "Juegos y juguetes", "Figura 3D no pintada.", 0, "◈"], ["Máscara Sub-Zero", "Juegos y juguetes", "Máscara de personaje de videojuego.", 0, "◈"], ["Balance Tetris", "Juegos y juguetes", "Juego de estrategia y equilibrio por equipos.", 0, "◈"], ["Encendedor mariposa", "Juegos y juguetes", "Artículo estilo mariposa del catálogo histórico.", 0, "◈"], ["Lapicera mariposa", "Juegos y juguetes", "Porta lapicera plegable estilo mariposa.", 0, "◈"], ["Cortadores Pokémon", "Cortadores", "Cortadores de masa con motivos de Pokémon.", 0, "◈"], ["Cortadores navideños", "Cortadores", "Cortadores de masa con motivos de Navidad.", 0, "◈"], ["Cortadores Los Simpsons", "Cortadores", "Cortadores de masa con motivos de Los Simpsons.", 0, "◈"], ["Cortadores Star Wars", "Cortadores", "Cortadores de masa con motivos de Star Wars.", 0, "◈"], ["Cortadores tren y vagones", "Cortadores", "Cortadores de masa con forma de tren y vagones.", 0, "◈"], ["Tiburón articulado con anzuelo", "Articulados", "Figura de tiburón articulado.", 0, "◈"], ["Shen Long articulado", "Articulados", "Dragón articulado con esfera en llavero.", 0, "◈"], ["Camaleón articulado", "Articulados", "Figura de camaleón articulado.", 0, "◈"], ["Lagartija articulada", "Articulados", "Figura de lagartija articulada.", 0, "◈"], ["Cubo infinito", "Articulados", "Juguete de movimientos continuos.", 0, "◈"]];
 for(const x of items) DB.prepare('INSERT INTO products(title,category,description,price,emoji,active) VALUES(?,?,?,?,?,1)').run(...x);
}
// Materiales habituales en borrador: cero cantidad/costo hasta cargar datos reales.
if (!DB.prepare('SELECT count(*) n FROM inventory').get().n) {
 const essentials=[["accesorio", "Argollas para llaveros", "Metal", "Plateado", "unidad", 20], ["accesorio", "Cadenitas para llaveros", "Metal", "Plateado", "unidad", 20], ["accesorio", "Mosquetones pequeños", "Metal", "Plateado", "unidad", 10], ["accesorio", "Imanes pequeños", "Imán", "", "unidad", 10], ["accesorio", "Tornillos pequeños surtidos", "Metal", "", "unidad", 20], ["accesorio", "Insertos roscados", "Metal", "", "unidad", 10], ["consumible", "Pegamento para piezas", "Adhesivo", "", "ml", 10], ["consumible", "Bolsas de embalaje", "Plástico o papel", "", "unidad", 20]];
 for(const x of essentials) DB.prepare('INSERT INTO inventory(category,name,material,color,unit,stock,min_stock,cost_unit,created_at) VALUES(?,?,?,?,?,0,?,0,?)').run(x[0],x[1],x[2],x[3],x[4],x[5],new Date().toISOString());
}
// Referencias de mercado: NO son existencias ni costos pagados. Se pueden editar en GT-3D Admin.
if (!DB.prepare('SELECT count(*) n FROM filament_prices').get().n) {
 const refs=[
 ['Printalot','PLA X','Negro',25673,'Mercado Libre','https://listado.mercadolibre.com.ar/pla-1-kg-1%2C75','2026-10-08'],
 ['Grilon3','PLA','Blanco',24750,'Mercado Libre','https://listado.mercadolibre.com.ar/pla-1-kg-1%2C75','2026-10-08'],
 ['3n3','PLA','Negro',22999,'Mercado Libre','https://www.mercadolibre.com.ar/3n3-filamento-pla-175mm-1kg-color-negro/p/MLA36267353','2026-10-08'],
 ['FilAr','PLA','Manteca',23100,'Mercado Libre','https://www.mercadolibre.com.ar/filamento-pla-filar-175-mm-1-kg-impresora-3d-color-manteca/p/MLA50873121','2026-10-08'],
 ['3NMax','PLA+','Negro',18999,'Mercado Libre','https://listado.mercadolibre.com.ar/filamento-3d-1-kg','2026-10-08'],
 ['Hellbot','PLA Ecofila Lock','Varios',19990,'Proyecto Color','','2026-10-08']
 ];
 for(const x of refs) DB.prepare('INSERT INTO filament_prices(brand,material,color,kg_price,source,url,observed_at) VALUES(?,?,?,?,?,?,?)').run(...x);
}
const getSettings=()=>Object.fromEntries(DB.prepare('SELECT key,value FROM settings').all().map(r=>[r.key,JSON.parse(r.value)]));
function transaction(fn){
 DB.exec('BEGIN IMMEDIATE');
 try{const result=fn();DB.exec('COMMIT');return result;}
 catch(e){DB.exec('ROLLBACK');throw e;}
}
const now=()=>new Date().toISOString();
const today=()=>new Date(Date.now()-3*3600000).toISOString().slice(0,10);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const str=(x,max=300)=>String(x??'').trim().slice(0,max);
const list=(sql,...args)=>DB.prepare(sql).all(...args);
const get=(sql,...args)=>DB.prepare(sql).get(...args);
function logEvent(id,kind,summary){DB.prepare('INSERT INTO request_events(request_id,kind,summary,created_at) VALUES(?,?,?,?)').run(id,str(kind,50),str(summary,400),now());}
const sessionSecretFile=path.join(DATA,'.secret');
if(!process.env.SESSION_SECRET && !fs.existsSync(sessionSecretFile)) fs.writeFileSync(sessionSecretFile,crypto.randomBytes(32).toString('hex'),{mode:0o600});
const secret=process.env.SESSION_SECRET || fs.readFileSync(sessionSecretFile,'utf8').trim();
const passFile=path.join(DATA,'.admin-password');
if(!process.env.ADMIN_PASSWORD && !fs.existsSync(passFile)) fs.writeFileSync(passFile,crypto.randomBytes(9).toString('base64url'),{mode:0o600});
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||fs.readFileSync(passFile,'utf8').trim();
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length<8) throw new Error('ADMIN_PASSWORD debe tener como mínimo 8 caracteres.');
const tokens=new Map();const attempts=new Map();const publicRates=new Map();
function allowRate(ip,key,limit=15){const nowMs=Date.now(),k=key+':'+ip;let item=publicRates.get(k)||{count:0,start:nowMs};if(nowMs-item.start>3600000)item={count:0,start:nowMs};item.count++;publicRates.set(k,item);return item.count<=limit;}
function signature(payload){return crypto.createHmac('sha256',secret).update(payload).digest('base64url');}
function loggedIn(req){const raw=(req.headers.cookie||'').match(/(?:^|;\s*)gt3d_session=([^;]+)/)?.[1]||'';if(tokens.has(raw))return false;const [payload,sig]=raw.split('.');if(!payload||!sig||sig.length!==signature(payload).length)return false; if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(signature(payload))))return false; try{return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now();}catch{return false;}}
function cookieHeader(req,token){return `gt3d_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`;}
function send(res,code,data,headers={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',...headers});res.end(JSON.stringify(data));}
function err(status,message){const e=new Error(message);e.status=status;throw e;}
function body(req){return new Promise((resolve,reject)=>{let size=0,chunks=[],tooLarge=false;req.on('data',c=>{size+=c.length;if(size>17_000_000){tooLarge=true;chunks=[];}else if(!tooLarge)chunks.push(c);});req.on('end',()=>{if(tooLarge){reject(Object.assign(new Error('Solicitud demasiado grande (máximo 17 MB).'),{status:413}));return;}try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{});}catch{reject(Object.assign(new Error('JSON inválido'),{status:400}));}});req.on('error',reject);});}
const publicSettings=()=>{const s=getSettings();return {brand:s.brand,tagline:s.tagline,city:s.city,whatsapp:s.whatsapp,instagram:s.instagram,email:s.email,pickup:s.pickup,delivery_note:s.delivery_note,business_hours:s.business_hours,public_pla_days:s.public_pla_days,public_design_days:s.public_design_days,public_university_days:s.public_university_days,public_catalog_days:s.public_catalog_days};};
function reqPublic(r){const {id,code,client_name,phone,email,city,service,description,quantity,material,color,desired_date,delivery,details,status,created_at}=r;return{id,code,client_name,phone,email,city,service,description,quantity,material,color,desired_date,delivery,details,status,created_at};}
function validateAttachment(file){const allowed=['stl','3mf','step','stp','obj','dxf','dwg','skp','ifc','png','jpg','jpeg','webp','pdf'];const name=path.basename(str(file.name,120));if(!allowed.includes(name.split('.').pop().toLowerCase()))err(400,'Formato de archivo no permitido: '+name); const data=Buffer.from(str(file.data,8_000_000),'base64');if(!data.length||data.length>5_000_000)err(400,'Cada archivo debe tener menos de 5 MB');return{name,mime:str(file.mime,70),data};}
function createRequest(b){if(str(b.client_name,100).length<2||str(b.phone,35).replace(/\D/g,'').length<8||!['impresion','modelado','modelado_impresion','repuestos','prototipos','catalogo','universitarios'].includes(b.service)||str(b.description,1200).length<8)err(400,'Completá nombre, teléfono, servicio y descripción (mínimo 8 caracteres).');if(b.service!=='modelado'&&!str(b.color,70).trim())err(400,'Elegí un color de impresión o «Varios colores, aclarar por WhatsApp».');const files=Array.isArray(b.files)?b.files.slice(0,4).map(validateAttachment):[];if((b.files||[]).length>4)err(400,'Máximo 4 archivos por solicitud');if(files.reduce((a,f)=>a+f.data.length,0)>12_000_000)err(400,'El total de archivos supera los 12 MB');
  return transaction(()=>{
 const id=Number(DB.prepare(`INSERT INTO requests(client_name,phone,email,city,service,description,quantity,material,color,desired_date,delivery,details,status,created_at,updated_at,review_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(str(b.client_name,100),str(b.phone,35),str(b.email,120),str(b.city,80),b.service,str(b.description,1200),clamp(b.quantity,1,10000)||1,str(b.material,70),str(b.color,70),str(b.desired_date,20),str(b.delivery,40),JSON.stringify(b.details&&typeof b.details==='object'?b.details:{}),'nueva',now(),now(),crypto.randomBytes(20).toString('hex')).lastInsertRowid);
 DB.prepare('UPDATE requests SET code=? WHERE id=?').run('GT-'+String(id).padStart(4,'0'),id);
 logEvent(id,'solicitud','Solicitud recibida: '+str(b.service,45));
 const insert=DB.prepare('INSERT INTO uploads(request_id,name,mime,bytes,created_at) VALUES(?,?,?,?,?)');for(const f of files)insert.run(id,f.name,f.mime,f.data,now());
 return get('SELECT id,code,service,created_at FROM requests WHERE id=?',id);
 });
}
function requestSummary(){return list('SELECT * FROM requests ORDER BY id DESC').map(r=>({...r,details:JSON.parse(r.details||'{}'),accessories:JSON.parse(r.accessories||'[]'),files:list('SELECT id,name,mime,length(bytes) size FROM uploads WHERE request_id=?',r.id)}));}

function inventoryWithReservations(requests){
 const active=new Set(['confirmada','modelando','aprobacion','en_cola','imprimiendo','terminaciones','pausado']);
 return list('SELECT * FROM inventory ORDER BY category,name').map(item=>{
  let reserved=0;
  for(const r of requests){if(!active.has(r.status)||r.stock_applied)continue;
   if(r.filament_id===item.id)reserved+=Number(r.grams)||0;
   for(const a of r.accessories||[])if(Number(a.inventory_id)===item.id)reserved+=Number(a.quantity)||0;
  }
  return {...item,reserved,available:Number(item.stock)-reserved};
 });
}

function checkStockForConfirmed(id,r){
 const statuses=new Set(['confirmada','modelando','aprobacion','en_cola','imprimiendo','terminaciones','pausado']);
 if(!statuses.has(r.status)||r.stock_applied)return;
 const claims=new Map();
 if(r.filament_id&&Number(r.grams)>0)claims.set(Number(r.filament_id),Number(r.grams));
 for(const a of JSON.parse(r.accessories||'[]')){
  const k=Number(a.inventory_id),q=Math.max(0,Number(a.quantity)||0);
  if(k&&q)claims.set(k,(claims.get(k)||0)+q);
 }
 const rest=requestSummary().filter(x=>x.id!==id);
 const inv=inventoryWithReservations(rest);
 for(const [stockId,qty] of claims){
  const found=inv.find(x=>x.id===stockId);
  if(!found||Number(found.available)<qty)err(409,'Stock insuficiente para confirmar el trabajo. Revisá inventario o reservá menos materiales.');
 }
}
function stockForOrder(id,order,patch){
 if(order.stock_applied)return [];
 const gs=Math.max(0,Number(patch.actual_grams??order.actual_grams)||Number(order.grams)||0),byId=new Map();
 if(order.filament_id&&gs>0)byId.set(order.filament_id,gs);
 for(const a of JSON.parse(order.accessories||'[]')){
  const key=Number(a.inventory_id),q=Math.max(0,Number(a.quantity)||0);
  if(key&&q>0)byId.set(key,(byId.get(key)||0)+q);
 }
 let result=[];
 for(const [stockId,qty] of byId){
  const item=get('SELECT * FROM inventory WHERE id=?',stockId);
  if(!item)err(409,'Hay insumos faltantes en el inventario. Revisá el pedido antes de finalizar.');
  if(Number(item.stock)<qty)err(409,`No hay stock físico suficiente de ${item.name}.`);
  result.push({id:stockId,qty});
 }
 return result;
}
function dataState(){const requests=requestSummary(),machines=list('SELECT * FROM machines ORDER BY id'),weekly=list('SELECT * FROM weekly'),shifts=list('SELECT * FROM day_shifts'),overrides=list('SELECT * FROM day_overrides');return {settings:getSettings(),requests,events:list('SELECT id,request_id,kind,summary,created_at FROM request_events ORDER BY id DESC LIMIT 600'),inventory:inventoryWithReservations(requests),moves:list('SELECT * FROM inventory_moves ORDER BY id DESC LIMIT 200'),payments:list('SELECT * FROM payments ORDER BY id DESC'),expenses:list('SELECT * FROM expenses ORDER BY id DESC'),machines,weekly,shifts,overrides,products:list("SELECT p.*, EXISTS(SELECT 1 FROM product_photos ph WHERE ph.product_id=p.id) AS has_custom_photo, COALESCE((SELECT ph.updated_at FROM product_photos ph WHERE ph.product_id=p.id),'catalog-edited-v25') AS photo_rev FROM products p ORDER BY p.id DESC"),filament_prices:list('SELECT * FROM filament_prices ORDER BY brand,material,color'),reviews:list('SELECT * FROM reviews ORDER BY id DESC'),scheduleWarnings:findConflicts(requests,machines,weekly,shifts,overrides)};}
function localDate(d){return new Date(d+'T00:00:00Z');}
function plusDate(d,days){const x=localDate(d);x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10)}
function weekday(d){return localDate(d).getUTCDay();}
function minute(time){const [h,m]=str(time).split(':').map(Number);return (h||0)*60+(m||0)}
function padTime(n){return `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function isoSlot(d,time){return `${d}T${time}:00`}
function eligibleWindows(m,date,weekly,shifts,overrides){const forced=overrides.some(x=>x.machine_id===m.id&&x.date===date);const sources=forced?shifts.filter(x=>x.machine_id===m.id&&x.date===date):weekly.filter(x=>x.machine_id===m.id&&x.weekday===weekday(date));return sources.map(x=>{const start=minute(x.start_time),end=minute(x.end_time);return {start:Date.parse(isoSlot(date,x.start_time)+'Z'),end:Date.parse(isoSlot(end<=start?plusDate(date,1):date,x.end_time)+'Z')};}).filter(x=>x.end>x.start);}
function stampToMs(stamp){return Date.parse(String(stamp||'')+'Z');}
function fmtStamp(ms){return new Date(ms).toISOString().slice(0,16);}
function allowedSchedule(request,range,m,w,s,o){if(!request.planned_start||!request.planned_end)return true;return eligibleWindows(m,request.planned_start.slice(0,10),w,s,o).some(win=>win.start<=range[0]&&win.end>=range[1]);}
function findConflicts(requests,machines,weekly,shifts,overrides){return requests.filter(r=>r.planned_start&&r.planned_end&&!['entregado','cancelado','rechazado'].includes(r.status)).filter(r=>{const m=machines.find(x=>x.id===r.machine_id);return !m||!allowedSchedule(r,[stampToMs(r.planned_start),stampToMs(r.planned_end)],m,weekly,shifts,overrides);}).map(r=>({id:r.id,code:r.code,reason:'Fuera de la disponibilidad actual: revisar turno antes de modificar la entrega comprometida.'}));}
function suggestSlot(orderId,machineId){const r=get('SELECT * FROM requests WHERE id=?',orderId);if(!r)err(404,'Pedido inexistente');const machine=get('SELECT * FROM machines WHERE id=?',machineId||r.machine_id||1);if(!machine||machine.status!=='activa')err(400,'La impresora no está disponible');if(!r.print_hours||r.print_hours<=0)err(400,'Primero cargá las horas de impresión');const minutes=Math.ceil(Number(machine.setup_minutes)+Number(r.print_hours)*60*(1+Number(machine.buffer_pct)/100));if(minutes<1)err(400,'Duración inválida');const all=requestSummary(),w=list('SELECT * FROM weekly'),sh=list('SELECT * FROM day_shifts'),o=list('SELECT * FROM day_overrides');const reserved=all.filter(x=>x.id!==r.id&&x.machine_id===machine.id&&x.planned_start&&x.planned_end&&!['cancelado','rechazado','entregado'].includes(x.status)).map(x=>[stampToMs(x.planned_start),stampToMs(x.planned_end)]);
 const current=Date.now()-3*3600000;for(let day=0;day<45;day++){const date=plusDate(today(),day);const wins=eligibleWindows(machine,date,w,sh,o);for(const win of wins){let start=Math.max(win.start,Math.ceil(current/(15*60000))*15*60000);while(start+minutes*60000<=win.end){const clash=reserved.find(a=>start<a[1]&&start+minutes*60000>a[0]);if(!clash)return {machine_id:machine.id,start:fmtStamp(start),end:fmtStamp(start+minutes*60000),minutes,buffer_pct:machine.buffer_pct};start=Math.max(start+15*60000,clash[1]);}}}return null;}
function updateItem(table,id,b,fields){const obj={};for(const f of fields)if(Object.hasOwn(b,f))obj[f]=b[f];if(!Object.keys(obj).length)err(400,'No hay cambios');const clauses=Object.keys(obj).map(x=>x+'=?').join(',');DB.prepare(`UPDATE ${table} SET ${clauses} WHERE id=?`).run(...Object.values(obj),id);return get(`SELECT * FROM ${table} WHERE id=?`,id);}
function numberFields(b,fields){for(const f of fields)if(Object.hasOwn(b,f)){const x=Number(b[f]);if(!Number.isFinite(x)||x<0)err(400,`Valor numérico inválido: ${f}`);b[f]=x;}return b;}
function registerInventory(request,kind){const r=get('SELECT * FROM requests WHERE id=?',request);if(!r)err(404,'Pedido no encontrado');if(kind==='consume'&&r.status==='entregado')err(400,'El pedido ya está entregado');if(kind==='reserve') return;}
const ALLOWED_EXT={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const port=Number(process.env.PORT||3000);
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),p=u.pathname,method=req.method;const ip=req.socket.remoteAddress||'unknown';if(method==='OPTIONS')return send(res,405,{error:'No permitido'});
 if(!p.startsWith('/api/')){
  if(method!=='GET')err(405,'Método no permitido');
  let file=p==='/'?'index.html':p.slice(1);
  // Restrict static access to a fixed allowlist; never expose data files or server source.
  if(!['index.html','styles.css','app.js','robots.txt','assets/logo-principal.png','assets/logo-invertido.png','assets/logo-nombre.png'].includes(file)&&!/^assets\/catalog\/\d{2}\.webp$/.test(file))err(404,'Recurso no encontrado');
  // Las fotos originales de productos ocultos tampoco se pueden consultar directamente.
  const catalogAsset=file.match(/^assets\/catalog\/(\d{2})\.webp$/);
  if(catalogAsset&&!get('SELECT id FROM products WHERE id=? AND (active=1 OR ?=1)',Number(catalogAsset[1]),loggedIn(req)?1:0))err(404,'Producto no disponible');
  if(file==='robots.txt') { res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':IS_DEMO?'noindex, nofollow':'all'});return res.end(IS_DEMO?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\n'); }
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ALLOWED_EXT[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':['.html','.js','.css'].includes(ext)?'no-cache, max-age=0, must-revalidate':'public, max-age=3600','X-Frame-Options':'DENY','X-Robots-Tag':IS_DEMO?'noindex, nofollow':'all','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});
  fs.createReadStream(path.join(ROOT,file)).on('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();}).pipe(res);return;
 }
 // Las fotografías de catálogo son públicas. Los archivos STL de clientes jamás se exponen aquí.
 const productImage=p.match(/^\/api\/product-image\/(\d+)$/);
 if(productImage&&method==='GET'){
  const id=Number(productImage[1]);
  if(!get('SELECT id FROM products WHERE id=? AND (active=1 OR ?=1)',id,loggedIn(req)?1:0))err(404,'Producto no disponible');
  const photo=get('SELECT mime,bytes FROM product_photos WHERE product_id=?',id);
  if(photo){res.writeHead(200,{'Content-Type':photo.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(photo.bytes);}
  const sample=path.join(ROOT,'assets','catalog',String(id).padStart(2,'0')+'.webp');
  if(id<=35&&fs.existsSync(sample)){res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});return fs.createReadStream(sample).pipe(res);}
  const placeholder='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#edf0f2"/><path d="m300 120 76 42v90l-76 44-76-44v-90z M224 162l76 46 76-46 M300 208v88" fill="none" stroke="#7d8993" stroke-width="9" stroke-linejoin="round"/><text x="300" y="347" font-size="23" text-anchor="middle" fill="#7d8993" font-family="Arial">GT-3D</text></svg>';
  res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});return res.end(placeholder);
 }

 if(['POST','PATCH','DELETE'].includes(method) && req.headers.origin){const host=req.headers.host,origin=new URL(req.headers.origin);if(origin.host!==host)err(403,'Origen inválido');}
 if(p==='/api/health'&&method==='GET')return send(res,200,{ok:true,service:'GT-3D',demo:IS_DEMO});
 if(p==='/api/public'&&method==='GET')return send(res,200,{demo:IS_DEMO,settings:publicSettings(),products:list("SELECT p.id,p.title,p.category,p.description,p.price,p.emoji,COALESCE((SELECT ph.updated_at FROM product_photos ph WHERE ph.product_id=p.id),'catalog-edited-v25') AS photo_rev FROM products p WHERE p.active=1 ORDER BY p.id DESC"),reviews:list("SELECT r.id,r.name,r.rating,r.comment,r.reply,r.created_at,q.service FROM reviews r JOIN requests q ON q.id=r.request_id WHERE r.status='publicada' ORDER BY r.id DESC LIMIT 24")});
 if(p==='/api/requests'&&method==='POST'){
  const b=await body(req);
  if(b.privacy_consent!==true)err(400,'Necesitamos tu consentimiento para gestionar la solicitud y sus archivos.');
  const qty=b.quantity===undefined?1:Number(b.quantity);
  if(!Number.isInteger(qty)||qty<1||qty>10000)err(400,'Ingresá una cantidad válida de piezas (de 1 a 10.000).');
  if(b.desired_date){
   const requested=String(b.desired_date);const timestamp=Date.parse(requested+'T12:00:00Z');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(requested)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==requested)err(400,'La fecha indicada no es válida. Elegí una fecha o dejala sin definir.');
   if(requested<new Date(Date.now()-3*3600000).toISOString().slice(0,10))err(400,'La fecha límite no puede ser anterior a hoy. Elegí una fecha futura o Sin definir.');
  }
  if(!allowRate(ip,'solicitudes',12))err(429,'Demasiadas solicitudes desde esta conexión. Contactanos por WhatsApp.');
  return send(res,201,createRequest(b));
 }
 if(p==='/api/review'&&method==='GET'){const t=str(u.searchParams.get('token'),100);const r=get('SELECT id,code,status FROM requests WHERE review_token=?',t);if(!r||r.status!=='entregado')err(404,'Enlace inválido o pedido no entregado');return send(res,200,{code:r.code,submitted:!!get('SELECT id FROM reviews WHERE request_id=?',r.id)});}
 if(p==='/api/review'&&method==='POST'){if(!allowRate(ip,'resenas',12))err(429,'Demasiados intentos. Probá más tarde.');const b=await body(req),r=get('SELECT id,code,status,client_name FROM requests WHERE review_token=?',str(b.token,100));if(!r||r.status!=='entregado')err(400,'Enlace inválido');if(get('SELECT id FROM reviews WHERE request_id=?',r.id))err(409,'Este pedido ya tiene reseña');const rating=Number(b.rating),comment=str(b.comment,1100);if(!Number.isInteger(rating)||rating<1||rating>5||comment.length<8)err(400,'Ingresá una calificación y comentario válido');DB.prepare('INSERT INTO reviews(request_id,name,rating,comment,status,created_at) VALUES (?,?,?,?,?,?)').run(r.id,b.anonymous?'Cliente verificado':str(b.name,70)||r.client_name,rating,comment,'pendiente',now());return send(res,201,{ok:true});}
 if(p==='/api/login'&&method==='POST'){const a=attempts.get(ip)||{count:0,until:0};if(a.until>Date.now())err(429,'Demasiados intentos. Volvé a intentar más tarde.');const b=await body(req);const provided=Buffer.from(String(b.password||'')),expected=Buffer.from(ADMIN_PASSWORD);if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected)){a.count++;if(a.count>=8){a.until=Date.now()+15*60000;a.count=0;}attempts.set(ip,a);err(401,'Contraseña incorrecta');}attempts.delete(ip);const payload=Buffer.from(JSON.stringify({exp:Date.now()+86400000})).toString('base64url');return send(res,200,{ok:true},{'Set-Cookie':cookieHeader(req,payload+'.'+signature(payload))});}
 if(p==='/api/me'&&method==='GET')return send(res,200,{authenticated:loggedIn(req)});
 if(p==='/api/logout'&&method==='POST'){const raw=(req.headers.cookie||'').match(/(?:^|;\s*)gt3d_session=([^;]+)/)?.[1]||'';if(raw&&loggedIn(req))tokens.set(raw,Date.now()+86400000);return send(res,200,{ok:true},{'Set-Cookie':'gt3d_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
 if(!loggedIn(req))err(401,'Iniciá sesión para acceder al panel');
 const photoRoute=p.match(/^\/api\/admin\/products\/(\d+)\/photo$/);
 if(photoRoute){
  const id=Number(photoRoute[1]);if(!get('SELECT id FROM products WHERE id=?',id))err(404,'Producto inexistente');
  if(method==='DELETE'){DB.prepare('DELETE FROM product_photos WHERE product_id=?').run(id);return send(res,200,{ok:true});}
  if(method==='POST'){
   const b=await body(req);const mime=str(b.mime,40);
   if(!['image/jpeg','image/png','image/webp'].includes(mime))err(400,'Formato permitido: JPG, PNG o WebP');
   const blob=Buffer.from(str(b.data,7_500_000),'base64');
   if(blob.length<16||blob.length>4_800_000)err(400,'La foto debe pesar menos de 4,8 MB');
   const jpg=blob[0]===0xff&&blob[1]===0xd8&&blob[2]===0xff;
   const png=blob.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
   const webp=blob.toString('ascii',0,4)==='RIFF'&&blob.toString('ascii',8,12)==='WEBP';
   if(!((mime==='image/jpeg'&&jpg)||(mime==='image/png'&&png)||(mime==='image/webp'&&webp)))err(400,'El archivo no coincide con el formato declarado');
   DB.prepare('INSERT INTO product_photos(product_id,mime,bytes,updated_at) VALUES(?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes,updated_at=excluded.updated_at').run(id,mime,blob,now());
   return send(res,200,{ok:true});
  }
 }
 if(p==='/api/admin/backup'&&method==='GET'){
  const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gt3d-backup-'));
  const target=path.join(temp,'gt3d.sqlite');
  try{
   await backup(DB,target);
   const filename=`GT3D_respaldo_${today()}.sqlite`;
   const stat=fs.statSync(target);
   res.writeHead(200,{'Content-Type':'application/vnd.sqlite3','Content-Disposition':`attachment; filename="${filename}"`,'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   const stream=fs.createReadStream(target);
   let cleaned=false;
   const cleanup=()=>{if(cleaned)return;cleaned=true;try{fs.rmSync(temp,{recursive:true,force:true});}catch(e){console.error('No se pudo borrar el backup temporal',e);}};
   stream.once('close',cleanup);
   stream.on('error',e=>res.destroy(e));
   res.once('close',()=>{if(!stream.destroyed)stream.destroy();});
   stream.pipe(res);
   return;
  }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 }
 if(p==='/api/admin/state'&&method==='GET')return send(res,200,dataState());
 if(p==='/api/admin/settings'&&method==='PATCH'){const b=await body(req);const proposal={...getSettings(),...b};if(!(Number(proposal.bulk_min_quantity)<Number(proposal.bulk_mid_quantity)&&Number(proposal.bulk_mid_quantity)<Number(proposal.bulk_high_quantity)))err(400,'Los umbrales deben aumentar (lote chico < mediano < grande).');if(!(Number(proposal.bulk_discount_first)<=Number(proposal.bulk_discount_mid)&&Number(proposal.bulk_discount_mid)<=Number(proposal.bulk_discount_high)))err(400,'Los descuentos deben mantenerse o aumentar con la cantidad.');const st=DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');transaction(()=>{for(const [k,v] of Object.entries(b))if(Object.hasOwn(defaults,k)&&['string','number'].includes(typeof v)){if(k.startsWith('mult_')&&(!Number.isFinite(v)||v<1||v>10))err(400,'Los multiplicadores deben estar entre 1 y 10.');if(k.startsWith('bulk_discount_')&&(!Number.isFinite(v)||v<0||v>40))err(400,'Los descuentos por cantidad deben estar entre 0 y 40%.');if(['bulk_min_quantity','bulk_mid_quantity','bulk_high_quantity'].includes(k)&&(!Number.isInteger(v)||v<2||v>10000))err(400,'Los mínimos de cantidad deben ser enteros entre 2 y 10000.');st.run(k,JSON.stringify(typeof v==='string'?str(v,300):clamp(v,0,10000000)));}});return send(res,200,getSettings());}
 if(p==='/api/admin/filament-prices'&&method==='POST'){
  const b=await body(req),kg=Number(b.kg_price);
  if(!str(b.brand,70)||!str(b.material,70)||!str(b.color,70)||!Number.isFinite(kg)||kg<=0)err(400,'Marca, material, color y precio por kg son obligatorios.');
  const id=Number(DB.prepare('INSERT INTO filament_prices(brand,material,color,kg_price,source,url,observed_at,notes) VALUES(?,?,?,?,?,?,?,?)').run(str(b.brand,70),str(b.material,70),str(b.color,70),kg,str(b.source,100),str(b.url,500),str(b.observed_at,20)||today(),str(b.notes,250)).lastInsertRowid);
  return send(res,201,get('SELECT * FROM filament_prices WHERE id=?',id));
 }
 const refMatch=p.match(/^\/api\/admin\/filament-prices\/(\d+)$/);
 if(refMatch&&method==='PATCH'){
  const id=Number(refMatch[1]),old=get('SELECT * FROM filament_prices WHERE id=?',id),b=await body(req);if(!old)err(404,'Precio de referencia no encontrado');
  const kg=Number(b.kg_price);if(!str(b.brand)||!str(b.material)||!str(b.color)||!Number.isFinite(kg)||kg<=0)err(400,'Marca, material y precio deben ser válidos');
  return send(res,200,updateItem('filament_prices',id,{brand:str(b.brand,70),material:str(b.material,70),color:str(b.color,70),kg_price:kg,source:str(b.source,100),url:str(b.url,500),observed_at:str(b.observed_at,20),notes:str(b.notes,250)},['brand','material','color','kg_price','source','url','observed_at','notes']));
 }
 if(refMatch&&method==='DELETE'){DB.prepare('DELETE FROM filament_prices WHERE id=?').run(Number(refMatch[1]));return send(res,200,{ok:true});}
 if(p==='/api/admin/requests'&&method==='POST')return send(res,201,createRequest(await body(req)));
 const orderMatch=p.match(/^\/api\/admin\/requests\/(\d+)$/);
 if(orderMatch&&method==='PATCH'){
  const id=Number(orderMatch[1]),b=await body(req),old=get('SELECT * FROM requests WHERE id=?',id);
  if(!old)err(404,'Pedido no encontrado');
  if(Object.hasOwn(b,'status')&&!['nueva','revision','faltan_datos','cotizada','esperando_anticipo','confirmada','modelando','aprobacion','en_cola','imprimiendo','terminaciones','lista','entregado','cancelado','rechazado','pausado'].includes(b.status))err(400,'Estado inválido');
  if(Object.hasOwn(b,'internal_notes'))b.internal_notes=str(b.internal_notes,3000);
  numberFields(b,['quote','cost','model_hours','print_hours','grams','actual_grams','deposit','delivery_fee','quantity','machine_id','filament_id','pricing_multiplier','pricing_bulk','pricing_manual']);
  if(Object.hasOwn(b,'client_approved')&&!([0,1].includes(Number(b.client_approved))))err(400,'La aprobación del cliente debe ser sí o no.');
  const fields=['client_name','phone','email','description','internal_notes','client_approved','status','quote','cost','model_hours','print_hours','grams','actual_grams','accessories','filament_id','deposit','delivery_fee','due_date','machine_id','planned_start','planned_end','material','color','quantity','delivery','stock_applied','pricing_multiplier','pricing_service','pricing_bulk','pricing_manual'];
  // Las acciones directas y el selector manual comparten controles comerciales.
  // Cualquier cambio de precio anterior a la producción necesita nueva aceptación.
  if(Object.hasOwn(b,'quote')&&Number(b.quote)!==Number(old.quote)&&!['confirmada','modelando','aprobacion','en_cola','imprimiendo','terminaciones','lista','entregado','pausado'].includes(old.status))b.client_approved=0;
  const target=b.status||old.status;
  const productionStatuses=new Set(['confirmada','modelando','aprobacion','en_cola','imprimiendo','terminaciones','lista','pausado']);
  const wasProduction=productionStatuses.has(old.status)||old.status==='entregado';
  if((productionStatuses.has(target)||target==='entregado')&&!wasProduction){
   if(!Number(b.client_approved??old.client_approved))err(409,'Antes de confirmar, registrá que el cliente aprobó el presupuesto.');
   const price=Number(b.quote??old.quote),deposit=Number(b.deposit??old.deposit);
   const transferred=get("SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE request_id=? AND method='Transferencia'",id).paid;
   if(price<=0||deposit<=0)err(409,'Antes de confirmar, cargá un presupuesto y un anticipo mayor a cero.');
   if(transferred+0.01<deposit)err(409,'Antes de confirmar, registrá el anticipo acreditado por transferencia.');
  }
  if(target==='lista'&&!wasProduction)err(409,'Primero confirmá el pedido antes de finalizarlo.');
  if(target==='entregado'&&old.status!=='entregado'){
   if(old.status!=='lista')err(409,'Primero marcá el pedido como listo para entregar.');
   const paid=get('SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE request_id=?',id).paid;
   if(Number(b.quote??old.quote)-paid>0.01)err(409,'Queda saldo pendiente: registrá el cobro acreditado antes de entregar.');
  }
  if((old.status==='cancelado'||old.status==='rechazado')&&target!==old.status)err(409,'El pedido fue cerrado. Creá una nueva solicitud para retomarlo.');
  if(old.status==='entregado'&&target!==old.status)err(409,'El pedido ya fue entregado. No se puede reabrir sin registrar una nueva solicitud.');
  const payAlready=get('SELECT COALESCE(SUM(amount),0) total FROM payments WHERE request_id=?',id).total;
  if(Object.hasOwn(b,'quote')&&Number(b.quote)+0.01<payAlready)err(409,'El precio nuevo es menor que el importe ya cobrado. Verificá pagos y presupuesto.');
  if(Number(b.deposit??old.deposit)>Number(b.quote??old.quote)+0.01)err(409,'El anticipo solicitado no puede superar el presupuesto.');
  const finalizing=['lista','entregado'].includes(b.status)&&!old.stock_applied;
  if(productionStatuses.has(target)&&Number(b.grams??old.grams)>0&&!Number(b.filament_id??old.filament_id))err(409,'Seleccioná el filamento de inventario para reservar materiales antes de confirmar.');
  const newOrder={...old,...b,accessories:Object.hasOwn(b,'accessories')?JSON.stringify(Array.isArray(b.accessories)?b.accessories:[]):old.accessories};
  const toConsume=finalizing?stockForOrder(id,newOrder,b):[];
  checkStockForConfirmed(id,newOrder);
  if(Object.hasOwn(b,'accessories'))b.accessories=JSON.stringify(Array.isArray(b.accessories)?b.accessories:[]);
  if(finalizing)b.stock_applied=1;
  b.updated_at=now();
  DB.exec('BEGIN IMMEDIATE');
  try{
   for(const item of toConsume){DB.prepare('UPDATE inventory SET stock=stock-? WHERE id=?').run(item.qty,item.id);DB.prepare('INSERT INTO inventory_moves(inventory_id,request_id,amount,reason,created_at) VALUES(?,?,?,?,?)').run(item.id,id,-item.qty,'Consumo en pedido terminado',now());}
   const updated=updateItem('requests',id,b,[...fields,'updated_at']);
   if(Object.hasOwn(b,'status')&&b.status!==old.status)logEvent(id,'estado',`Estado: ${old.status} → ${b.status}`);
   if(Object.hasOwn(b,'quote')&&Number(b.quote)!==Number(old.quote))logEvent(id,'presupuesto',`Presupuesto actualizado: $${Number(b.quote).toFixed(2)}`);
   if(Object.hasOwn(b,'due_date')&&b.due_date!==old.due_date)logEvent(id,'fecha',`Fecha comprometida: ${b.due_date||'sin asignar'}`);
   if(Object.hasOwn(b,'internal_notes')&&b.internal_notes!==old.internal_notes)logEvent(id,'nota','Notas internas actualizadas');
   if(Object.hasOwn(b,'client_approved')&&Number(b.client_approved)!==Number(old.client_approved))logEvent(id,'aprobacion',b.client_approved?'Cliente aprobó el presupuesto (registrado por Admin)':'Aprobación del cliente retirada');
   if(finalizing)logEvent(id,'stock','Consumo de materiales aplicado al finalizar producción');
   DB.exec('COMMIT');return send(res,200,updated);
  }catch(e){DB.exec('ROLLBACK');throw e;}
 }
 const idMatch=p.match(/^\/api\/admin\/(inventory|expenses|payments|machines|products|reviews)\/(\d+)$/);
 const baseMatch=p.match(/^\/api\/admin\/(inventory|expenses|payments|machines|products|reviews)$/);
 const defs={inventory:['category','name','material','color','unit','stock','min_stock','cost_unit'],expenses:['category','description','amount','date'],payments:['request_id','kind','amount','method','description','date'],machines:['name','status','cost_hour','buffer_pct','setup_minutes','notes'],products:['title','category','description','price','emoji','active'],reviews:['name','rating','comment','status','reply']};
 if(baseMatch&&method==='POST'){const table=baseMatch[1];if(table==='reviews')err(403,'Las reseñas se generan desde pedidos entregados');const b=await body(req);numberFields(b,['stock','min_stock','cost_unit','amount','cost_hour','buffer_pct','setup_minutes','price','active','request_id']);if(table==='inventory'){if(!str(b.name,100).trim())err(400,'Ingresá el nombre del artículo.');if(b.category==='filamento'){if(!str(b.material,70).trim()||!str(b.color,70).trim())err(400,'Los filamentos necesitan material y color.');if(b.unit==='kg'){b.stock=Number((Number(b.stock)*1000).toFixed(3));b.min_stock=Number((Number(b.min_stock)*1000).toFixed(3));b.cost_unit=Number(b.cost_unit)/1000;b.unit='g';}else if(b.unit!=='g')err(400,'El filamento se carga en kg y se calcula internamente en gramos.');if(!(b.cost_unit>0))err(400,'Ingresá el precio por kilogramo del filamento ($/kg).');}}const vals=defs[table].map(f=>b[f]??(f==='active'?1:f==='date'?today():''));if(table==='payments'&&!(Number(b.amount)>0))err(400,'El importe debe ser mayor que cero');if(table==='payments'&&b.kind==='anticipo'&&b.method!=='Transferencia')err(400,'Los anticipos de GT-3D se reciben únicamente por transferencia.');if(table==='expenses'&&!(Number(b.amount)>0))err(400,'El importe debe ser mayor que cero');if(table==='payments'&&b.request_id&&!get('SELECT id FROM requests WHERE id=?',b.request_id))err(400,'Pedido no encontrado');if(table==='payments'&&b.request_id){const r=get('SELECT * FROM requests WHERE id=?',b.request_id);if(['cancelado','rechazado'].includes(r.status))err(409,'No registres cobros en pedidos cancelados.');if(r.quote<=0)err(409,'Primero guardá el presupuesto antes de registrar un cobro asociado.');const paid=get('SELECT COALESCE(SUM(amount),0) n FROM payments WHERE request_id=?',b.request_id).n;if(paid+Number(b.amount)>Number(r.quote)+0.01)err(409,'El cobro supera el saldo pendiente del presupuesto.');}const cols=defs[table].join(',');const holders=defs[table].map(()=>'?').join(',');let query=`INSERT INTO ${table}(${cols}) VALUES(${holders})`;if(table==='expenses'||table==='payments')query=query.replace(') VALUES',',created_at) VALUES').replace(/\)$/,',?)'),vals.push(now());if(table==='inventory')query=query.replace(') VALUES',',created_at) VALUES').replace(/\)$/,',?)'),vals.push(now());const id=transaction(()=>{const inserted=Number(DB.prepare(query).run(...vals).lastInsertRowid);if(table==='payments'&&b.request_id)logEvent(Number(b.request_id),'pago',`Cobro acreditado: $${Number(b.amount).toFixed(2)} · ${str(b.method,25)} · ${str(b.kind,30)}`);return inserted;});return send(res,201,get(`SELECT * FROM ${table} WHERE id=?`,id));}
 if(idMatch&&method==='PATCH'){const table=idMatch[1],id=Number(idMatch[2]),b=await body(req);numberFields(b,['stock','min_stock','cost_unit','amount','cost_hour','buffer_pct','setup_minutes','price','active']);if(table==='inventory'){const prev=get('SELECT * FROM inventory WHERE id=?',id);if(!prev)err(404,'Artículo no encontrado');const category=b.category||prev.category;if(category==='filamento'){if(Object.hasOwn(b,'material')&&!str(b.material).trim()||Object.hasOwn(b,'color')&&!str(b.color).trim())err(400,'Los filamentos necesitan material y color.');if(b.unit==='kg'){if(Object.hasOwn(b,'stock'))b.stock=Number((Number(b.stock)*1000).toFixed(3));if(Object.hasOwn(b,'min_stock'))b.min_stock=Number((Number(b.min_stock)*1000).toFixed(3));if(Object.hasOwn(b,'cost_unit'))b.cost_unit=Number(b.cost_unit)/1000;b.unit='g';}else if(Object.hasOwn(b,'unit')&&b.unit!=='g')err(400,'Unidad inválida de filamento.');}}if(table==='reviews'&&Object.hasOwn(b,'status')&&!['pendiente','publicada','oculta'].includes(b.status))err(400,'Estado de reseña inválido');if(table==='reviews'&&Object.hasOwn(b,'rating'))delete b.rating;const row=updateItem(table,id,b,defs[table]);return send(res,200,row);}
 if(idMatch&&method==='DELETE'){const table=idMatch[1];if(!['products','expenses','machines','inventory'].includes(table))err(403,'No se permite eliminar ese registro');const id=Number(idMatch[2]);if(table==='machines'&&get('SELECT count(*) n FROM requests WHERE machine_id=?',id).n)err(409,'La máquina tiene historial de pedidos');DB.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);return send(res,200,{ok:true});}
 if(p==='/api/admin/move'&&method==='POST'){const b=await body(req),i=get('SELECT * FROM inventory WHERE id=?',Number(b.inventory_id));if(!i)err(404,'Artículo no encontrado');const rawDelta=Number(b.amount),delta=i.category==='filamento'&&b.unit==='kg'?Number((rawDelta*1000).toFixed(3)):rawDelta,reason=str(b.reason,100);if(b.unit==='kg'&&i.category!=='filamento')err(400,'Este movimiento no corresponde a un filamento.');if(!Number.isFinite(delta)||delta===0)err(400,'Ingresá un movimiento válido');if(i.stock+delta<0)err(400,'No hay stock suficiente');transaction(()=>{DB.prepare('UPDATE inventory SET stock=stock+? WHERE id=?').run(delta,i.id);DB.prepare('INSERT INTO inventory_moves(inventory_id,request_id,amount,reason,created_at) VALUES(?,?,?,?,?)').run(i.id,Number(b.request_id)||null,delta,reason||'Ajuste manual',now());});return send(res,200,{ok:true,stock:i.stock+delta});}
 if(p==='/api/admin/shifts'&&method==='POST'){const b=await body(req),id=Number(b.machine_id),date=str(b.date,10);if(!get('SELECT id FROM machines WHERE id=?',id)||!/^\d{4}-\d{2}-\d{2}$/.test(date))err(400,'Impresora o fecha inválida');const shifts=Array.isArray(b.shifts)?b.shifts:[];if(shifts.length>5)err(400,'Máximo 5 franjas por fecha');for(const shift of shifts)if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.end)||shift.start===shift.end)err(400,'Horarios inválidos');transaction(()=>{DB.prepare('INSERT OR IGNORE INTO day_overrides(machine_id,date) VALUES(?,?)').run(id,date);DB.prepare('DELETE FROM day_shifts WHERE machine_id=? AND date=?').run(id,date);for(const sh of shifts)DB.prepare('INSERT INTO day_shifts(machine_id,date,start_time,end_time) VALUES(?,?,?,?)').run(id,date,sh.start,sh.end);});return send(res,200,{ok:true,warnings:findConflicts(requestSummary(),list('SELECT * FROM machines'),list('SELECT * FROM weekly'),list('SELECT * FROM day_shifts'),list('SELECT * FROM day_overrides'))});}
 if(p==='/api/admin/weekly'&&method==='POST'){const b=await body(req),id=Number(b.machine_id);if(!get('SELECT id FROM machines WHERE id=?',id))err(400,'Impresora inválida');const shifts=Array.isArray(b.shifts)?b.shifts:[];for(const s of shifts)if(!Number.isInteger(Number(s.weekday))||Number(s.weekday)<0||Number(s.weekday)>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)||s.start===s.end)err(400,'Franja inválida');transaction(()=>{DB.prepare('DELETE FROM weekly WHERE machine_id=?').run(id);for(const s of shifts)DB.prepare('INSERT INTO weekly(machine_id,weekday,start_time,end_time) VALUES(?,?,?,?)').run(id,Number(s.weekday),s.start,s.end);});return send(res,200,{ok:true});}
 const sched=p.match(/^\/api\/admin\/schedule\/(\d+)$/);
 if(sched&&method==='POST'){const id=Number(sched[1]),b=await body(req),r=get('SELECT * FROM requests WHERE id=?',id);if(!r)err(404,'No existe el pedido');if(!['confirmada','en_cola','imprimiendo','modelando','aprobacion'].includes(r.status))err(400,'El pedido debe estar confirmado antes de programarlo');const slot=suggestSlot(id,Number(b.machine_id)||r.machine_id);if(!slot)err(409,'No encontramos una franja continua disponible en los próximos 45 días');transaction(()=>{DB.prepare('UPDATE requests SET planned_start=?,planned_end=?,machine_id=?,status=?,updated_at=? WHERE id=?').run(slot.start,slot.end,slot.machine_id,'en_cola',now(),id);logEvent(id,'agenda',`Impresión programada: ${slot.start} → ${slot.end}`);});return send(res,200,slot);}
 const slotMatch=p.match(/^\/api\/admin\/suggest\/(\d+)$/);if(slotMatch&&method==='GET'){return send(res,200,{slot:suggestSlot(Number(slotMatch[1]),Number(u.searchParams.get('machine_id'))||undefined)});}
 const fileMatch=p.match(/^\/api\/admin\/files\/(\d+)$/);if(fileMatch&&method==='GET'){const f=get('SELECT name,mime,bytes FROM uploads WHERE id=?',Number(fileMatch[1]));if(!f)err(404,'Archivo no encontrado');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${f.name.replace(/["\\\n\r]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});return res.end(f.bytes);}
 err(404,'Ruta no encontrada');
 }catch(e){if(res.writableEnded||res.destroyed)return;const code=e.status||500;if(code>=500)console.error(e);send(res,code,{error:code>=500?'Error interno del servidor':e.message});}});
server.listen(port,'0.0.0.0',()=>{console.log(`GT-3D listo en http://localhost:${port}`);if(IS_DEMO)console.warn('MODO DEMO: la base de datos de Render Free es temporal; no ingresar datos reales ni confiar en su persistencia.');console.log('Para ingresar a Admin usá la clave configurada en ADMIN_PASSWORD'+(process.env.ADMIN_PASSWORD?'':' o guardada en data/.admin-password'));if(!process.env.ADMIN_PASSWORD)console.log('Clave inicial de administración: '+ADMIN_PASSWORD);});
