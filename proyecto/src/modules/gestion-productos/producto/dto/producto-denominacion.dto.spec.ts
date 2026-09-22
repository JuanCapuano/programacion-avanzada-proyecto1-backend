import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductoDto } from './create-producto.dto';
import { UpdateProductoDto } from './update-producto.dto';
import { DENOMINACION_LONGITUD_MAXIMA } from './denominacion.validacion';

/**
 * Reproduce lo que hace el ValidationPipe global con cada request:
 * transforma el JSON al DTO y lo valida.
 */
async function procesar<T extends object>(
  clase: new () => T,
  body: Record<string, unknown>,
) {
  const dto = plainToInstance(clase, body);
  const errores = await validate(dto);
  const mensajesDenominacion = errores
    .filter((e) => e.property === 'denominacion')
    .flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, mensajesDenominacion, errores };
}

describe('DTOs de Producto — denominación (CR-005)', () => {
  const altaBase = {
    marcaId: 1,
    lineaId: 2,
    alicuotaIva: 21,
    utilizaStockMinimo: false,
    utilizaPack: false,
    usuarioCreatedId: 9,
    presentacionCantidad: 1.5,
    presentacionUnidad: 'l',
  };

  describe('CreateProductoDto (alta)', () => {
    it('sin denominación es válido y queda undefined (se genera automática)', async () => {
      const { dto, errores } = await procesar(CreateProductoDto, altaBase);

      expect(errores).toHaveLength(0);
      expect(dto.denominacion).toBeUndefined();
    });

    it.each([
      ['vacía', ''],
      ['solo espacios', '    '],
      ['null', null],
    ])('denominación %s es válida y se convierte en undefined', async (_, valor) => {
      const { dto, errores } = await procesar(CreateProductoDto, {
        ...altaBase,
        denominacion: valor,
      });

      expect(errores).toHaveLength(0);
      expect(dto.denominacion).toBeUndefined();
    });

    it('normaliza el texto ingresado', async () => {
      const { dto } = await procesar(CreateProductoDto, {
        ...altaBase,
        denominacion: '  Coca   Clásica ',
      });

      expect(dto.denominacion).toBe('coca clásica');
    });

    it('rechaza una denominación que no es texto', async () => {
      const { mensajesDenominacion } = await procesar(CreateProductoDto, {
        ...altaBase,
        denominacion: 123,
      });

      expect(mensajesDenominacion).toContain(
        'La denominación debe ser una cadena de texto.',
      );
    });

    it('rechaza una denominación demasiado larga con el mensaje correcto', async () => {
      const { mensajesDenominacion } = await procesar(CreateProductoDto, {
        ...altaBase,
        denominacion: 'a'.repeat(DENOMINACION_LONGITUD_MAXIMA + 1),
      });

      expect(mensajesDenominacion).toEqual([
        `La denominación no puede superar los ${DENOMINACION_LONGITUD_MAXIMA} caracteres.`,
      ]);
    });

    it('rechaza caracteres inválidos', async () => {
      const { mensajesDenominacion } = await procesar(CreateProductoDto, {
        ...altaBase,
        denominacion: 'coca, cola',
      });

      expect(mensajesDenominacion).toEqual([
        'La denominación contiene caracteres inválidos.',
      ]);
    });
  });

  describe('UpdateProductoDto (edición)', () => {
    const edicionBase = { usuarioUpdatedId: 9 };

    it('sin denominación es válido y queda undefined (no se toca el nombre)', async () => {
      const { dto, errores } = await procesar(UpdateProductoDto, {
        ...edicionBase,
        stockMinimo: 3,
      });

      expect(errores).toHaveLength(0);
      expect(dto.denominacion).toBeUndefined();
    });

    it.each([
      ['vacía', ''],
      ['solo espacios', '    '],
      ['null', null],
    ])('US-11: denominación %s se rechaza con "no puede estar vacía"', async (_, valor) => {
      const { mensajesDenominacion } = await procesar(UpdateProductoDto, {
        ...edicionBase,
        denominacion: valor,
      });

      expect(mensajesDenominacion).toEqual([
        'La denominación no puede estar vacía.',
      ]);
    });

    it('normaliza el texto ingresado', async () => {
      const { dto, errores } = await procesar(UpdateProductoDto, {
        ...edicionBase,
        denominacion: '  Coca   Clásica ',
      });

      expect(errores).toHaveLength(0);
      expect(dto.denominacion).toBe('coca clásica');
    });

    it('sigue heredando el resto de las reglas del alta', async () => {
      const { errores } = await procesar(UpdateProductoDto, {
        ...edicionBase,
        marcaId: 'no-es-numero',
      });

      expect(errores.map((e) => e.property)).toContain('marcaId');
    });

    it('sigue exigiendo usuarioUpdatedId', async () => {
      const { errores } = await procesar(UpdateProductoDto, { stockMinimo: 3 });

      expect(errores.map((e) => e.property)).toContain('usuarioUpdatedId');
    });
  });
});
