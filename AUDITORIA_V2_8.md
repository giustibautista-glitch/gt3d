# GT-3D — Auditoría operativa V2.8
**Fecha:** 9 de octubre de 2026. **Base:** V2.7. **Alcance:** web pública, panel privado, SQLite, servidor Node.js, pagos, inventario, presupuestos, estados, agenda y reseñas.

## Objetivo
Que recibir y gestionar un pedido requiera menos pasos, menos memoria operativa y menos posibilidades de cometer errores irreversibles. El usuario mantiene el control de los pagos, la aceptación del cliente y la impresora; el sistema no pretende verificar una transferencia bancaria automáticamente ni encender la impresora.

## Proceso completo simulado

Se creó una solicitud desde la API pública con consentimiento, datos de cliente, descripción y detalles. Se consultó el pedido desde Admin y se guardaron notas internas. Se añadió un filamento real con **150 g disponibles** y se presupuestó una impresión por **$15.000**, con anticipo por transferencia de **$7.500** y **120 g previstos**.

1. Sin anticipo acreditado, **no se pudo confirmar** (HTTP 409).
2. Un intento de registrar el anticipo como efectivo se rechazó (HTTP 400).
3. Con $5.000 de transferencia, aún **no se pudo confirmar**; faltaban $2.500 (HTTP 409).
4. Acreditados los $7.500, el sistema exigió registrar además la **aprobación del cliente**.
5. Una vez aprobada y confirmada la orden, quedaron **120 g reservados**.
6. Se finalizaron las piezas con **115 g reales**: inventario **150 → 35 g**, reserva liberada. Repetir el estado no vuelve a descontar stock.
7. Con $7.500 de saldo pendiente, se bloqueó la entrega (HTTP 409).
8. Se rechazó un cobro de $7.600 porque superaba el saldo; se aceptó el cobro correcto de **$7.500 en efectivo**.
9. Se permitió marcar «Entregado» y luego se bloqueó una reapertura accidental.
10. El historial guardó cobros, cambios de etapa, presupuesto y notas. Se probó también un segundo pedido con **stock insuficiente**: no alteró el estado ni descontó materiales.

Este recorrido fue validado con peticiones reales HTTP, servidor Node.js y SQLite temporal. Las pruebas preexistentes validaron también el calendario nocturno, los archivos privados y las reseñas moderadas.

## Hallazgos y mejoras implementadas

| Antes | V2.8 |
|---|---|
| Sección Inicio mostraba últimos pedidos pero no una cola de trabajo | **Bandeja de próximas acciones** priorizada con botón contextual: cotizar, avisar, anticipo, confirmar, modelar, programar, terminar, cobrar y entregar |
| Las fichas omitían datos del formulario | Ficha con cantidad, uso, material, color, medidas, personalizaciones, localidad, referencias y adjuntos |
| Mensajes de WhatsApp del Admin podían dirigirse al número de GT-3D | El mensaje de presupuesto y seguimiento se dirige al **WhatsApp del cliente** y conserva el código del pedido |
| «Cotizada» daba a entender que ya se había enviado | Se distingue **presupuesto preparado** de **esperando anticipo**; el envío se confirma manualmente después de abrir WhatsApp |
| Sin acceso directo al cobro dentro del pedido | Botón **Registrar pago** desde la ficha, con pedido y monto sugeridos, transferencia predeterminada para anticipos |
| Era posible confirmar sin anticipo | Servidor exige **anticipo acreditado por transferencia** y **aprobación explícita del cliente**, también cuando se usa el selector manual |
| Se podía entregar con saldo impago | Servidor exige que esté **listo** y con **saldo acreditado**; bloquea sobrecobros en pagos asociados |
| No había un campo operativo para el taller | **Notas internas** privadas en cada pedido, sin aparecer en la web pública |
| No había historial de acciones del pedido | Nueva tabla `request_events` con estados, presupuesto, pagos, programación, notas y consumos |
| Cotizador inventaba inicialmente 80 g/5 h | Prefija datos guardados o usa **cero**, que el operador debe completar; exige un filamento cargado si indica gramos |
| Elegir otro pedido no restauraba correctamente sus cifras | Al cambiar la selección del cotizador se cargan nuevamente sus valores guardados |
| Cola de producción incluía trabajos entregados | Se limita a pedidos en etapas de producción; al programar se respeta la impresora seleccionada para el pedido |
| Diseño aprobado podía volver a «Iniciar modelado» | El flujo pasa de aprobación a programación de impresión o terminaciones, sin bucle |
| Imágenes originales podían consultarse por ruta estática aunque ocultas | La ruta `/assets/catalog/NN.webp` comprueba también la visibilidad del producto |

## Pruebas ejecutadas

- **26 pruebas automáticas aprobadas** (`npm test`), incluyendo una prueba adicional V2.8 de todo el flujo hasta la entrega, saldos, inventario y privacidad.
- **Prueba visual de las nueve secciones** en Chromium sin errores JavaScript, usando instantáneas de `/api/admin/state` obtenidas de un servidor real. Incluyó ficha, historial, notas y cotizador, sin necesidad de F5.
- **Prueba de actualización real de V2.7 a V2.8** con la misma base: preservó un pedido, presupuesto, nombre/precio de producto y su fotografía personalizada; añadió campos y nueva tabla sin sobrescribir datos.
- Comprobaciones de sintaxis con `node --check` para los archivos principales.

**Limitación honesta:** el entorno de prueba bloqueó la navegación HTTP desde Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`). Por eso la validación visual fue con datos reales **inyectados en una página aislada** y la validación HTTP fue separada. No equivalen a un ensayo gráfico completo conectado al sitio desplegado; ese ensayo figura en el checklist prepublicación.

## Riesgos y mejoras futuras (prioridad sugerida)

1. **Antes de publicar:** dominio, HTTPS, volumen persistente, contraseña propia segura, backup automático cifrado con restauración probada, requisitos legales y comprobantes de venta, carga de stock real, política de privacidad y limpieza del catálogo.
2. **Antes de usar diariamente:** probar la versión en **Opera y celular**, con WhatsApp real, permisos de fotos/adjuntos, transferencias efectivamente acreditadas y horarios de máquina. Verificar las 32 fotos editadas y los 3 productos cuyas fotos no estuvieron en aquel lote.
3. **Siguiente mejora de productividad:** registrar la **versión detallada de cada presupuesto** (materiales, minutos, costes, cambios y aprobación), no solo monto/costo/factor. Es importante para rehacer un presupuesto y analizar márgenes históricos.
4. **Siguiente mejora de producción:** múltiples bobinas/colores, varias piezas o impresiones por pedido, reimpresiones por fallas y reservas independientes por tanda; actualmente la planificación de máquina es principalmente por pedido y una asignación de filamento.
5. **Siguiente mejora de atención:** etiquetas y búsqueda de pedidos, plantillas de WhatsApp específicas por etapa, vencimientos y recordatorios de seguimiento; no se envían mensajes automáticamente y no hay integración bancaria.
6. **Registros financieros:** si cancelás un pedido después de recibir dinero, registrá manualmente el acuerdo y la devolución: todavía no hay un módulo completo de notas de crédito/reembolsos o facturación.
7. **Entorno multiusuario:** el servidor actual no es un ERP multioperador; usa un acceso administrativo único y SQLite en una sola instancia. No publicar varias réplicas independientes con discos separados.

## Conclusión
La V2.8 mejora significativamente el circuito operativo de **solicitud → presupuesto → envío → aceptación → transferencia → reserva → diseño/producción → saldo → retiro → reseña**, con pasos sugeridos y validaciones del servidor. Es una **candidata de prepublicación**, no una declaración de que está lista para recibir pedidos reales sin completar el checklist.
