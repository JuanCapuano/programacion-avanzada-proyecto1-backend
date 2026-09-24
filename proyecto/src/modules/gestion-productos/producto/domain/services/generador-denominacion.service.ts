import { ProductoDomainException } from '../exceptions/producto-domain.exception';
import { Presentacion } from '../value-objects/presentacion.vo';

export interface ComponentesDenominacion {
  marca: string;
  linea: string;
  /**
   * Opcional mientras el CR-002 no esté completo: los productos existentes no
   * tienen presentación, y en ese caso la denominación se arma solo con
   * marca y línea.
   */
  presentacion?: Presentacion | null;
}

/**
 * Servicio de dominio que genera la denominación de un Producto a partir de
 * su Marca, Línea y Presentación (CR-005).
 *
 * Es un servicio y no un método de Producto porque:
 * - combina datos de otros agregados (Marca y Línea);
 * - debe poder usarse antes de que el Producto exista (previsualización en
 *   el alta).
 *
 * No depende de NestJS ni de la base de datos: recibe textos y devuelve texto.
 */
export class GeneradorDenominacion {
  /** Mismo límite que aplica ProductoIntrinsicValidationService. */
  static readonly LONGITUD_MAXIMA = 200;

  generar({ marca, linea, presentacion }: ComponentesDenominacion): string {
    const marcaNormalizada = this.normalizar(marca);
    const lineaNormalizada = this.normalizar(linea);

    if (!marcaNormalizada) {
      throw new ProductoDomainException(
        'No se puede generar la denominación: la marca es obligatoria.',
      );
    }
    if (!lineaNormalizada) {
      throw new ProductoDomainException(
        'No se puede generar la denominación: la línea es obligatoria.',
      );
    }

    const partes = [marcaNormalizada, lineaNormalizada];
    if (presentacion) {
      partes.push(presentacion.toString());
    }

    const denominacion = partes.join(' ');

    if (denominacion.length > GeneradorDenominacion.LONGITUD_MAXIMA) {
      throw new ProductoDomainException(
        `La denominación generada supera los ${GeneradorDenominacion.LONGITUD_MAXIMA} caracteres.`,
      );
    }

    return denominacion;
  }

  /**
   * Minúsculas y espacios simples, coherente con cómo el resto del catálogo
   * persiste las denominaciones.
   */
  private normalizar(texto: string | null | undefined): string {
    return (texto ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
