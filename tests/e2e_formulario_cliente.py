"""Smoke visual form simplificado GT-3D V2.9.4 en Chromium con fetch simulado.
No sustituye una prueba de la web desplegada. Ejecutar: python tests/e2e_formulario_cliente.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
services=['impresion','modelado','modelado_impresion','repuestos','prototipos','catalogo','universitarios']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':375,'height':812})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<div id="app"></div><div id="modal-root"></div><div id="toast" role="status"></div>')
 page.add_style_tag(content=(root/'styles.css').read_text().split('\n',1)[1])
 page.evaluate("""()=>{window.__requests=[];window.fetch=async (url,opts)=>{let u=String(url);let body=null;if(u==='/api/requests'){body=JSON.parse(opts.body);window.__requests.push(body)};let out=u==='/api/public'?{settings:{whatsapp:'5493412140690',public_pla_days:'5 a 10 días hábiles',public_design_days:'5 a 15 días hábiles',public_university_days:'5 a 15 días hábiles',public_catalog_days:'2 a 3 días hábiles'},products:[],reviews:[]}:u==='/api/me'?{authenticated:false}:u==='/api/requests'?{id:1,code:'GT-0001'}:{ok:true};return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>out};};window.scrollTo=()=>{}}""")
 page.add_script_tag(content=(root/'app.js').read_text())
 page.get_by_text('Ideas que toman',exact=False).first.wait_for()
 for service in services:
  page.evaluate('(code)=>openRequest(code)',service)
  form=page.locator('#request-form')
  assert form.count()==1,service
  assert form.get_by_text('Sin definir').count()==1,service
  assert not page.locator('#request-date-wrapper').is_visible(),service
  assert page.locator('input[name="desired_date"]').is_disabled(),service
  assert page.locator('input[name="phone"]').get_attribute('required') is not None,service
  assert page.get_by_text('Agregar más detalles').count()>0,service
  form.locator('select[name=date_choice]').select_option('date')
  assert page.locator('#request-date-wrapper').is_visible(),service
  assert page.locator('input[name="desired_date"]').is_enabled(),service
  assert page.locator('input[name="desired_date"]').get_attribute('required') is not None,service
  form.locator('select[name=date_choice]').select_option('undefined')
  assert not page.locator('#request-date-wrapper').is_visible(),service
  if service != 'modelado':
   assert form.locator('[name=color]').get_attribute('required') is not None, service
   form.locator('[name=color]').select_option('Varios colores, aclarar por WhatsApp')
  form.locator('[name=client_name]').fill('María Test')
  form.locator('[name=phone]').fill('3411234567')
  form.locator('[name=description]').fill('Necesito presupuestar una pieza de prueba para mi proyecto')
  form.locator('input[name=privacy_consent]').check()
  form.locator('button[type=submit]').click()
  page.get_by_text('¡Solicitud recibida!').wait_for(timeout=2000)
  stored=page.evaluate('window.__requests.at(-1)')
  assert stored['desired_date']=='' and stored['delivery']=='Retiro coordinado',service
  assert stored['service']==service,service
  page.evaluate('modalClose()')
 # Chequear que una fecha elegida sí se envía
 page.evaluate('openRequest("universitarios")')
 form=page.locator('#request-form')
 form.locator('[name=color]').select_option('Blanco')
 form.locator('[name=client_name]').fill('María Test')
 form.locator('[name=phone]').fill('3411234567')
 form.locator('[name=description]').fill('Necesito imprimir una maqueta arquitectónica para la facultad')
 form.locator('select[name=date_choice]').select_option('date')
 form.locator('input[name=desired_date]').fill('2027-06-30')
 form.locator('input[name=privacy_consent]').check()
 form.locator('button[type=submit]').click()
 page.get_by_text('¡Solicitud recibida!').wait_for(timeout=2000)
 assert page.evaluate('window.__requests.at(-1).desired_date')=='2027-06-30'
 # Validación visible de teléfono y archivos pesados, sin enviar solicitud.
 page.evaluate('modalClose(); openRequest("impresion")')
 form=page.locator('#request-form')
 form.locator('[name=client_name]').fill('María Test')
 form.locator('[name=phone]').fill('abc123')
 form.locator('[name=description]').fill('Necesito una pieza de prueba de mi modelo')
 form.locator('input[name=privacy_consent]').check()
 before=page.evaluate('window.__requests.length')
 form.locator('button[type=submit]').click()
 assert page.evaluate('window.__requests.length')==before
 form.locator('[name=phone]').fill('3412223344')
 form.locator('input[name=files]').set_input_files({'name':'modelo.stl','mimeType':'application/octet-stream','buffer':b'x'*5_000_001})
 assert '5 MB' in page.locator('#request-file-status').inner_text()
 assert form.locator('[data-action=clear-request-files]').is_visible()
 form.locator('button[type=submit]').click()
 assert page.evaluate('window.__requests.length')==before
 form.locator('[data-action=clear-request-files]').click()
 assert 'No agregaste archivos' in page.locator('#request-file-status').inner_text()
 assert not errors,errors
 print(f'PASS navegador: {len(services)} formularios sin fecha + solicitud con fecha, móvil 375px, sin errores de JS')
 browser.close()
