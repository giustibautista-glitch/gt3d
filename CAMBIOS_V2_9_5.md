# GT-3D V2.9.5 — Inventario en kg y colores obligatorios

## Qué cambió

1. **Alta de filamentos:** kilogramos y costo real por kilogramo, material y color obligatorios. Una bobina nueva = 1 kg.
2. **Movimientos:** se ingresa una compra o un consumo en kg y se transforma a gramos en la base.
3. **Tabla:** muestra filamentos con kg y $/kg; accesorios conservan sus unidades.
4. **Cotizador y reservas:** siguen trabajando en gramos y $/gramo para evitar multiplicaciones por 1000 de más o de menos.
5. **Pedidos públicos:** todos los que implican impresión exigen elegir un color; opción **Varios colores, aclarar por WhatsApp** incluida. En diseño digital exclusivo no se pide.
6. **Migración:** filamentos antiguos con unidad kg se convierten al iniciar una vez. No se modifican los pedidos, productos, fotos ni precios guardados.

## Ejemplo de control

Bobina PLA blanco: 1 kg, $25.000/kg → base: 1000 g, $25/g.
Movimiento -0,25 kg → -250 g.
100 g en un presupuesto → $2500 de material antes de desperdicio y otros costos.

## Actualizar

Detener el servidor, copiar la carpeta **data** como respaldo, reemplazar los archivos del parche, iniciar `npm start` y recargar el navegador con Ctrl + Shift + R.

## Pruebas

`npm test` y `python tests/e2e_formulario_cliente.py` y `python tests/e2e_inventario_kg.py` (estos últimos requieren Playwright + Chromium).
