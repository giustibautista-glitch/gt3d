# Auditoría GT-3D Admin / Web — V2.3

Fecha de revisión: octubre de 2026. Base evaluada: GT-3D V2.2, con web pública y administración Node.js + SQLite en una misma aplicación.

## Hallazgos y correcciones aplicadas

| Riesgo | Hallazgo | V2.3 |
| --- | --- | --- |
| Alto | Navegación dependiente de `hashchange`; en instalaciones actualizadas podía coexistir el código de distintas versiones por caché de una hora. | Se usa navegación delegada explícita, historial Atrás/Adelante y control de versión de archivos. |
| Alto | Una solicitud nueva creada desde la web podía no aparecer en una sesión administrativa ya abierta hasta refrescar. | Cada entrada a una sección admin vuelve a consultar los datos sin recargar toda la página. |
| Alto | Exportar JSON no incluía archivos STL ni fotografías subidas. | Botón de respaldo SQLite consistente con pedidos, imágenes y adjuntos. |
| Alto | Cambios de tarifas y de disponibilidad podían quedar aplicados parcialmente si una instrucción fallaba. | Operaciones agrupadas en transacciones. |
| Medio | Fotografías de productos ocultos seguían siendo accesibles por URL pública al conocer su ID. | La API de imágenes verifica visibilidad o autenticación. |
| Medio | Valores numéricos negativos e inválidos podían entrar en operaciones genéricas. | Validación central reforzada para impedir números negativos/no finitos. |
| Medio | Un formulario grande podía cerrar la conexión abruptamente en vez de responder un error. | Responde HTTP 413 sin perder la conexión. |
| Medio | Un error JavaScript de un módulo podía dejar una sección sin contenido útil. | Se agregó una pantalla de recuperación y registro de errores en consola. |
| Bajo | Botón de impresión del presupuesto usaba un controlador HTML en línea, incompatible con políticas CSP más estrictas. | Controlador mediante JavaScript. |

## Pruebas realizadas

- `npm test`: **19 pruebas automatizadas superadas** (cotizaciones, multiplicadores, descuentos por cantidad, edición de fotos, registro de pedidos, inventario, reseñas, disponibilidad y seguridad).
- Prueba funcional de navegador en entorno aislado: ingreso a Admin, las **9 secciones** sin F5, historial del navegador, creación de un producto, reemplazo real de su fotografía, actualización de configuración, solicitud pública que aparece en pedidos y navegación de menú móvil.
- Prueba de backend: acceso protegido, archivo adjunto privado, foto oculta, respuesta ante errores, reversión de una operación fallida y descarga/restauración de respaldo SQLite.
- Migración V2.2 → V2.3 verificada con base de datos persistente de prueba: pedido, precio, producto y fotografía conservados, respaldo restaurable.
- Pruebas con bases de datos **temporales**: no se usaron ni modificaron pedidos reales del usuario.

## Límites de la auditoría

Estas pruebas cubren los recorridos principales, **no garantizan que no existan bugs**. Falta verificar el sitio después de un despliegue real, desde varios celulares y navegadores, con cargas de archivos grandes, conexión lenta, períodos largos y recuperaciones de backup en el proveedor definitivo. La aplicación todavía no envía mensajes de WhatsApp por sí sola, no verifica transferencias automáticamente, no opera físicamente las impresoras y no dispone de cuentas individuales ni 2FA.

## Aspectos mejorables después del lanzamiento

- Dividir los archivos `app.js` y `server.js` en módulos más pequeños para facilitar mantenimiento.
- Incorporar pruebas E2E reproducibles dentro de la integración continua, con Chromium/Playwright instalado en el entorno de pruebas.
- Incorporar auditoría más detallada de cambios financieros/estado y flujo de ajustes/cancelaciones/devoluciones.
- Crear una gestión legal de retención/eliminación de datos y documentos finales de privacidad y términos.
- Incorporar copias de seguridad programadas, alarmas de errores y monitoreo de disponibilidad.
- Antes de aumentar tráfico, evaluar migración de SQLite a una base de datos administrada si se requieren varias instancias o múltiples administradores.
