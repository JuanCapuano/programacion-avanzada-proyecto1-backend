import 'reflect-metadata';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ProductoController } from './producto.controller';
import { ProductoService } from '../services/producto.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { GlobalExceptionFilter } from 'src/modules/common/filters/global-exception.filters';
import { ProductoDomainException } from '../../domain/exceptions/producto-domain.exception';

/**
 * Prueba HTTP real del controller (rutas, ValidationPipe, pipes y filtros),
 * configurado igual que en main.ts. Solo ProductoService es un mock.
 */
describe('ProductoController — denominación (CR-005, HTTP)', () => {
  let app: INestApplication;
  let service: {
    create: jest.Mock;
    update: jest.Mock;
    restaurarDenominacionAutomatica: jest.Mock;
    previsualizarDenominacion: jest.Mock;
  };

  const altaBase = {
    marcaId: 1,
    lineaId: 2,
    alicuotaIva: 21,
    utilizaStockMinimo: false,
    utilizaPack: false,
    usuarioCreatedId: 9,
  };
  const ok = { mensaje: 'ok' };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(ok),
      update: jest.fn().mockResolvedValue(ok),
      restaurarDenominacionAutomatica: jest.fn().mockResolvedValue(ok),
      previsualizarDenominacion: jest
        .fn()
        .mockResolvedValue({ denominacion: 'coca-cola gaseosas 1.5 l' }),
    };

    const module = await Test.createTestingModule({
      controllers: [ProductoController],
      providers: [{ provide: ProductoService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .setLogger({ log() {}, error() {}, warn() {}, debug() {}, verbose() {} })
      .compile();

    app = module.createNestApplication();
    // Misma configuración que main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PATCH /producto/:id/restaurar-denominacion', () => {
    it('llama al servicio con el id y el usuario', async () => {
      const res = await request(app.getHttpServer())
        .patch('/producto/5/restaurar-denominacion?usuarioId=9')
        .expect(200);

      expect(service.restaurarDenominacionAutomatica).toHaveBeenCalledWith(5, 9);
      expect(res.body).toEqual(ok);
    });

    it('sin usuarioId responde 400 y no llama al servicio', async () => {
      await request(app.getHttpServer())
        .patch('/producto/5/restaurar-denominacion')
        .expect(400);

      expect(service.restaurarDenominacionAutomatica).not.toHaveBeenCalled();
    });
  });

  describe('traducción de errores del dominio', () => {
    it('ProductoDomainException responde 400 con el mensaje de la regla', async () => {
      service.restaurarDenominacionAutomatica.mockRejectedValue(
        new ProductoDomainException(
          'No se puede generar la denominación: la marca es obligatoria.',
        ),
      );

      const res = await request(app.getHttpServer())
        .patch('/producto/5/restaurar-denominacion?usuarioId=9')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        path: '/producto/5/restaurar-denominacion?usuarioId=9',
        message: 'No se puede generar la denominación: la marca es obligatoria.',
      });
      expect(res.body.timestamp).toEqual(expect.any(String));
    });

    it('los demás errores siguen yendo al filtro global (409 queda 409)', async () => {
      service.restaurarDenominacionAutomatica.mockRejectedValue(
        new ConflictException('La denominación "coca-cola gaseosas" ya está en uso'),
      );

      const res = await request(app.getHttpServer())
        .patch('/producto/5/restaurar-denominacion?usuarioId=9')
        .expect(409);

      expect(res.body.message).toBe(
        'La denominación "coca-cola gaseosas" ya está en uso',
      );
    });
  });

  describe('POST /producto — alta', () => {
    it.each([
      ['sin denominación', {}],
      ['con denominación vacía', { denominacion: '' }],
      ['con denominación null', { denominacion: null }],
    ])('%s: llega al servicio como undefined (automática)', async (_, extra) => {
      await request(app.getHttpServer())
        .post('/producto')
        .send({ ...altaBase, ...extra })
        .expect(201);

      expect(service.create.mock.calls[0][0].denominacion).toBeUndefined();
    });
  });

  describe('PUT /producto/:id — edición', () => {
    it.each([
      ['vacía', ''],
      ['null', null],
    ])('US-11: denominación %s responde 400 y no llama al servicio', async (_, valor) => {
      await request(app.getHttpServer())
        .put('/producto/5')
        .send({ usuarioUpdatedId: 9, denominacion: valor })
        .expect(400);

      expect(service.update).not.toHaveBeenCalled();
    });

    it('sin denominación llega al servicio como undefined', async () => {
      await request(app.getHttpServer())
        .put('/producto/5')
        .send({ usuarioUpdatedId: 9, stockMinimo: 3 })
        .expect(200);

      expect(service.update.mock.calls[0][1].denominacion).toBeUndefined();
    });
  });
  describe('GET /producto/denominacion/previsualizar', () => {
    const url = '/producto/denominacion/previsualizar';

    it('convierte la query a números y devuelve la denominación', async () => {
      const res = await request(app.getHttpServer())
        .get(`${url}?marcaId=1&lineaId=2&presentacionCantidad=1.5&presentacionUnidad=l`)
        .expect(200);

      expect(res.body).toEqual({ denominacion: 'coca-cola gaseosas 1.5 l' });
      expect(service.previsualizarDenominacion).toHaveBeenCalledWith(
        expect.objectContaining({
          marcaId: 1,
          lineaId: 2,
          presentacionCantidad: 1.5,
          presentacionUnidad: 'l',
        }),
      );
    });

    it('la presentación es opcional', async () => {
      await request(app.getHttpServer())
        .get(`${url}?marcaId=1&lineaId=2`)
        .expect(200);

      const dto = service.previsualizarDenominacion.mock.calls[0][0];
      expect(dto.presentacionCantidad).toBeUndefined();
      expect(dto.presentacionUnidad).toBeUndefined();
    });

    it.each([
      ['sin marcaId', '?lineaId=2'],
      ['marcaId no numérico', '?marcaId=abc&lineaId=2'],
      ['unidad inexistente', '?marcaId=1&lineaId=2&presentacionCantidad=1&presentacionUnidad=barriles'],
      ['parámetro no permitido', '?marcaId=1&lineaId=2&guardar=true'],
    ])('%s responde 400 y no llama al servicio', async (_, query) => {
      await request(app.getHttpServer()).get(`${url}${query}`).expect(400);

      expect(service.previsualizarDenominacion).not.toHaveBeenCalled();
    });
  });
});
