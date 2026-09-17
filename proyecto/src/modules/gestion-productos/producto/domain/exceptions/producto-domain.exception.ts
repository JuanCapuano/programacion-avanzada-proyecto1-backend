/**
 * Excepción de negocio del dominio de Producto.
 *
 * A diferencia del resto de las excepciones del proyecto, NO extiende
 * HttpException: el dominio no conoce HTTP ni NestJS. La traducción a un
 * código de estado es responsabilidad de la capa de aplicación.
 */
export class ProductoDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductoDomainException';
  }
}
