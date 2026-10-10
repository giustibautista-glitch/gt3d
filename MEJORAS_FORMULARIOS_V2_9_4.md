# GT-3D V2.9.4 — Solicitudes sin confusiones

## Qué cambia para el cliente

- Se indica claramente que **se solicita un presupuesto sin compromiso**. No es una compra ni un pedido confirmado y no se paga al registrar la solicitud.
- El formulario se organiza en tres secciones: contacto, qué necesitás y fecha/archivos.
- Los campos **obligatorios** llevan `*`: nombre y apellido, WhatsApp con característica, cantidad de piezas (precargada en 1), descripción y consentimiento de datos/archivos. Lo demás indica **(opcional)**.
- Una sección desplegable **«Agregar más detalles (opcional)»** agrupa preferencias técnicas según cada servicio. Es posible pedir cotización sin conocer materiales, medidas o terminación.
- Se puede elegir **«Sin definir»** como fecha límite (predeterminado). La fecha se habilita y pasa a ser obligatoria solo cuando el cliente selecciona «Sí, necesito para una fecha». No compromete entrega antes de verificar la agenda.
- Se muestra el plazo orientativo del servicio y que el retiro es coordinado, sin envío a domicilio.
- Se comprueba el número de WhatsApp en el navegador; el servidor valida consentimiento, cantidad y fechas. No se aceptan fechas inválidas ni anteriores al día actual para nuevas solicitudes públicas.
- Adjuntos opcionales: hasta 4 archivos, máximo 5 MB individual y 12 MB total. Se indica el estado del archivo, el error y un botón para quitar adjuntos. Los archivos grandes pueden enviarse después por WhatsApp indicando el código de pedido; **no se adjuntan automáticamente**.
- Una vez registrada la solicitud, se muestra su código y se permite iniciar la conversación de WhatsApp. El cliente deberá enviar personalmente el mensaje.
- Admin marca claramente **Sin definir** en solicitudes sin fecha elegida. No se atribuye automáticamente una ciudad no informada.

## Pruebas realizadas

- `npm test`: **34 pruebas superadas**. Incluye solicitud al servidor real con y sin fecha, cantidad y fecha inválidas rechazadas, conservación de valores en Admin, además de los flujos de inventario y presupuesto anteriores.
- `python tests/e2e_formulario_cliente.py`: prueba de interfaz en Chromium móvil (375 px), con los 7 formularios públicos, selección de «Sin definir» y fecha concreta, validación de WhatsApp y límite de archivos. La red de esa prueba está simulada para el frontend; las persistencias se verificaron en el servidor por separado.
- Todavía es recomendable hacer una última prueba manual en Chrome y celular reales antes de publicar la web.

## Actualización desde V2.9.3

1. Detener Node (`Ctrl+C`) y hacer una copia externa de `data/`.
2. Reemplazar `app.js`, `server.js`, `styles.css`, `index.html` y `package.json` con los del parche V2.9.4 (el parche los trae en la raíz).
3. Iniciar `npm start` y refrescar con `Ctrl+Shift+R`.
4. Entrar a cada servicio y enviar una **solicitud de prueba**, primero «Sin definir» y luego con una fecha. Comprobar ambos en Admin → Pedidos.

**No borrar ni reemplazar `data/`**, ni los archivos o fotografías existentes. La actualización no crea una migración de base de datos.
