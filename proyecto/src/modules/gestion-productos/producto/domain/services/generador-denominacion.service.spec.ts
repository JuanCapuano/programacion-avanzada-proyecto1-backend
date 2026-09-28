import { GeneradorDenominacion } from './generador-denominacion.service';
import { Presentacion } from '../value-objects/presentacion.vo';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { ProductoDomainException } from '../exceptions/producto-domain.exception';

describe('GeneradorDenominacion (servicio de dominio)', () => {
  const generador = new GeneradorDenominacion();

  describe('US-10: arma la denominación con Marca + Línea + Presentación', () => {
    it('genera la denominación con los tres componentes', () => {
      const denominacion = generador.generar({
        marca: 'Coca-Cola',
        linea: 'Gaseosas',
        presentacion: Presentacion.crear(1.5, UnidadMedida.LITRO),
      });

      expect(denominacion).toBe('coca-cola gaseosas 1.5 l');
    });

    it('respeta el orden marca, línea, presentación', () => {
      const denominacion = generador.generar({
        marca: 'Arcor',
        linea: 'Galletitas',
        presentacion: Presentacion.crear(6, UnidadMedida.PACK),
      });

      expect(denominacion).toBe('arcor galletitas 6 pack');
    });

    it('cambia si cambia cualquiera de los componentes', () => {
      const base = {
        marca: 'Coca-Cola',
        linea: 'Gaseosas',
        presentacion: Presentacion.crear(1, UnidadMedida.LITRO),
      };
      const original = generador.generar(base);

      expect(generador.generar({ ...base, marca: 'Pepsi' })).not.toBe(original);
      expect(generador.generar({ ...base, linea: 'Aguas' })).not.toBe(original);
      expect(
        generador.generar({
          ...base,
          presentacion: Presentacion.crear(2, UnidadMedida.LITRO),
        }),
      ).not.toBe(original);
    });

    it('es determinista: mismos componentes, misma denominación', () => {
      const componentes = {
        marca: 'Coca-Cola',
        linea: 'Gaseosas',
        presentacion: Presentacion.crear(1, UnidadMedida.LITRO),
      };

      expect(generador.generar(componentes)).toBe(
        generador.generar(componentes),
      );
    });
  });

  describe('provisorio mientras no esté el CR-002: presentación opcional', () => {
    it('sin presentación usa solo marca y línea', () => {
      expect(generador.generar({ marca: 'Coca-Cola', linea: 'Gaseosas' })).toBe(
        'coca-cola gaseosas',
      );
    });

    it('trata null igual que ausente', () => {
      expect(
        generador.generar({
          marca: 'Coca-Cola',
          linea: 'Gaseosas',
          presentacion: null,
        }),
      ).toBe('coca-cola gaseosas');
    });
  });

  describe('normalización coherente con el catálogo', () => {
    it('pasa todo a minúsculas', () => {
      expect(generador.generar({ marca: 'COCA-COLA', linea: 'GaSeOsAs' })).toBe(
        'coca-cola gaseosas',
      );
    });

    it('elimina espacios sobrantes', () => {
      expect(
        generador.generar({ marca: '  Coca   Cola ', linea: ' Gaseosas  ' }),
      ).toBe('coca cola gaseosas');
    });
  });

  describe('reglas: la denominación no puede quedar inválida', () => {
    it('rechaza marca vacía', () => {
      expect(() => generador.generar({ marca: '', linea: 'Gaseosas' })).toThrow(
        'No se puede generar la denominación: la marca es obligatoria.',
      );
    });

    it('rechaza marca con solo espacios', () => {
      expect(() =>
        generador.generar({ marca: '   ', linea: 'Gaseosas' }),
      ).toThrow(ProductoDomainException);
    });

    it('rechaza línea vacía', () => {
      expect(() =>
        generador.generar({ marca: 'Coca-Cola', linea: '' }),
      ).toThrow('No se puede generar la denominación: la línea es obligatoria.');
    });

    it('rechaza una denominación que supera la longitud máxima', () => {
      const marcaLarga = 'a'.repeat(GeneradorDenominacion.LONGITUD_MAXIMA);

      expect(() =>
        generador.generar({ marca: marcaLarga, linea: 'Gaseosas' }),
      ).toThrow(
        `La denominación generada supera los ${GeneradorDenominacion.LONGITUD_MAXIMA} caracteres.`,
      );
    });
  });
});
