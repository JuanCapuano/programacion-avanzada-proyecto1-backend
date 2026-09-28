/**
 * Unidades de medida admitidas para la Presentación de un Producto (CR-002).
 *
 * El valor de cada miembro es el símbolo con el que la unidad se escribe en la
 * denominación generada automáticamente (CR-005). Se mantienen en minúscula
 * para ser coherentes con la normalización de denominaciones que ya aplica el
 * resto del catálogo.
 */
export enum UnidadMedida {
  LITRO = 'l',
  MILILITRO = 'ml',
  CENTIMETRO_CUBICO = 'cc',
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  UNIDAD = 'un',
  PACK = 'pack',
}

export const UNIDADES_MEDIDA_VALIDAS: readonly UnidadMedida[] =
  Object.values(UnidadMedida);
