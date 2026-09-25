import { ValidationPipe } from '@nestjs/common';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { CreateProductoDto } from './create-producto.dto';
import { UpdateProductoDto } from './update-producto.dto';

/**
 * CR-001 · US-1 (CA2 y CA3): el margen no puede ser negativo ni no numérico,
 * y el mensaje debe indicar el motivo.
 */
describe('DTOs de Producto - CR-001 margen', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  const altaBase = {
    denominacion: 'producto valido',
    utilizaStockMinimo: false,
    utilizaPack: false,
    lineaId: 1,
    marcaId: 1,
    alicuotaIva: AlicuotaIva.ALICUOTA_21,
    usuarioCreatedId: 1,
    costo: 1000,
  };

  const edicionBase = {
    denominacion: 'producto valido',
    usuarioUpdatedId: 1,
  };

  const validarAlta = (datos: object) =>
    pipe.transform(datos, { type: 'body', metatype: CreateProductoDto });

  const validarEdicion = (datos: object) =>
    pipe.transform(datos, { type: 'body', metatype: UpdateProductoDto });

  describe('alta', () => {
    it.each([0, 15, 25.5])('acepta margen %s (CA1)', async (porcentaje) => {
      await expect(validarAlta({ ...altaBase, porcentaje })).resolves.toMatchObject(
        { porcentaje },
      );
    });

    it('acepta el alta sin margen porque es opcional', async () => {
      await expect(validarAlta(altaBase)).resolves.toMatchObject({
        costo: 1000,
      });
    });

    it.each([-20, -0.01])(
      'rechaza margen negativo %s con el mensaje correspondiente (CA2)',
      async (porcentaje) => {
        await expect(
          validarAlta({ ...altaBase, porcentaje }),
        ).rejects.toMatchObject({
          response: {
            statusCode: 400,
            message: ['El margen no puede ser negativo'],
          },
        });
      },
    );

    it('rechaza un margen no numérico indicando que debe ser numérico (CA3)', async () => {
      await expect(
        validarAlta({ ...altaBase, porcentaje: 'abc' }),
      ).rejects.toMatchObject({
        response: {
          statusCode: 400,
          message: expect.arrayContaining(['El margen debe ser numérico']),
        },
      });
    });
  });

  describe('edición', () => {
    it('hereda las reglas del alta: rechaza margen negativo (CA2)', async () => {
      await expect(
        validarEdicion({ ...edicionBase, porcentaje: -20 }),
      ).rejects.toMatchObject({
        response: {
          statusCode: 400,
          message: ['El margen no puede ser negativo'],
        },
      });
    });

    it('acepta una edición sin margen', async () => {
      await expect(
        validarEdicion({ ...edicionBase, stockMinimo: 5 }),
      ).resolves.toMatchObject({ stockMinimo: 5 });
    });
  });
});
