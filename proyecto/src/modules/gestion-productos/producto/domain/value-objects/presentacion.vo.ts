import {
  UnidadMedida,
  UNIDADES_MEDIDA_VALIDAS,
} from '../enums/unidad-medida.enum';
import { ProductoDomainException } from '../exceptions/producto-domain.exception';

/**
 * Presentación en la que se vende un Producto: 1 l, 500 g, 6 pack (CR-002).
 *
 * Es un Value Object: no tiene identidad propia, dos presentaciones con la
 * misma cantidad y unidad son la misma presentación. Es inmutable y se
 * construye siempre a través de `crear()`, de modo que no existe forma de
 * obtener una Presentación inválida.
 */
export class Presentacion {
  /** Máximo de decimales admitidos (evita arrastrar ruido de punto flotante). */
  private static readonly DECIMALES_MAX = 3;

  private constructor(
    public readonly cantidad: number,
    public readonly unidad: UnidadMedida,
  ) {
    Object.freeze(this);
  }

  static crear(cantidad: number, unidad: UnidadMedida): Presentacion {
    Presentacion.validarCantidad(cantidad);
    Presentacion.validarUnidad(unidad);

    return new Presentacion(Presentacion.normalizarCantidad(cantidad), unidad);
  }

  /** Dos presentaciones son iguales si coinciden sus valores (no su instancia). */
  equals(otra?: Presentacion | null): boolean {
    if (!otra) {
      return false;
    }
    return this.cantidad === otra.cantidad && this.unidad === otra.unidad;
  }

  /** Texto con el que la presentación participa de la denominación: "1.5 l". */
  toString(): string {
    return `${this.cantidad} ${this.unidad}`;
  }

  private static validarCantidad(cantidad: number): void {
    // `typeof` cubre también null y undefined, sin comparaciones que
    // strictNullChecks rechazaría por no tener solapamiento de tipos.
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) {
      throw new ProductoDomainException(
        'La cantidad de la presentación debe ser un número válido.',
      );
    }

    if (cantidad <= 0) {
      throw new ProductoDomainException(
        'La cantidad de la presentación debe ser mayor a 0.',
      );
    }
  }

  private static validarUnidad(unidad: UnidadMedida): void {
    if (!unidad) {
      throw new ProductoDomainException(
        'La unidad de medida de la presentación es obligatoria.',
      );
    }

    if (!UNIDADES_MEDIDA_VALIDAS.includes(unidad)) {
      throw new ProductoDomainException(
        `La unidad de medida "${unidad}" no es válida.`,
      );
    }
  }

  private static normalizarCantidad(cantidad: number): number {
    return Number(cantidad.toFixed(Presentacion.DECIMALES_MAX));
  }
}
