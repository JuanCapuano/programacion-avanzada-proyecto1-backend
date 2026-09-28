import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProductoDomainException } from '../../domain/exceptions/producto-domain.exception';

/**
 * Traduce las reglas de negocio violadas del dominio de Producto a HTTP 400.
 *
 * El dominio lanza ProductoDomainException sin saber nada de HTTP; esta capa
 * decide cómo se le informa al cliente. Responde con el mismo formato que
 * GlobalExceptionFilter para que el front maneje un único formato de error.
 */
@Catch(ProductoDomainException)
export class ProductoDomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductoDomainExceptionFilter.name);

  catch(exception: ProductoDomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.BAD_REQUEST;

    this.logger.warn(
      `${request.method} ${request.url} → regla de negocio: ${exception.message}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
