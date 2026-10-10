# GT-3D — Checklist antes de publicar la web

## 1. Negocio y catálogo

- [ ] Revisar los 35 productos del catálogo histórico: ocultar los que ya no fabriques y definir precios nuevos o «A cotizar».
- [ ] Corregir fotografías/descripciones y verificar derechos de uso sobre logos, personajes y diseños ajenos.
- [ ] Cargar cantidades **reales** de filamentos y accesorios (el inventario inicial contiene cero unidades).
- [ ] Revisar costos de filamentos y el costo estimado de $400/h de la Hellbot; mantener las tarifas editables.
- [ ] Confirmar teléfono 3412140690, Instagram `@gt3d.impresiones`, correo `gt3drosario@gmail.com` y retiro coordinado.
- [ ] Confirmar atención días hábiles de 8 a 19; plazos de 5–10 días para impresión con archivo listo, 5–15 días cuando requiere modelado y 2–3 días catálogo estándar.

## 2. Condiciones comerciales y legales

- [ ] Publicar política de privacidad y tratamiento de archivos/datos, con canal para ejercer derechos.
- [ ] Revisar los términos de presupuestos, anticipos por transferencia, cobro final en efectivo o transferencia, entrega y cancelaciones/devoluciones con asesoramiento local.
- [ ] Identificar al responsable comercial, datos obligatorios y comprobantes/facturación según corresponda.
- [ ] Verificar obligaciones de comercio electrónico y protección al consumidor para las condiciones del negocio.

## 3. Publicación técnica

- [ ] Elegir dominio y alojamiento Node.js 22.5+ (preferible LTS actualizado), con **volumen/disco persistente**.
- [ ] Mantener una sola instancia del servidor mientras use SQLite. No usar un hosting sin persistencia.
- [ ] Establecer `ADMIN_PASSWORD` única y segura, `GT3D_DATA_DIR` persistente y `PORT` según proveedor.
- [ ] Configurar DNS, HTTPS y redirección de HTTP a HTTPS desde el proxy.
- [ ] Programar backups automáticos fuera del servidor, en ubicación privada y cifrada, probar una restauración completa.
- [ ] Restringir acceso a servidor/almacenamiento, activar límites de tráfico apropiados y alertas de errores.
- [ ] Confirmar que `.env`, `data/`, los secretos y los adjuntos NO se suban al repositorio Git.

## 4. Pruebas en el dominio real

- [ ] Navegar de la web pública al Admin, entrar con contraseña, recorrer todos los módulos **sin F5** y cerrar sesión.
- [ ] Enviar solicitud de prueba con STL/JPG desde celular, validar número GT-xxxx, descarga privada y WhatsApp precompletado.
- [ ] Cotizar, cambiar estado, registrar pago, reservar material, programar turno, terminar producción y comprobar consumo.
- [ ] Crear/editar/ocultar/eliminar producto y reemplazar/restaurar foto; verificar en ventana privada que la web refleja cambios.
- [ ] Dejar reseña con enlace de pedido entregado, aprobarla y verificar su publicación.
- [ ] Comprobar la web con móvil Android/iPhone, escritorio y, en particular, el navegador Opera utilizado durante las pruebas locales.
- [ ] Descargar y restaurar el respaldo SQLite de un entorno de prueba aislado.
- [ ] Verificar textos, tarifas, horario, plazos y políticas antes de compartir la URL con clientes.

## Actualización desde V2.2

1. Detener el servidor con `Ctrl + C`.
2. Guardar una copia completa de `data/`, sin borrarla.
3. Descomprimir V2.3 en una carpeta nueva y trasladar `data/` de la instalación anterior.
4. Ejecutar `npm start` y abrir `http://localhost:3000/#admin/inicio`.
5. Hacer una sola actualización forzada con `Ctrl + Shift + R`; después navegar libremente sin actualizar.
6. Confirmar que en la parte superior del panel aparece `V2.3`.
7. Entrar en **Configuración → Respaldo completo SQLite**, descargar el archivo y guardarlo fuera de la carpeta del servidor.

## V2.8 — Verificaciones adicionales de negocio

- [ ] Verificar que los botones «Avisar presupuesto» y «WhatsApp» dirigen al número **del cliente**, no al teléfono comercial; probar el formato de números locales y +54 9.
- [ ] Confirmar que las transferencias se acreditan manualmente y el botón **Confirmar trabajo** exige aceptación del cliente y anticipo.
- [ ] Confirmar que la cola de producción no contiene pedidos entregados, que aprobación de diseño no reinicia modelado y que programación respeta la impresora del pedido.
- [ ] Verificar que el historial y las notas internas son privados y se conservan en un respaldo restaurado.
- [ ] En una instalación actualizada, inspeccionar los pedidos anteriores en curso: los nuevos campos de aprobación no se completan retrospectivamente.
- [ ] Hacer un recorrido en el navegador real con un pedido ficticio y montos verificados; la prueba automatizada visual usada datos HTTP capturados y una página aislada por limitaciones del entorno.
