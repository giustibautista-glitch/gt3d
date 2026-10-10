"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('editor de fotos ofrece reemplazo, vista previa y restauración',()=>{
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const feature of ['Cambiar foto','Elegir o reemplazar foto','product-photo-preview','prepareProductPhoto','restore-photo','Restaurar foto original','data-action="edit-product"'])
  assert.ok(js.includes(feature),'Falta función '+feature);
});
test('catálogo y editor muestran imágenes completas sin recorte',()=>{
 const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 assert.match(css,/\.product-art\.photo-art img\{[^}]*object-fit:contain[^}]*object-position:center center/);
 assert.match(css,/\.photo-edit-box img\{[^}]*object-fit:contain[^}]*object-position:center center/);
 assert.match(css,/\.product-photo-full img\{[^}]*object-fit:contain/);
});
test('el catálogo permite ampliar fotos con controles accesibles',()=>{
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(js,/function productArt\(p\).*data-action="view-product-photo"/);
 assert.match(js,/function viewProductPhoto\(id\)/);
 assert.match(js,/case 'view-product-photo':viewProductPhoto\(id\);break;/);
 assert.match(js,/aria-label="Ver foto completa de/);
 assert.match(js,/modalOpen\(product.title/);
});
