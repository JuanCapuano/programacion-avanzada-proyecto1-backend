# Análisis de Dominio — Sistema de Gestión de Productos e Inventario

Documento de referencia para el modelo de dominio (DDD). Usar como fuente de verdad de reglas de negocio y vocabulario del proyecto.

## Lenguaje Ubicuo (glosario)

| Término | Significado |
|---|---|
| Producto | Bien comercializable identificado por marca, línea y denominación |
| Marca | Fabricante o identificación comercial |
| Línea | Categoría/familia del producto (ej: Gaseosas) |
| Costo | Valor de adquisición, base del precio |
| Margen | % de ganancia aplicado sobre el costo (default 15%, puede variar por producto) |
| Precio | Valor de venta = Costo + Margen. Nunca se carga manualmente |
| Stock actual | Cantidad disponible en un momento dado |
| Stock mínimo | Umbral de alerta; por debajo se considera stock bajo |
| Movimiento de stock | Registro de cambio de stock (compra, venta, devolución, ajuste) |
| Ajuste de stock | Modificación manual del stock, siempre con motivo obligatorio |
| Stock bajo / alerta | stockActual ≤ stockMinimo |
| Lista de precios | Modelo de lectura: productos agrupados por línea con su precio |

## Bounded Contexts

- **Catálogo**: Producto, Marca, Línea (datos maestros) — compartido con Inventario
- **Inventario (CORE)**: Stock, Movimientos de stock, Alertas — foco principal del proyecto
- **Comercial** (fuera de alcance): Ventas, Compras

## Modelo de Dominio

### Producto (Aggregate Root)
- Atributos: `id, marca, linea, denominacion, costo, margen, stockActual, stockMinimo`
- Métodos de dominio: `calcularPrecio()`, `estaBajoMinimo(): boolean`, `ajustarStock(cantidad, motivo)`
- Es la única puerta de entrada para modificar su estado (no se edita stock/precio desde afuera)

### MovimientoStock (Entity)
- Atributos: `id, productoId, tipoMovimiento, cantidad, fecha, motivo`
- Tipos: compra, venta, devolución de cliente, devolución a proveedor, ajuste (motivo libre)
- Relación: 1 Producto → N MovimientoStock

### Value Objects candidatos
- **Precio**: valor calculado (posible moneda/redondeo a futuro)
- **Margen**: porcentaje aplicado; hoy mantenidos como atributos primitivos por simplicidad, es una decisión abierta a revisión

## Reglas de Negocio

1. `Precio = Costo + Margen`. Margen default 15%, editable por producto. Vive en la entidad `Producto` (no en controller ni presentación).
2. Stock bajo: `stockActual ≤ stockMinimo` → método `estaBajoMinimo()` en `Producto`. Detección (dominio) separada de la reacción (notificar/listar, capa de aplicación).
3. Ajuste de stock: siempre requiere motivo obligatorio. Genera un `MovimientoStock`.
4. El stock no puede ser negativo.
5. El precio siempre se deriva de costo + margen, nunca se carga arbitrariamente.
6. Movimientos y stock actual deben mantenerse consistentes entre sí.

## Comportamientos del Dominio
Registrar compras/ventas/devoluciones, ajustar stock con motivo, calcular precio, verificar stock bajo. Toda esta lógica vive en el dominio (entidades o servicios de dominio si se justifica), nunca en controllers ni infraestructura.

## Eventos de Dominio
- **StockBajo**: se dispara cuando, tras un movimiento, `stockActual ≤ stockMinimo`
- **StockActualizado**: se dispara ante cualquier cambio de stock

## Decisiones de Diseño

| Decisión | Opción elegida | Justificación |
|---|---|---|
| ¿Se guarda o calcula el stock? | Se guarda `stockActual` + se registra cada `MovimientoStock` | Rendimiento en lectura + trazabilidad |
| ¿Dónde vive la regla de precio? | `calcularPrecio()` en `Producto` | El producto conoce su costo y margen |
| ¿Dónde vive la regla de stock bajo? | `estaBajoMinimo()` en `Producto` + evento `StockBajo` | Detección en dominio, reacción desacoplada |
| ¿Cómo se garantiza trazabilidad? | Entidad `MovimientoStock` por cada cambio | Auditoría completa |
| ¿Dónde va la lógica de negocio? | Dentro del dominio (entidades/servicios de dominio) | Nunca en controllers, evita duplicar reglas |

## Guía de ubicación de reglas

| Regla | Ubicación |
|---|---|
| Calcular precio | Producto (entidad) |
| Detectar stock bajo | Producto (entidad) |
| Generar alerta / notificar | Evento de dominio |
| Guardar datos | Infraestructura (fuera del dominio) |

## Posibles evoluciones
- Separar Inventario como bounded context independiente de Catálogo
- Aplicar CQRS más estrictamente (modelos de lectura separados)
- Validaciones más fuertes (no vender sin stock disponible)
- Modelar Precio y Margen como Value Objects explícitos
- Incorporar contexto Comercial (Ventas, Compras)
