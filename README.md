# GT-3D — DEMO GitHub + Render Free (v2.9.6)

**Empezá acá: [`GITHUB_RENDER_DEMO.md`](./GITHUB_RENDER_DEMO.md)**. Sigue las instrucciones de cómo crear el repo y desplegarlo en Render.

⚠️ **Atención:** en Render Free la base SQLite y las imágenes modificadas en Admin **son temporales** y pueden desaparecer cuando Render suspenda o reinicie la aplicación. Esta demo se destina solo a amigos/testers con datos ficticios; no a clientes reales.

```bash
npm start
```

Ejecuta  `npm test` para verificar los módulos antes de desplegar.

---

## Documentación del desarrollo original

## V2.9.4 — Solicitud de presupuesto más simple para clientes

Los formularios ahora tienen tres bloques claros: contacto, descripción y fecha/archivos. Los campos no obligatorios indican «(opcional)», la fecha permite «Sin definir» como opción inicial y los detalles técnicos quedan en un desplegable opcional. Se valida WhatsApp, cantidad y archivos; también se aclara que solicitar presupuesto no confirma un pedido ni exige pagar. Los clientes de maquetas mantienen el plazo orientativo de **5 a 15 días hábiles** con o sin modelado. Véase `MEJORAS_FORMULARIOS_V2_9_4.md` para detalle, pruebas y procedimiento de actualización.

## V2.9.3 — Archivos grandes por WhatsApp

En todos los formularios públicos se indica que si un archivo supera los límites de carga de la web debe enviarse manualmente por WhatsApp **después** de registrar la solicitud, incluyendo su código GT-XXXX. Abrir WhatsApp desde la web prepara un mensaje pero **no adjunta** los archivos del cliente. Si el archivo supera los límites de WhatsApp, coordinar otro método con GT-3D. No se cambian las restricciones de tamaño de subida ni los datos guardados.

# GT-3D V2.9.2 — Plazos unificados para maquetas universitarias

**Nuevo en V2.9.2:** el plazo de **Maquetas y proyectos universitarios** es de **5 a 15 días hábiles**, **tengan o no modelado**. Este valor se configura de forma independiente en Admin → Configuración → Tarifas y condiciones, bajo «Plazo web maquetas y proyectos universitarios (con o sin modelado)». Una instalación existente incorpora el nuevo campo con este valor inicial y conserva su base de datos.

No cambian los plazos generales de impresión (5–10 días hábiles), trabajos con modelado (5–15 días hábiles) ni catálogo estándar (2–3 días hábiles). Las fechas exactas se confirman tras evaluar el proyecto, la agenda, la aprobación y el anticipo.

## Historial: V2.9 — Maquetas y proyectos universitarios

Esta versión agrega un servicio específico para **maquetas de Arquitectura y Urbanismo, piezas para proyectos de Ingeniería y prototipos universitarios**. Permite recibir formularios simplificados con carrera, medidas finales, cantidad, estado de archivos, enlace a carpeta si los archivos son grandes y fecha deseada. Los archivos STL, 3MF, STEP, OBJ, DXF, DWG, SKP, IFC, PDF e imágenes se admiten como referencias, con los límites de subida existentes (hasta 4 archivos, 5 MB por archivo y 12 MB en total); los archivos CAD pueden requerir conversión/modelado.

- Para el cliente, el servicio aparece tanto en «Servicios» como en una sección especial de maquetas, con un botón para presupuestar.
- Para Admin, las solicitudes llegan como «Maquetas y proyectos universitarios», con todos los datos en la ficha y una opción propia en Cotizador.
- La fabricación usa el multiplicador **×1,85 inicial** (configurable en Admin → Configuración); el modelado se calcula aparte con las tarifas existentes. No se aplica un descuento universitario general ni se promete una entrega sin evaluación.
- Plazo orientativo: **5 a 15 días hábiles en todos los pedidos universitarios, con o sin modelado**. La fecha se confirma después de aceptar el presupuesto, registrar el anticipo y revisar la capacidad de producción.
- Se conservan los pedidos, precios y fotografías cargadas con anterioridad. Esta actualización suma una clave de configuración sin modificar las anteriores.
- Para maquetas grandes o complejas, se puede compartir un enlace a una carpeta de archivos. El acceso debe ser habilitado por el cliente; el sistema no descarga ni analiza los archivos de Drive automáticamente.

**Cómo actualizar:** detené el servidor, respaldá la carpeta `data/`, copiá el contenido del parche sobre el proyecto (o usá la versión completa con tu `data/` intacta), reiniciá con `npm start` y actualizá el navegador una vez con `Ctrl+Shift+R`. La página sigue siendo local hasta que se publique en un hosting adecuado.

**Pruebas:** 30 pruebas automáticas pasaron, incluida una solicitud universitaria con DWG y SKP que se recibe en Admin y se cotiza. La prueba automatizada del navegador no se pudo ejecutar en este entorno porque Chromium bloquea la navegación a localhost; conviene completar esa revisión visual en la PC antes de publicar.

---

## Funciones heredadas de V2.8 — Gestión rápida y control de pedidos

**Versión V2.8** (base V2.7). La web pública y Admin comparten una única base SQLite. Incluye todas las fotos del catálogo, visor completo, edición de productos, plazos **5 a 15 días hábiles cuando requiere modelado** y los factores de precio configurables.

**Novedades principales:** Bandeja de próximas acciones, ficha más completa, WhatsApp dirigido al cliente, presupuesto preparado versus enviado, cobro desde el pedido, controles de aprobación/anticipo/saldo, historial de movimientos, notas internas, cotizador sin estimaciones inventadas y cola de producción depurada. Ver `AUDITORIA_V2_8.md` y `GUIA_OPERATIVA_V2_8.md`.

## Instalación y actualización rápida

- Requiere Node.js **22.5 o posterior**, en una máquina local o servidor con almacenamiento persistente. Iniciá desde `gt3d-publicable/` con `npm start`, y entrá a `http://localhost:3000`.
- Para entrar a Admin, abrí **Panel privado** o `http://localhost:3000/#admin/inicio`; la primera contraseña se muestra en la terminal, si no configuraste `ADMIN_PASSWORD`. En producción usá una contraseña propia larga mediante variable de entorno.
- **Desde V2.7 u otra versión compatible:** cerrá el servidor (`Ctrl+C`), realizá una **copia externa de la carpeta completa `data/`**, descomprimí V2.8 en una carpeta nueva y copiá tu `data/` anterior dentro de `gt3d-publicable/`. No copies datos encima de un servidor que esté corriendo. Reiniciá `npm start` y refrescá una sola vez con `Ctrl+Shift+R`. Si usabas `GT3D_DATA_DIR`, conservá la ruta anterior.
- Como alternativa, con el **parche V2.8** reemplazá `server.js`, `app.js` e `index.html` de la V2.7, después de hacer copia de `data/`. No borres las fotos ni el directorio de datos. La migración agrega `internal_notes`, `client_approved` y `request_events`; **no inventa aprobaciones ni eventos anteriores**.
- Comprobaciones: `npm test` (26 pruebas automatizadas). Para la revisión visual en entorno de desarrollo con Chromium y Playwright: `python tests/e2e_smoke.py` (opcional, requiere dependencias externas; está preparado para la ubicación de Chromium de Linux de este entorno).

**Importante:** para marcar un pedido como confirmado, ahora debe tener presupuesto, anticipo acreditado **por transferencia**, **aprobación del cliente** registrada y stock suficiente para materiales asignados. Para marcarlo entregado, debe estar listo y tener saldo abonado. Si en datos antiguos había pedidos ya en curso, no se cambian automáticamente sus estados; verificá los movimientos históricos manualmente.

**No está publicada en Internet**. Falta completar `CHECKLIST_PUBLICACION.md` antes de aceptar pedidos reales.

---

# GT-3D V2.7 — Plazos actualizados para trabajos con modelado

**Nuevo:** el plazo orientativo de **cualquier trabajo que requiera modelado o diseño nuevo** es **5 a 15 días hábiles**. Incluye modelado solo, modelado + impresión, repuestos con modelado y prototipos que requieran diseño. Cuando un pedido puede imprimirse con un archivo ya listo, se mantiene **5 a 10 días hábiles**. Productos estándar de catálogo, sin modelado adicional: **2 a 3 días hábiles**. La fecha definitiva se confirma con el cliente antes de iniciar el trabajo.

**Instalación sin perder datos:** cerrá el servidor, respaldá la carpeta `data/` y reemplazá `server.js`, `app.js` e `index.html` por los de esta versión. Reiniciá con `npm start` y actualizá con `Ctrl + Shift + R`. Las imágenes, productos y pedidos no se modifican. El servidor actualiza automáticamente el plazo viejo **solo si seguía con el valor inicial "5 a 10 días hábiles"**; si ya lo habías personalizado en Admin, conserva tu ajuste. Podés editar el campo **"Plazo web trabajos con modelado"** en Admin → Configuración → Tarifas y condiciones.

---

# GT-3D — V2.6 · Fotos completas para clientes

**Nuevo en V2.6:** Las tarjetas de productos del catálogo público usan `object-fit: contain` y muestran cada imagen completa, sin recortar sus bordes. El cliente puede hacer clic o tocar la imagen para abrir un visor ampliado (también accesible mediante teclado); el visor se cierra con ×, Escape o tocando fuera. El editor de fotos de Admin también muestra la imagen completa. Se actualizó la versión de los archivos del navegador para evitar usar CSS/JS viejos por caché.

**Actualización sin perder datos:** Cerrá el servidor con `Ctrl + C`; hacé una copia de seguridad de `data/`. Podés reemplazar `app.js`, `styles.css` e `index.html` en tu instalación actual, o descomprimir V2.6 en otra carpeta y copiar allí tu antigua carpeta `data/`. Reiniciá con `npm start` y actualizá con `Ctrl + Shift + R`. No borres `data/`. Las fotos editadas de V2.5 están incluidas. Las fotografías que ya estuvieran recortadas en el archivo de origen no recuperarán las partes faltantes automáticamente.

---

# GT-3D V2.5 — Fotografías del catálogo actualizadas

Se incorporaron **32 imágenes** del ZIP «Fotos catalogo.zip» en `assets/catalog`, sustituyendo los productos 01–26 y 30–35. Los productos 27, 28 y 29 mantienen las imágenes anteriores, ya que no había fotos correspondientes en el ZIP.

En una instalación **nueva** las fotos se muestran automáticamente al iniciar. En una instalación **existente**, si habías reemplazado imágenes desde Admin, estas permanecen guardadas en la base de datos y tienen prioridad sobre las originales. Para actualizar también esas imágenes: con el servidor detenido, y luego de guardar una copia de la carpeta `data`, ejecutá `npm run import:fotos` desde la carpeta del proyecto. El comando crea además un respaldo SQLite en `data/backups` y reemplaza únicamente las fotos de productos cuyo nombre sigue coincidiendo con el catálogo inicial. **No borra ni altera inventario, solicitudes, clientes o precios.**

El nuevo archivo CSS de la V2.4 sigue centrando las imágenes al visualizarlas.

---

# GT-3D — V2.4 candidata para prepublicación

**V2.5:** todo lo de V2.4 más 32 fotografías editadas integradas. V2.4 incluía un nuevo sistema de fotos: las imágenes subidas se optimizan manteniendo su proporción original y el catálogo las encuadra con recorte centrado (el centro visible coincide con el centro de la imagen).

Aplicación web **unificada**: sitio público y panel privado `GT-3D Admin` sobre una base de datos SQLite. Preparada para el relanzamiento en **Rosario y alrededores**. Todo se puede instalar sin servicios de terceros para realizar pruebas locales; **no está publicada en Internet automáticamente**.

## Para probarla en tu computadora

**Necesitás:** Node.js 22.5 o superior (ideal: Node.js 22 LTS actualizado o 24).

1. Descomprimí la carpeta `gt3d-publicable`.
2. Abrí una terminal en esa carpeta.
3. Ejecutá `npm start`.
4. Abrí **http://localhost:3000** en tu navegador.
5. Entrá a **Panel privado**. La primera contraseña aparece en la terminal, y también queda guardada en `data/.admin-password`. Cambiala por una contraseña propia antes de compartir la web.
6. Si modificás un archivo del proyecto, reiniciá el servidor.

Para probar las operaciones automatizadas ejecutá `npm test` (**19 pruebas**). La versión también se revisó con una simulación de navegador que recorre las nueve secciones y opera contra un servidor local real.

**Actualización desde V2.2 (sin perder datos):** cerrá el servidor, hacé una copia completa de `data/`, descomprimí V2.3 en otra carpeta y copiá tu `data/` anterior dentro de `gt3d-publicable/`. Reiniciá con `npm start` y refrescá una sola vez con `Ctrl + Shift + R`. No reemplaces ni borres los archivos de clientes de `data/`. Si ya usás `GT3D_DATA_DIR`, conservá ese valor. El encabezado privado muestra `V2.4` para confirmar qué versión está corriendo.

**Windows:** podés abrir la carpeta con el Explorador, escribir `cmd` en la barra de direcciones y ejecutar `npm start`. Si falta Node.js, instalalo desde su sitio oficial y volvé a abrir la terminal.

## Qué contiene

### Web pública

- Inicio con **identidad GT-3D**, logotipo recuperado de las presentaciones de marca realizadas anteriormente y paleta blanco/negro/gris.
- Seis servicios: impresión de archivo, modelado, modelado + impresión, repuestos, prototipos y productos del catálogo.
- Formularios personalizados con nombre, WhatsApp, descripción, materiales, cantidad y hasta 4 archivos de 5 MB (total 12 MB); consentimiento para tratamiento de datos.
- El envío guarda la solicitud en SQLite, crea el código `GT-0001` y ofrece un mensaje de WhatsApp precompletado. **El cliente debe enviarlo**; no se envían WhatsApp automáticamente.
- Catálogo con **35 productos y fotografías extraídas del catálogo histórico proporcionado por el usuario**. Los precios viejos no se recuperan: todos figuran inicialmente como «A cotizar». Incluye búsqueda y filtro por categoría.
- Información de plazos: 5 a 15 días hábiles para trabajos que requieran modelado; 5 a 10 días hábiles para impresiones con archivo listo; 2 a 3 días hábiles para productos de catálogo sin modelado adicional, siempre desde confirmación y con fecha final a convenir.
- Rosario y alrededores, **solo retiro coordinado**; no se ofrecen entregas a domicilio.
- Contacto: WhatsApp 3412140690 (en formato internacional 5493412140690), Instagram `@gt3d.impresiones` y `gt3drosario@gmail.com`. Atención los días hábiles de 8 a 19 h.
- Calificaciones, reseñas reales y respuestas del negocio, visibles tras revisión; enlace único por pedido **entregado**.

### GT-3D Admin (`/#admin/inicio`)

- Contraseña y sesión privada; la API administrativa también requiere autenticación.
- **Pedidos y clientes** con fechas, archivos adjuntos, estados y presupuestos.
- **Cotizador** por servicio, con costos de filamento, horas de máquina, mano de obra, accesorios, desperdicio, modelado y descuento opcional por volumen.
- **Inventario** de filamentos y accesorios, reservas y consumos finales; incluye ocho insumos básicos con stock inicial **cero**, ajustables desde el panel, y tabla de precios de referencia para las marcas habituales.
- **Finanzas**: anticipos, saldos, cobros verificados, gastos y estimaciones de ganancias por trabajo.
- **Producción**: Hellbot Magna 1 V2 a $400/h provisionales; franjas semanales y excepciones diarias editables, incluidas franjas que cruzan la medianoche; sugerencias de turnos sin dividir una impresión continua.
- **Catálogo**: agregar, editar, borrar y ocultar/publicar productos; cambiar precio, categoría, descripción y **subir fotografías propias** en JPG/PNG/WebP, máximo 4,8 MB.
- **Reseñas**: aprobación, moderación y respuesta del negocio.
- **Configuración**: datos comerciales, tarifas, descuentos, anticipos, plazos, medios de contacto, y un **respaldo SQLite completo** con los adjuntos y las imágenes del catálogo.

## Tarifas iniciales (editables)

| Concepto | Valor inicial |
| --- | ---: |
| Modelado | $12.000/h |
| Mínimo de modelado exclusivo | $8.000 |
| Mano de obra de fabricación | $5.000/h |
| Preparación de pedido | 15 minutos |
| Costo de máquina Hellbot | $400/h (estimación, no medición) |
| Impresión por encargo | ×1,85 sobre costo de fabricación |
| Modelado + impresión | ×1,85 **solo en fabricación** |
| Repuestos | ×2,20 sobre fabricación |
| Prototipos | ×2,00 sobre fabricación |
| Productos de catálogo | ×2,10 sobre fabricación |
| Lote repetible 10–24 | 5% menos en la fabricación |
| Lote repetible 25–49 | 10% menos en la fabricación |
| Lote repetible ≥50 | 18% menos en la fabricación |

No hay descuentos automáticos sobre la tarifa de modelado. El valor de referencia de filamentos no representa stock físico real ni cotización actualizada en tiempo real.

## Publicar en Internet

La aplicación tiene un `Dockerfile` para implementarla en un proveedor que soporte contenedores y **volumen persistente** (por ejemplo, Railway, Render con disco persistente, VPS o servicio equivalente). No utilizar un despliegue sin almacenamiento duradero, porque SQLite necesita conservar los archivos entre reinicios.

1. Subí el código a un repositorio **privado** de GitHub o al proveedor elegido. **No subas la carpeta `data/`.**
2. Configurá la variable secreta `ADMIN_PASSWORD` (mínimo 8 caracteres, preferentemente muy larga y única).
3. Configurá `GT3D_DATA_DIR=/app/data`, `PORT=3000` si el proveedor lo necesita, y montá un disco/volumen persistente de lectura y escritura en **`/app/data`**.
4. Desplegá el contenedor y configurá HTTPS y dominio; verificá que el host permita escribir en la carpeta persistente. La app ofrece `/api/health` para monitoreo.
5. Comprobá desde una ventana privada: acceso público, envío de solicitud, WhatsApp, contraseña de administración, foto de catálogo, stock y reseña.
6. Descargá el respaldo SQLite completo desde **Admin → Configuración → Respaldo completo SQLite** y comprobá que puedas recuperarlo. Programá respaldos automáticos periódicos en el proveedor; el botón manual **no sustituye** las copias programadas. Si copiás directamente `data/`, hacelo con el servidor detenido o mediante una copia consistente de SQLite.
7. Validá las políticas comerciales, privacidad/protección de datos, identificación del proveedor y derechos del consumidor con asesoramiento adecuado antes de recibir ventas reales.

**Importante:** un archivo ZIP no constituye una página publicada; se necesita ejecutar el servicio y enlazarlo a un dominio. Tampoco se activan por defecto pagos automáticos ni integraciones de WhatsApp API. Los pagos por transferencia o efectivo se registran manualmente después de comprobar su recepción. Los anticipos se reciben solo por transferencia.

## Seguridad y datos

- Los archivos STL, 3MF, STEP y demás adjuntos a solicitudes no tienen URL pública; solo se descargan desde el panel privado.
- Las imágenes destinadas al catálogo son públicas. Podés subir una nueva foto por producto desde el panel; las fotos se guardan dentro de la base de datos persistente.
- Hay límite de tamaño de solicitudes, tipos de archivo permitidos y limitación básica de envíos por IP. Para publicar recomendamos protección adicional en el proxy del proveedor.
- Las fotos procedentes del catálogo antiguo pueden no representar exactamente disponibilidad actual: revisá los productos antes de recibir encargos.
- Reseñas verificadas publicadas tras revisión; no reemplazar las negativas legítimas por reseñas falsas.
- El calendario de producción **no enciende ni supervisa físicamente las impresoras**. Los turnos nocturnos exigen condiciones apropiadas de seguridad y supervisión.
- No modifiques la fecha de entrega comprometida sin avisar y acordar con el cliente.
- Si migrás desde V1.5, conservá una copia del antiguo directorio `data/` y trasladalo a esta versión: el programa agrega la nueva tabla de fotos automáticamente. Los productos antiguos que hubieras dejado ocultos conservarán su visibilidad.

## Estructura

`server.js`: servidor HTTP y SQLite. `app.js`: interfaz. `styles.css`: estilos responsive. `assets/logo-*.png`: logotipos de la guía Work. `assets/catalog/*.webp`: imágenes del PDF histórico. `tests/`: pruebas automáticas. `Dockerfile`: despliegue en contenedores.


## V2.1 — Corrección de acceso a GT-3D Admin

Se corrigió la navegación del botón «Panel privado», que cambiaba la URL sin mostrar el acceso. Ahora al abrir `http://localhost:3000/#admin/inicio` aparece el formulario de contraseña.

Si venís de V2.0 y ya tenés pedidos guardados:

1. Detené el servidor con **Ctrl + C** en la terminal.
2. **Hacé una copia de seguridad de la carpeta `data/`**, si existe. No borres esa carpeta: contiene la base de datos local y la clave administrativa.
3. Reemplazá únicamente el archivo `app.js` de tu instalación por el `app.js` corregido, o actualizá los archivos del proyecto manteniendo intacta `data/`.
4. Ejecutá `npm start` y recargá la página con **Ctrl + Shift + R**.
5. Entrá haciendo clic en «Panel privado» o desde `http://localhost:3000/#admin/inicio`.

La contraseña inicial del panel se mostró al iniciar el servidor por primera vez y se conserva en `data/.admin-password` si no configuraste `ADMIN_PASSWORD`. No compartas esta clave públicamente.


## Novedades V2.2: editar fotografías del catálogo

1. Entrá a **Panel privado → Catálogo web**.
2. En el producto que querés actualizar, tocá **Cambiar foto** (o **Editar**).
3. La primera sección del formulario muestra la fotografía actual. Tocá **Elegir o reemplazar foto**, seleccioná una imagen y verificá la **vista previa**.
4. Tocá **Guardar cambios y foto** y esperá la confirmación. La imagen aparece tanto en el panel como en la web pública.
5. Si ya subiste otra fotografía, también podrás tocar **Restaurar foto original** para volver a la imagen histórica del catálogo (en artículos nuevos vuelve al marcador genérico).

La web acepta JPG, PNG, WebP y AVIF como entrada hasta **20 MB** por imagen. En V2.4 y posteriores, la imagen se optimiza **manteniendo su proporción original**, se guarda en WebP y se comprueba que pese menos de 4,8 MB. En la versión actual el catálogo la muestra completa, sin recortarla. Si el navegador no admite decodificar el archivo, convertí la fotografía a JPG o PNG. No se necesita un programa externo para recortarla.

Las fotografías del catálogo público ahora se presentan con `object-fit: contain`, sin cortar los bordes. El identificador de versión de cada foto evita que el navegador conserve una copia anterior después de reemplazarla.

### Actualizar desde V2.1 sin perder pedidos ni inventario

Detené el servidor con **Ctrl + C** y guardá una copia de respaldo de la carpeta **`data/`**. Reemplazá **solo los archivos `app.js`, `server.js` y `styles.css`** de tu carpeta `gt3d-publicable` por los de la carpeta `GT3D_PARCHE_FOTOS_V2_2`; no reemplaces ni borres `data/`. Luego ejecutá `npm start` y recargá en el navegador con **Ctrl + Shift + R**.

Si instalás el ZIP completo, copiá la carpeta **`data/` de tu versión anterior** a la versión nueva antes de iniciar el servidor. La base de datos conserva los pedidos, productos, reseñas y stock existentes.


## Cambios V2.3 — Fiabilidad y auditoría

- **Navegación sin F5:** el botón del panel y las nueve secciones se gestionan desde un enrutador de enlaces, y se mantienen Atrás/Adelante del navegador. Se vuelve a consultar el estado en el servidor al entrar a cada sección: incluye solicitudes que acaban de ingresar desde la web.
- **Actualizaciones del navegador:** HTML/JS/CSS usan política `no-cache` y los recursos incluyen identificador de versión. Al migrar, hacé **un solo refresco forzado**; los cambios de pantalla posteriores no requieren refrescar.
- **Estado ante errores:** se muestra una pantalla recuperable si falla una sección, en lugar de dejar el panel vacío.
- **Datos más seguros:** solicitudes, configuración, movimientos de inventario y cambios de horarios no quedan a medias si ocurre un error al escribir.
- **Privacidad:** las fotos de productos ocultos no se muestran a visitantes anónimos aunque conozcan su identificador; los archivos de clientes ya requerían sesión autenticada.
- **Backups:** `GET /api/admin/backup` entrega una copia SQLite consistente, solo con sesión válida. Incluye adjuntos, productos, fotos, inventario, solicitudes, pagos y reseñas; **no** incluye secretos/contraseñas del servidor.
- **Seguridad:** políticas de no-caché, cabeceras de protección contra embeber el sitio y validación de números negativos en endpoints principales.

Véase **`AUDITORIA_V2_3.md`** para hallazgos y pruebas, y **`CHECKLIST_PUBLICACION.md`** para requisitos pendientes. **La V2.3 funciona localmente y está preparada para un despliegue de prueba, pero todavía no está declarada apta para recibir pedidos de clientes reales en Internet sin completar el checklist.**


## V2.9.5 — Filamento en kg y colores de pedidos

- **Inventario → Nuevo artículo:** si la categoría es **Filamento**, la unidad predeterminada en pantalla es **kg**. Ingresá **stock inicial en kg** (una bobina nueva = 1), stock mínimo en kg y **precio de compra por kilogramo ($/kg)**. Material y color son obligatorios. Si elegís Accesorio/Consumible, podés cargar unidades, ml o gramos y su costo unitario.
- **Inventario → ± Ajustar:** las cantidades de filamento se ingresan también en **kg** (por ejemplo `1`, `0,5`, `0,25`).
- **Tablas del inventario:** el stock físico, reservado y disponible se muestran en kg para filamentos, junto con el costo por kg.
- **Cotizador, reserva y consumo real:** la base de datos continúa usando **gramos y $/g** por seguridad numérica. La conversión al registrar 1 kg a $25.000/kg da **1000 g y $25/g**, por lo que un consumo de 100 g cuesta $2500 antes de desperdicio y otros costos.
- **Compatibilidad:** las bobinas antiguas almacenadas como categoría `filamento` y unidad `kg` se convierten automáticamente a gramos **una sola vez** al iniciar la nueva versión. Los filamentos antiguos almacenados en gramos se mantienen y ahora se muestran en kg. Creá una copia de `data/` antes de actualizar.
- **Formulario de clientes:** seleccionar el color es obligatorio cuando se va a imprimir: Impresión, Modelado + impresión, Repuestos, Prototipos, Catálogo y Universitarios. Incluye `Varios colores, aclarar por WhatsApp`, `Otro color, aclarar por WhatsApp` y `Sin preferencia de color`. En **Solo diseño y modelado** no se exige color al no haber fabricación.
- **Si se eligen varios colores**, la solicitud lo guarda y el WhatsApp preparado invita a detallar los colores manualmente.
- **Referencias de precios:** al crear o modificar referencias de filamentos también se solicita el color.

**Instalación del parche:** detené el servidor (`Ctrl + C`), copiá tu carpeta `data/` como respaldo, reemplazá los archivos incluidos en el parche (y la carpeta `tests/` si querés ejecutar tests), reiniciá con `npm start` y forzá actualización con `Ctrl + Shift + R`. No borres ni reemplaces `data/`.
