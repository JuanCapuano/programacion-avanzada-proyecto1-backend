/**
 * Indica cómo se obtuvo la denominación de un Producto (CR-005).
 *
 * - AUTOMATICA: se genera a partir de Marca + Línea + Presentación y se
 *   regenera cuando alguno de esos componentes cambia.
 * - MANUAL: fue editada por un usuario y se respeta tal cual, aunque cambien
 *   los componentes, hasta que se restaure a automática.
 */
export enum OrigenDenominacion {
  AUTOMATICA = 'AUTOMATICA',
  MANUAL = 'MANUAL',
}
