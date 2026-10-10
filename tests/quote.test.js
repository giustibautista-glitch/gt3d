'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=src.indexOf('function quoteCalc(){'),end=src.indexOf('function renderQuoteResult(){',start);
assert.ok(start>=0&&end>start,'No se encontró la función cotizadora');
const calcCode=src.slice(start,end)+'\nquoteCalc()';
const serviceNames={impresion:'Impresión',modelado:'Modelado',modelado_impresion:'Modelado + impresión',repuestos:'Repuestos',prototipos:'Prototipos',catalogo:'Catálogo',universitarios:'Maquetas y proyectos universitarios'};
function compute(fields={},settings={}){
 const state={admin:{requests:[{id:1,service:'impresion',quantity:1}],machines:[{id:1,cost_hour:350}],inventory:[{id:1,category:'filamento',cost_unit:10}],settings:{model_rate:12000,min_model:8000,model_cost_rate:5000,labor_rate:5000,labor_default_minutes:15,min_print:3500,material_waste_pct:0,deposit_pct:50,mult_impresion:1.85,mult_modelado:1,mult_modelado_impresion:1.85,mult_repuestos:2.2,mult_prototipos:2,mult_universitarios:1.85,mult_catalogo:2.1,mult_mayorista:1.8,bulk_min_quantity:10,bulk_mid_quantity:25,bulk_high_quantity:50,bulk_discount_first:5,bulk_discount_mid:10,bulk_discount_high:18,...settings}}};
 const ctx={state,serviceNames,$:()=>({}),dataForm:()=>({request_id:1,machine_id:1,filament_id:1,grams:0,print_hours:0,model_hours:0,labor_minutes:15,pricing_service:'impresion',quantity:1,bulk_mode:'no',manual_price:0,...fields}),n:x=>Number(x)||0};
 return vm.runInNewContext(calcCode,ctx);
}
test('modelado breve respeta mínimo de $8000 sin recargo adicional',()=>{const x=compute({model_hours:.25,pricing_service:'modelado'});assert.equal(x.modelSell,8000);assert.equal(x.total,8000);assert.equal(x.productionCost,0)});
test('hora de modelado cuesta $12000, sin mano de obra de fabricación',()=>{const x=compute({model_hours:1,pricing_service:'modelado'});assert.equal(x.total,12000);assert.equal(x.laborCost,0)});
test('impresión por encargo usa ×1,85',()=>{const x=compute({grams:400,print_hours:1});assert.equal(x.productionCost,5600);assert.equal(x.multiplier,1.85);assert.equal(x.total,10400)});
test('modelado + impresión aplica ×1,85 solo a fabricación',()=>{const x=compute({grams:400,print_hours:1,model_hours:.25,pricing_service:'modelado_impresion'});assert.equal(x.modelSell,8000);assert.equal(x.productionSell,10360);assert.equal(x.total,18400)});
test('una solicitud de modelado con impresión se clasifica como mixta',()=>{const x=compute({model_hours:1,grams:400,print_hours:1,pricing_service:'modelado'});assert.equal(x.pricingService,'modelado_impresion');assert.equal(x.total,22400)});
test('repuestos tiene multiplicador propio ×2,2',()=>{const x=compute({grams:400,print_hours:1,pricing_service:'repuestos'});assert.equal(x.multiplier,2.2);assert.equal(x.total,12400)});
test('prototipado y catálogo tienen su factor independiente',()=>{assert.equal(compute({grams:400,print_hours:1,pricing_service:'prototipos'}).total,11200);assert.equal(compute({grams:400,print_hours:1,pricing_service:'catalogo'}).total,11800)});
test('lote de 10 aplica 5% de descuento sobre el multiplicador del servicio',()=>{const x=compute({grams:400,print_hours:1,pricing_service:'repuestos',quantity:10,bulk_mode:'yes'});assert.equal(x.isBulk,true);assert.equal(x.bulkDiscount,5);assert.ok(Math.abs(x.multiplier-2.09)<1e-8);assert.equal(x.productionCost,5600);assert.equal(x.total,11800)});
test('producción en cantidad escalonada 25 y 50',()=>{const mid=compute({grams:400,print_hours:1,pricing_service:'catalogo',quantity:25,bulk_mode:'yes'});const hi=compute({grams:400,print_hours:1,pricing_service:'catalogo',quantity:50,bulk_mode:'yes'});assert.equal(mid.bulkDiscount,10);assert.equal(hi.bulkDiscount,18);assert.ok(Math.abs(mid.multiplier-1.89)<1e-8);assert.ok(Math.abs(hi.multiplier-1.722)<1e-8)});
test('lotes jamás reciben descuento sin activar y alcanzar el umbral',()=>{assert.equal(compute({grams:400,print_hours:1,quantity:9,bulk_mode:'yes'}).total,10400);assert.equal(compute({grams:400,print_hours:1,quantity:10,bulk_mode:'no'}).total,10400)});
test('mínimo mayorista y porcentaje se pueden cambiar',()=>{const x=compute({grams:400,print_hours:1,quantity:5,bulk_mode:'yes'},{bulk_min_quantity:5,bulk_discount_first:12});assert.equal(x.isBulk,true);assert.ok(Math.abs(x.multiplier-1.628)<1e-8);assert.equal(x.total,9200)});
test('mano de obra por unidad no se pierde en lotes',()=>{const x=compute({grams:400,print_hours:1,quantity:10,labor_minutes:15,unit_labor_minutes:3});assert.equal(x.laborMinutes,45);assert.equal(x.laborCost,3750)});
test('mano de obra configurable y solo para pedidos con fabricación',()=>{const x=compute({grams:400,print_hours:1,labor_minutes:30});assert.equal(x.laborCost,2500);assert.equal(x.productionCost,6850);assert.equal(x.total,12700)});
test('precio manual permite consultar ganancia estimada sin alterar costos',()=>{const x=compute({grams:400,print_hours:1,manual_price:7000});assert.equal(x.isManual,true);assert.equal(x.recommended,10400);assert.equal(x.total,7000);assert.equal(x.profit,1400)});

test('maquetas universitarias usan factor de fabricación propio y no duplican el modelado',()=>{
 const a=compute({grams:400,print_hours:1,pricing_service:'universitarios'});
 const b=compute({grams:400,print_hours:1,model_hours:1,pricing_service:'universitarios'});
 assert.equal(a.pricingService,'universitarios');assert.equal(a.multiplier,1.85);assert.equal(a.total,10400);
 assert.equal(b.pricingService,'universitarios');assert.equal(b.modelSell,12000);assert.equal(b.productionSell,a.productionSell);assert.equal(b.total,22400);
});
test('multiplicador de maquetas se personaliza sin modificar impresión general',()=>{
 const base=compute({grams:400,print_hours:1,pricing_service:'impresion'},{mult_universitarios:2.1});
 const uni=compute({grams:400,print_hours:1,pricing_service:'universitarios'},{mult_universitarios:2.1});
 assert.equal(base.multiplier,1.85);assert.equal(uni.multiplier,2.1);assert.equal(uni.total,11800);
});
