import { TransformFnParams } from 'class-transformer';
import { GeneradorDenominacion } from '../domain/services/generador-denominacion.service';

/**
 * Reglas de entrada de la denominación compartidas por el alta y la edición
 * de Producto (CR-005). La validación de negocio definitiva la hace el
 * dominio; esto solo rechaza temprano lo que llega mal formado.
 */

/** Mismo límite que el dominio. */
export const DENOMINACION_LONGITUD_MAXIMA = GeneradorDenominacion.LONGITUD_MAXIMA;

/** Caracteres admitidos. `*` y no `+`: el vacío lo informa otra regla con su propio mensaje. */
export const DENOMINACION_PATRON = /^[\w áéíóúÁÉÍÓÚñÑ.\-/%]*$/;

function normalizar(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Alta: un campo vacío (`""`, solo espacios o `null`) significa que el
 * usuario no escribió nombre, así que se convierte en `undefined` y el
 * dominio genera la denominación automática.
 */
export function transformarDenominacionAlta({ value }: TransformFnParams) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value; // @IsString lo rechaza con su mensaje
  }
  const normalizada = normalizar(value);
  return normalizada === '' ? undefined : normalizada;
}

/**
 * Edición: si el campo viene, se respeta aunque esté vacío, para que la
 * validación lo rechace (US-11: "no puede estar vacía"). `null` se trata
 * como vacío por el mismo motivo.
 */
export function transformarDenominacionEdicion({ value }: TransformFnParams) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    return value;
  }
  return normalizar(value);
}
