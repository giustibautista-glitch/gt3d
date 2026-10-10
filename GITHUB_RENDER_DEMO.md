# GT-3D — Compartir versión de prueba con amigos usando GitHub y Render Free

## Qué se publica

La web pública, el catálogo con fotografías, los formularios y el panel privado de GT-3D. **Es una demo, no la web para aceptar pedidos reales.** Se crea una base SQLite temporal en cada arranque si no existía.

**Limitación clave:** Render Free apaga el servicio después de unos 15 minutos sin tráfico. Al dormirse, reiniciarse o desplegarse, se pierde la base SQLite local y con ella las solicitudes, fotos cambiadas desde Admin, reseñas, stock y movimientos. Los archivos `assets/catalog/*.webp` incluidos en GitHub sí vuelven a aparecer. Una solicitud de prueba puede perderse incluso minutos después. No usar datos reales.

Referencia: https://render.com/docs/free

## 1. Subir a GitHub

1. Entrá a https://github.com/new y creá un repositorio **privado** llamado, por ejemplo, `gt3d-demo` (o público si sabés qué contenido estás publicando). Evitá inicializarlo con un README para simplificar.
2. Descomprimí este ZIP. **Subí el contenido de la carpeta que incluye `server.js`, `package.json`, `render.yaml` e `index.html` en la raíz del repositorio. NO subas el ZIP como si fuera la aplicación.**
3. En el repositorio, elegí `Add file` → `Upload files`, agregá los archivos/carpetas extraídos y confirmá el commit. La interfaz web de GitHub puede omitir carpetas vacías, no importa. Si no permite incluir subcarpetas con drag and drop, usá GitHub Desktop o Git en tu PC.
4. Comprobá que veas `render.yaml` y `server.js` en la pantalla inicial del repositorio.

**Nunca subas:** `data/`, `.env`, `.admin-password`, `.secret`, archivos de clientes, contraseñas o un respaldo SQLite. `.gitignore` protege al trabajar con Git, pero revisá los archivos antes de confirmarlos.

## 2. Conectar a Render con Blueprint

1. Entrá a https://dashboard.render.com/ y autorizá el acceso a GitHub al conectar la cuenta.
2. En Render usá `New` → `Blueprint`. Seleccioná el repositorio de GitHub que creaste. Render encontrará `render.yaml`.
3. Cuando te solicite `ADMIN_PASSWORD`, ingresá una contraseña **única de al menos 12 caracteres**, mejor 20 o más. Elegí una que no uses en otras cuentas. **No la escribas en GitHub.**
4. Render generará `SESSION_SECRET` automáticamente. Mantené `GT3D_DEMO_MODE=1`, `NODE_ENV=production` y `GT3D_DATA_DIR=/tmp/gt3d-demo`.
5. Confirmá `Apply`/`Deploy`. Cuando termine, abrí el enlace `https://...onrender.com` que Render te asigne.
6. La primera carga puede tardar ~1 minuto si el servicio estaba dormido. `https://...onrender.com/api/health` debe devolver `ok: true` y `demo: true`.
7. Abrí `https://...onrender.com/#admin/inicio` e ingresá tu `ADMIN_PASSWORD`.

### Alternativa: crear Web Service manualmente

En Render `New` → `Web Service` → conectá GitHub → seleccioná repositorio → Runtime **Node** → Instance Type **Free** → Build Command `npm install --omit=dev` → Start Command `npm start` → Health Check Path `/api/health`. En Environment configurá:

| Nombre | Valor |
|---|---|
| `NODE_VERSION` | `22.22.0` |
| `NODE_ENV` | `production` |
| `GT3D_DEMO_MODE` | `1` |
| `GT3D_DATA_DIR` | `/tmp/gt3d-demo` |
| `ADMIN_PASSWORD` | una contraseña única, >= 12 caracteres |
| `SESSION_SECRET` | una cadena aleatoria de >= 32 caracteres |

## 3. Cómo probar con tus amigos

- Compartiles **solo la URL pública**. No la clave de administrador.
- Pídeles que usen **nombres, teléfonos y archivos ficticios** y que prueben distintos servicios. No realicen transferencias.
- Probá el formulario sin fecha, con fecha, con fotos y archivos, en celular y computadora.
- La página guarda temporalmente el pedido y muestra su código. Abrir WhatsApp es opcional y **el mensaje NO se envía automáticamente**. Los archivos pesados deben adjuntarse manualmente en WhatsApp.
- Entrá a Admin para ver solicitudes y probar presupuestos/cambios de estado con datos ficticios.
- **Descargá el respaldo SQLite desde Admin → Configuración mientras el servidor siga activo** si querés conservar algo temporalmente. Render Free no guarda los datos y esta demo no incluye restauración desde el panel.

## 4. Si algo falla

- Repositorio: `server.js`, `render.yaml`, `package.json` deben estar en la **raíz**.
- Runtime: Node 22.22.0. El programa usa `node:sqlite`.
- Contraseña: revisá Render → Environment → `ADMIN_PASSWORD`. Si la cambiaste, las sesiones anteriores pueden dejar de servir.
- Página dormida: esperá un minuto y recargá.
- Base vacía o fotos modificadas desaparecidas: comportamiento esperado de Render Free.
- Si Render informa falta de variable secreta, completá `ADMIN_PASSWORD` y `SESSION_SECRET` en Environment y desplegá de nuevo.
- Mirá Render → Logs para conocer errores del arranque.

## 5. Antes de usarla con clientes de verdad

**No conviertas esta demo en producción simplemente quitando el aviso.** Hay que migrar a almacenamiento persistente para SQLite y archivos (disco de Render en plan pago, o refactorizar a una base alojada externamente), implementar respaldos automáticos/restauración, revisar seguridad, privacidad, términos y política de tratamiento de archivos/contratos. Para la prueba gratuita, no cargues datos reales.
