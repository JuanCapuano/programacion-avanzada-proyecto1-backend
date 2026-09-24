import { Presentacion } from './presentacion.vo';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { ProductoDomainException } from '../exceptions/producto-domain.exception';

describe('Presentacion (Value Object)', () => {
  describe('creación válida', () => {
    it('crea una presentación con cantidad y unidad', () => {
      const presentacion = Presentacion.crear(1, UnidadMedida.LITRO);

      expect(presentacion.cantidad).toBe(1);
      expect(presentacion.unidad).toBe(UnidadMedida.LITRO);
    });

    it('admite cantidades decimales', () => {
      const presentacion = Presentacion.crear(1.5, UnidadMedida.LITRO);

      expect(presentacion.cantidad).toBe(1.5);
    });

    it('recorta el ruido de punto flotante a 3 decimales', () => {
      const presentacion = Presentacion.crear(0.1 + 0.2, UnidadMedida.KILOGRAMO);

      expect(presentacion.cantidad).toBe(0.3);
    });
  });

  describe('US-3: la cantidad debe ser mayor a 0', () => {
    it('rechaza cantidad 0', () => {
      expect(() => Presentacion.crear(0, UnidadMedida.LITRO)).toThrow(
        ProductoDomainException,
      );
      expect(() => Presentacion.crear(0, UnidadMedida.LITRO)).toThrow(
        'La cantidad de la presentación debe ser mayor a 0.',
      );
    });

    it('rechaza cantidad negativa', () => {
      expect(() => Presentacion.crear(-2, UnidadMedida.LITRO)).toThrow(
        'La cantidad de la presentación debe ser mayor a 0.',
      );
    });

    it('rechaza un valor no numérico', () => {
      expect(() =>
        Presentacion.crear('uno' as unknown as number, UnidadMedida.LITRO),
      ).toThrow('La cantidad de la presentación debe ser un número válido.');
    });

    it('rechaza NaN', () => {
      expect(() => Presentacion.crear(NaN, UnidadMedida.LITRO)).toThrow(
        'La cantidad de la presentación debe ser un número válido.',
      );
    });
  });

  describe('US-3: la unidad de medida es obligatoria', () => {
    it('rechaza unidad ausente', () => {
      expect(() =>
        Presentacion.crear(1, undefined as unknown as UnidadMedida),
      ).toThrow('La unidad de medida de la presentación es obligatoria.');
    });

    it('rechaza una unidad que no pertenece al catálogo', () => {
      expect(() =>
        Presentacion.crear(1, 'barriles' as UnidadMedida),
      ).toThrow('La unidad de medida "barriles" no es válida.');
    });
  });

  describe('igualdad por valor', () => {
    it('dos presentaciones con los mismos valores son iguales', () => {
      const a = Presentacion.crear(1, UnidadMedida.LITRO);
      const b = Presentacion.crear(1, UnidadMedida.LITRO);

      expect(a.equals(b)).toBe(true);
      expect(a).not.toBe(b); // son instancias distintas, pero el mismo valor
    });

    it('distingue por cantidad', () => {
      const unLitro = Presentacion.crear(1, UnidadMedida.LITRO);
      const dosLitros = Presentacion.crear(2, UnidadMedida.LITRO);

      expect(unLitro.equals(dosLitros)).toBe(false);
    });

    it('distingue por unidad', () => {
      const unLitro = Presentacion.crear(1, UnidadMedida.LITRO);
      const unKilo = Presentacion.crear(1, UnidadMedida.KILOGRAMO);

      expect(unLitro.equals(unKilo)).toBe(false);
    });

    it('no es igual a null ni a undefined', () => {
      const presentacion = Presentacion.crear(1, UnidadMedida.LITRO);

      expect(presentacion.equals(null)).toBe(false);
      expect(presentacion.equals(undefined)).toBe(false);
    });
  });

  describe('representación en texto (insumo de la denominación, CR-005)', () => {
    it('escribe las cantidades enteras sin decimales', () => {
      expect(Presentacion.crear(1, UnidadMedida.LITRO).toString()).toBe('1 l');
      expect(Presentacion.crear(500, UnidadMedida.GRAMO).toString()).toBe(
        '500 g',
      );
    });

    it('escribe las cantidades decimales con punto', () => {
      expect(Presentacion.crear(1.5, UnidadMedida.LITRO).toString()).toBe(
        '1.5 l',
      );
    });

    it('escribe los packs', () => {
      expect(Presentacion.crear(6, UnidadMedida.PACK).toString()).toBe('6 pack');
    });
  });

  describe('inmutabilidad', () => {
    it('no permite modificar sus atributos después de creada', () => {
      const presentacion = Presentacion.crear(1, UnidadMedida.LITRO);

      // En modo strict la asignación lanza; fuera de strict falla en silencio.
      // Lo que importa en ambos casos es que el valor no cambie.
      try {
        (presentacion as { cantidad: number }).cantidad = 99;
      } catch {
        // esperado bajo "use strict"
      }

      expect(presentacion.cantidad).toBe(1);
      expect(Object.isFrozen(presentacion)).toBe(true);
    });
  });
});
