#!/usr/bin/env node
'use strict';
// GT-3D: importar las 32 fotos editadas al inventario fotográfico de productos
// existentes, conservando pedidos, tarifas, inventario y el resto del catálogo.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');
const ROOT = path.resolve(__dirname, '..');
const dataDir = path.resolve(process.env.GT3D_DATA_DIR || path.join(ROOT,'data'));
const dbPath = path.join(dataDir,'gt3d.sqlite');
if (!fs.existsSync(dbPath)) {
 console.error('No encontré la base de datos: ' + dbPath);
 console.error('Primero ejecutá la web una vez para crearla.');
 process.exit(1);
}
const expected = [
 'Llavero QR de Spotify','Llavero con nombre o fecha','Llavero personalizado','Llavero Pokémon iniciales','Llavero 2D',
 'Maceta de cactus','Maceta Robert con libro','Maceta Robert Mamá','Maceta Robert sentado','Maceta Robert cola articulada',
 'Maceta con textura','Molde para maceta','Maceta Bulbasaur','Maceta espiralizada','Maceta low poly',
 'Porta sahumerio Darth Vader','Fundas para iPhone','Porta auriculares','Porta celular','Porta celular con marca',
 'Smurf Cat','Máscara Sub-Zero','Balance Tetris','Encendedor mariposa','Lapicera mariposa',
 'Cortadores Pokémon','Cortadores navideños','Cortadores Los Simpsons','Cortadores Star Wars','Cortadores tren y vagones',
 'Tiburón articulado con anzuelo','Shen Long articulado','Camaleón articulado','Lagartija articulada','Cubo infinito'
];
const ids = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,30,31,32,33,34,35];
async function main(){
 const db = new DatabaseSync(dbPath);
 try {
   const valid = ids.filter(id => {
     const product = db.prepare('SELECT id,title FROM products WHERE id=?').get(id);
     const matches = product && product.title === expected[id-1];
     if (!matches) console.warn(`Omitido ${String(id).padStart(2,'0')}: no coincide el producto original (podría haber sido modificado).`);
     return matches;
   });
   if (!valid.length) { console.log('No encontré productos originales para actualizar; no se modificó nada.'); return; }
   const backups=path.join(dataDir,'backups');
   fs.mkdirSync(backups,{recursive:true});
   const stamp=new Date().toISOString().replace(/[:.]/g,'-');
   const backupPath=path.join(backups,`gt3d-antes-fotos-${stamp}.sqlite`);
   await backup(db,backupPath);
   console.log('Copia de seguridad creada: '+backupPath);
   const insert=db.prepare(`INSERT INTO product_photos(product_id,mime,bytes,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(product_id) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes,updated_at=excluded.updated_at`);
   db.exec('BEGIN IMMEDIATE');
   try {
     for(const id of valid) {
       const photo=path.join(ROOT,'assets','catalog',String(id).padStart(2,'0')+'.webp');
       if (!fs.existsSync(photo))throw new Error('Falta la foto '+photo);
       insert.run(id,'image/webp',fs.readFileSync(photo),new Date().toISOString());
     }
     db.exec('COMMIT');
     console.log(`Actualizadas ${valid.length} fotos. Las fotos 27, 28 y 29 no se modificaron.`);
   }catch(err){db.exec('ROLLBACK');throw err;}
 }finally{db.close();}
}
main().catch(err=>{console.error(err.message);process.exitCode=1});
