/**
 * Tipo de ajuste de la actualización masiva de precios (CR-006).
 *
 * El precio nunca se modifica directamente: cada ajuste cambia el costo o el
 * margen, y el precio se recalcula con Producto.calcularPrecio().
 *
 * - COSTO_PORCENTUAL: aumento o descuento porcentual sobre el costo (US 1).
 * - COSTO_MONTO: suma o resta de un monto fijo al costo (US 2).
 * - MARGEN: asigna un nuevo margen (columna `porcentaje`); el costo no cambia (US 3).
 */
export enum TipoAjustePrecio {
  COSTO_PORCENTUAL = 'costo_porcentual',
  COSTO_MONTO = 'costo_monto',
  MARGEN = 'margen',
}
