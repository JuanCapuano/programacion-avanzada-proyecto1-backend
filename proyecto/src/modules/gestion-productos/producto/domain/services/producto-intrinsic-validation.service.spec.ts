import { BadRequestException } from '@nestjs/common';
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
