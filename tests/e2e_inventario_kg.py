"""Verificación de interfaz del inventario GT-3D 2.9.5 en Chromium con datos simulados."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':850})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<div id="app"></div><div id="modal-root"></div><div id="toast" role="status"></div>')
 page.add_style_tag(content=(root/'styles.css').read_text().split('\n',1)[1])
 page.evaluate("""()=>{window.__stockCalls=[];window.fetch=async (url,opts={})=>{
 const u=String(url);if(u==='/api/admin/inventory'){window.__stockCalls.push(JSON.parse(opts.body));}
 const obj=u==='/api/public'?{settings:{whatsapp:'5493412140690'},products:[],reviews:[]}:u==='/api/me'?{authenticated:false}:u==='/api/admin/inventory'?{id:90}:{ok:true};
 return {ok:true,status:201,headers:{get:()=> 'application/json'},json:async()=>obj};};} """)
 page.add_script_tag(content=(root/'app.js').read_text())
 page.get_by_text('Ideas que toman',exact=False).first.wait_for()
 page.evaluate("""()=>{state.admin={inventory:[],filament_prices:[],requests:[],payments:[],expenses:[],machines:[{id:1,name:'Hellbot'}],products:[],reviews:[],settings:{},scheduleWarnings:[]};addInventory();}""")
 form=page.locator('#inventory-add')
 assert form.count()==1
 assert form.locator('[name=category]').input_value()=='filamento'
 assert form.locator('[name=unit]').input_value()=='kg'
 assert form.locator('[name=unit]').is_disabled()
 assert form.locator('label[for=f_cost_unit]').inner_text()=='Precio por kilogramo ($/kg) *'
 assert form.locator('label[for=f_stock]').inner_text()=='Stock inicial (kg) *'
 assert form.locator('[name=color]').get_attribute('required') is not None
 form.locator('[name=name]').fill('PLA+ blanco')
 form.locator('[name=material]').fill('PLA+')
 form.locator('[name=color]').fill('Blanco')
 form.locator('[name=stock]').fill('1')
 form.locator('[name=min_stock]').fill('0.2')
 form.locator('[name=cost_unit]').fill('25000')
 form.locator('button[type=submit]').click()
 page.wait_for_function('window.__stockCalls.length===1')
 payload=page.evaluate('window.__stockCalls[0]')
 assert payload['category']=='filamento' and payload['unit']=='kg' and payload['stock']==1 and payload['cost_unit']==25000,payload
 page.evaluate('modalClose();addInventory();')
 form=page.locator('#inventory-add')
 form.locator('[name=category]').select_option('accesorio')
 assert form.locator('[name=unit]').input_value()=='unidad'
 assert form.locator('[name=unit]').is_enabled()
 assert form.locator('[name=color]').get_attribute('required') is None
 assert form.locator('label[for=f_cost_unit]').inner_text()=='Costo por unidad ($) *'
 assert not errors,errors
 print('PASS navegador Admin: bobina en kg y $/kg; color obligatorio en filamento; accesorio en unidades')
 browser.close()
