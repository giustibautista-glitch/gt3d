'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('Todos los formularios públicos explican cómo enviar archivos pesados por WhatsApp',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/function requestFields\(service\)/);
 assert.match(app,/Si pesan demasiado/);
 assert.match(app,/registrá la solicitud/);
 assert.match(app,/mandalos después por WhatsApp indicando el código de pedido/);
 assert.match(app,/supera los 5 MB/);
 assert.match(app,/superan los 12 MB en total/);
 assert.match(app,/Archivos adjuntos allí: \$\{files.length\}/);
 assert.match(app,/adjuntalos manualmente en el chat e indicá el código/);
 assert.match(app,/No se envían automáticamente por WhatsApp/);
 assert.doesNotMatch(app,/Si pesan demasiado, compartí un enlace en el formulario/);
});
