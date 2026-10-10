# Guía rápida de uso — GT-3D Admin V2.8

## 1. Cuando entra una solicitud

Abrí **Admin → Inicio → Bandeja de próximas acciones**. Las nuevas solicitudes aparecen al principio. Tocá **Revisar y cotizar** o **Ficha**. Verificá los datos, uso, medidas y adjuntos. Si falta algo, dejá el estado **Faltan datos** y usá **Pedir datos al cliente** para abrir WhatsApp con un mensaje preparado. Agregá observaciones en **Notas internas** sin modificar la descripción original.

## 2. Cotizar

Tocá **Revisar y cotizar**. El cotizador selecciona el pedido y trae sus valores anteriores, cuando los haya; no inventa gramos ni horas. Cargá los **gramos y horas totales**, elegí la impresora y el **filamento real del inventario**, estimá diseño, preparación, terminaciones y accesorios. Leé el desglose antes de **Guardar cotización**. Para lotes, activá el descuento solo si son unidades repetibles. Los multiplicadores corresponden a cada servicio; la tarifa de modelado se cobra aparte. Si faltan datos, no guardes un precio improvisado.

## 3. Enviar presupuesto y acordarlo

Volvé a **Pedidos** o **Inicio** y tocá **Avisar presupuesto**. Se abre WhatsApp **del cliente**, con código, importe, anticipo, saldo y condiciones. El mensaje **no se envía solo**: revisalo, envialo y recién entonces confirmá en GT-3D que fue enviado. El pedido pasa a **Esperando anticipo**.

## 4. Confirmar anticipo y aceptación

Cuando el cliente acepte, verificá en tu cuenta que el anticipo **por transferencia** esté efectivamente acreditado. Desde la ficha, **Registrar pago**: ya aparece el pedido y monto sugeridos. No marques como recibido dinero que todavía no esté acreditado. Cuando hayas recibido el importe necesario, tocá **Confirmar trabajo** y confirmá además la **aprobación del cliente**. El servidor impedirá confirmar si falta aprobación, presupuesto, transferencia o stock reservado suficiente. Si se cambia el precio antes de confirmar, el sistema vuelve a exigir aprobación.

## 5. Diseño, impresión y terminaciones

Si requiere diseño, pasá a **Iniciar modelado**, luego **Pedir aprobación**. Antes de imprimir, verificá con el cliente el archivo final. Para una pieza ya lista, tocá **Programar impresión**: se utilizará la impresora asignada y una franja continua disponible. La agenda **no enciende ni supervisa físicamente la impresora**. Una vez iniciado el trabajo, pasá a **Imprimiendo**, después **Terminaciones** y finalmente **Marcar listo**. Indicá los **gramos reales** antes de finalizar; el stock se descuenta al quedar lista la pieza y no dos veces.

## 6. Cobrar saldo, coordinar retiro y entregar

Desde **Listo para entregar**, el panel sugerirá **Cobrar saldo** si falta dinero. Registrá el cobro acreditado, por transferencia o efectivo. Solo entonces podrás **Registrar entrega**. Coordinar retiro con el cliente es manual; no se ofrece entrega a domicilio. Desde la ficha entregada, podés pedir una reseña mediante el enlace de pedido verificado.

## 7. Cierre diario recomendado

Revisá la bandeja de Inicio, pagos pendientes, stock bajo y entregas comprometidas. Descargá periódicamente **Admin → Configuración → Respaldo completo SQLite** y guardalo en un sitio separado y privado. Antes de publicar hay que automatizar este procedimiento.

**Nota:** los mensajes de WhatsApp se abren en el navegador; los envía una persona. El sistema no verifica transferencias contra el banco ni recibe la aprobación desde WhatsApp de forma automática. Para que los registros sean correctos, el operador debe marcar manualmente lo que comprobó.
