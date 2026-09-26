import { BadRequestException } from '@nestjs/common';
import { TipoAjustePrecio } from '../enums/tipo-ajuste-precio.enum';
import { ProductoIntrinsicValidationService } from './producto-intrinsic-validation.service.ts';

describe('ProductoIntrinsicValidationService - CR-001 costo', () => {
  const service = new ProductoIntrinsicValidationService();

  it.each([100, 0.01])('acepta costo positivo %s (CA1)', (costo) => {
    expect(() => service.validarCosto(costo)).not.toThrow();
  });

  it.each<[unknown, string]>([
    [undefined, 'El costo es obligatorio'],
    [null, 'El costo es obligatorio'],
    ['abc', 'El costo debe ser numérico'],
    ['100', 'El costo debe ser numérico'],
    [true, 'El costo debe ser numérico'],
    [NaN, 'El costo debe ser numérico'],
    [Infinity, 'El costo debe ser numérico'],
    [-Infinity, 'El costo debe ser numérico'],
    [0, 'El costo debe ser mayor a 0'],
    [-1, 'El costo debe ser mayor a 0'],
    [-0.01, 'El costo debe ser mayor a 0'],
  ])('rechaza costo %s con el mensaje correspondiente (CA1/CA3)', (costo, mensaje) => {
    expect(() => service.validarCosto(costo)).toThrow(
      new BadRequestException(mensaje),
    );
  });
});

describe('ProductoIntrinsicValidationService - CR-001 margen', () => {
  const service = new ProductoIntrinsicValidationService();

  it.each([0, 15, 0.5, 100])('acepta margen %s (CA1)', (margen) => {
    expect(() => service.validarMargen(margen)).not.toThrow();
  });

  it.each<[unknown]>([[undefined], [null]])(
    'acepta margen %s porque el margen es opcional',
    (margen) => {
      expect(() => service.validarMargen(margen)).not.toThrow();
    },
  );

  it.each<[unknown, string]>([
    ['abc', 'El margen debe ser numérico'],
    ['15', 'El margen debe ser numérico'],
    [true, 'El margen debe ser numérico'],
    [NaN, 'El margen debe ser numérico'],
    [Infinity, 'El margen debe ser numérico'],
    [-20, 'El margen no puede ser negativo'],
    [-0.01, 'El margen no puede ser negativo'],
  ])('rechaza margen %s con el mensaje correspondiente (CA2/CA3)', (margen, mensaje) => {
    expect(() => service.validarMargen(margen)).toThrow(
      new BadRequestException(mensaje),
    );
  });
});

/**
 * CR-006: el valor del ajuste masivo se valida antes de tocar ningún producto, y
 * la regla depende del tipo de ajuste: asignar un margen admite 0, pero ajustar
 * el costo en 0 no produce cambios y un -100% dejaría el costo en 0.
 */
describe('ProductoIntrinsicValidationService - CR-006 ajuste masivo', () => {
  const service = new ProductoIntrinsicValidationService();

  it.each([
    [TipoAjustePrecio.COSTO_PORCENTUAL, 10],
    [TipoAjustePrecio.COSTO_PORCENTUAL, -50],
    [TipoAjustePrecio.COSTO_MONTO, 20],
    [TipoAjustePrecio.COSTO_MONTO, -20],
    [TipoAjustePrecio.MARGEN, 0],
    [TipoAjustePrecio.MARGEN, 50],
  ])('acepta %s con valor %s', (tipoAjuste, valor) => {
    expect(() => service.validarAjusteMasivo(tipoAjuste, valor)).not.toThrow();
  });

  it.each<[TipoAjustePrecio, number, string]>([
    [
      TipoAjustePrecio.COSTO_PORCENTUAL,
      0,
      'El valor del ajuste no puede ser 0 porque no produce cambios',
    ],
    [
      TipoAjustePrecio.COSTO_MONTO,
      0,
      'El valor del ajuste no puede ser 0 porque no produce cambios',
    ],
    [
      TipoAjustePrecio.COSTO_PORCENTUAL,
      -100,
      'El porcentaje debe ser mayor a -100% (con -100% el costo quedaría en 0)',
    ],
    [
      TipoAjustePrecio.COSTO_PORCENTUAL,
      -150,
      'El porcentaje debe ser mayor a -100% (con -100% el costo quedaría en 0)',
    ],
    [TipoAjustePrecio.MARGEN, -10, 'El margen no puede ser negativo'],
  ])(
    'rechaza %s con valor %s indicando el motivo',
    (tipoAjuste, valor, mensaje) => {
      expect(() => service.validarAjusteMasivo(tipoAjuste, valor)).toThrow(
        new BadRequestException(mensaje),
      );
    },
  );

  it('un monto de -100 es válido: no es un porcentaje, solo resta al costo', () => {
    expect(() =>
      service.validarAjusteMasivo(TipoAjustePrecio.COSTO_MONTO, -100),
    ).not.toThrow();
  });
});
