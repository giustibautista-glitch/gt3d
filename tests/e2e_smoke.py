"""Prueba de interfaz GT-3D sin navegación HTTP (entorno de pruebas restringido).
Requiere Playwright y Chromium instalados. Ejecutar: python tests/e2e_smoke.py.
Se usa un snapshot real de /api/admin/state, no reemplaza el smoke en una web desplegada.
"""
import json, os, tempfile, time, subprocess, socket, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def freeport():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='gt3d-ui-') as temp:
 port=freeport();env={**os.environ,'GT3D_DATA_DIR':temp,'PORT':str(port),'ADMIN_PASSWORD':'PasswordForUITest2026'}
 proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  base=f'http://127.0.0.1:{port}'
  for _ in range(70):
   try:
    with urllib.request.urlopen(base+'/api/health',timeout=.3):break
   except Exception:time.sleep(.08)
  def get_json(url,method='GET',data=None,cookie=None):
   headers={'Content-Type':'application/json'}
   if cookie:headers['Cookie']=cookie
   request=urllib.request.Request(base+url,method=method,headers=headers,data=json.dumps(data).encode() if data else None)
   with urllib.request.urlopen(request,timeout=3) as res:return json.load(res),res.headers
  (_,headers)=get_json('/api/login','POST',{'password':'PasswordForUITest2026'})
  cookie=headers.get('Set-Cookie').split(';')[0]
  public=get_json('/api/public')[0]
  # Snapshot real con pedido completo creado por el servidor.
  get_json('/api/admin/requests','POST',{'client_name':'Cliente interfaz','phone':'3415555544','service':'impresion','quantity':2,'description':'Quiero imprimir dos soportes de repisa para mi casa','details':{'dimensions':'10x15cm','usage':'Funcional'},'files':[]},cookie)
  snapshot=get_json('/api/admin/state',cookie=cookie)[0]
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1366,'height':900})
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   page.set_content('<div id="app"></div><div id="modal-root"></div><div id="toast"></div>')
   page.add_style_tag(content=(ROOT/'styles.css').read_text().split('\n',1)[1])
   # Mock limitado a lectura con los mismos datos que devuelve el servidor real.
   page.evaluate('''(data)=>{window.__data=data;window.fetch=async function(url,opts){let path=String(url);let payload=path==='/api/public'?window.__data.public:path==='/api/me'?{authenticated:true}:path==='/api/admin/state'?window.__data.admin:{ok:true};return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>JSON.parse(JSON.stringify(payload))}};window.scrollTo=()=>{};}''',{'public':public,'admin':snapshot})
   page.add_script_tag(content=(ROOT/'app.js').read_text())
   page.locator('a[href="#admin/inicio"]').first.click()
   page.get_by_text('Bandeja de próximas acciones').wait_for(timeout=3000)
   assert page.locator('button[data-action=order-quote]').count()>0
   for tab in ['pedidos','cotizador','produccion','inventario','finanzas','catalogo','resenas','configuracion','inicio']:
    page.locator(f'a[href="#admin/{tab}"]').first.click()
    page.wait_for_timeout(90)
    assert page.locator('.admin-page').count()==1,tab
   page.locator('button[data-action=order-detail]').first.click()
   assert page.get_by_text('Historial del pedido').count()>0
   assert page.get_by_text('10x15cm').count()>0
   assert page.locator('textarea[name=internal_notes]').count()==1
   page.locator('button[data-action=close-modal]').click()
   # Cotizador: sin valores inventados que se transformen en presupuesto silenciosamente.
   page.locator('a[href="#admin/cotizador"]').first.click()
   assert page.locator('#quote-form [name=grams]').input_value()=='0'
   assert page.locator('#quote-form [name=print_hours]').input_value()=='0'
   wa=page.evaluate('''()=>{window.open=(url)=>{window.lastWhatsApp=url;return null;};whatsappTo('0341 15-5551234','Mensaje de prueba');return window.lastWhatsApp;}''')
   assert 'wa.me/5493415551234' in wa,wa
   assert not errors,errors
   browser.close()
  print('PASS UI headless: nueve secciones + bandeja + ficha + historial + cotizador sin F5')
 finally:
  proc.terminate()
  try:proc.wait(timeout=3)
  except subprocess.TimeoutExpired:proc.kill()
