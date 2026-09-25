import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filters';

/**
 * CR-001: los mensajes de validación deben llegar al cliente. Antes, el filtro
 * devolvía el mensaje genérico "Bad Request Exception" y el detalle solo se
 * incluía si NODE_ENV era development.
 */
describe('GlobalExceptionFilter - mensajes de validación (CR-001)', () => {
  const filtro = new GlobalExceptionFilter();

  function contextoFalso() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/producto', method: 'POST' }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it('expone los mensajes cuando el ValidationPipe rechaza el cuerpo', () => {
    const { host, status, json } = contextoFalso();
    // Forma en la que el ValidationPipe construye la excepción.
    const excepcion = new BadRequestException({
      statusCode: 400,
      message: ['El margen no puede ser negativo', 'El costo es obligatorio'],
      error: 'Bad Request',
    });

    filtro.catch(excepcion, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'El margen no puede ser negativo | El costo es obligatorio',
        errores: ['El margen no puede ser negativo', 'El costo es obligatorio'],
      }),
    );
  });

  it('conserva el mensaje de las excepciones lanzadas con un texto simple', () => {
    const { host, status, json } = contextoFalso();

    filtro.catch(new BadRequestException('El costo debe ser mayor a 0'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'El costo debe ser mayor a 0' }),
    );
    expect(json.mock.calls[0][0]).not.toHaveProperty('errores');
  });

  it('mantiene el estado y el mensaje de otras excepciones HTTP', () => {
    const { host, status, json } = contextoFalso();

    filtro.catch(new NotFoundException('Marca con ID 999 no encontrada'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Marca con ID 999 no encontrada' }),
    );
  });

  it('responde 500 ante un error inesperado', () => {
    const { host, status } = contextoFalso();

    filtro.catch(new Error('fallo inesperado'), host);

    expect(status).toHaveBeenCalledWith(500);
  });
});
