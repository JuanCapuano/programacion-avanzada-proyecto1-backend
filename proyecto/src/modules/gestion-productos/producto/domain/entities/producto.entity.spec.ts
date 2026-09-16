import 'reflect-metadata';
import { Producto } from './producto.entity';
import { GeneradorDenominacion } from '../services/generador-denominacion.service';
import { Presentacion } from '../value-objects/presentacion.vo';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { OrigenDenominacion } from '../enums/origen-denominacion.enum';
import { ProductoDomainException } from '../exceptions/producto-domain.exception';

describe('Producto (Aggregate Root) — denominación y presentación', () => {
  const generador = new GeneradorDenominacion();
  const cocaGaseosas = { marca: 'Coca-Cola', linea: 'Gaseosas' };

  function productoAutomatico(presentacion: Presentacion | null = null) {
    const producto = new Producto();
    producto.asignarPresentacion(presentacion);
    producto.generarDenominacionAutomatica(generador, cocaGaseosas);
    return producto;
  }

  describe('presentación', () => {
    it('guarda y reconstruye el Value Object', () => {
      const producto = new Producto();
      producto.asignarPresentacion(Presentacion.crear(1.5, UnidadMedida.LITRO));

      expect(producto.presentacionCantidad).toBe(1.5);
      expect(producto.presentacionUnidad).toBe(UnidadMedida.LITRO);
      expect(
        producto
          .obtenerPresentacion()
          ?.equals(Presentacion.crear(1.5, UnidadMedida.LITRO)),
      ).toBe(true);
    });

    it('un producto sin presentación devuelve null', () => {
      expect(new Producto().obtenerPresentacion()).toBeNull();
    });

    it('asignar null limpia la presentación', () => {
      const producto = new Producto();
      producto.asignarPresentacion(Presentacion.crear(1, UnidadMedida.LITRO));
      producto.asignarPresentacion(null);

      expect(producto.presentacionCantidad).toBeNull();
      expect(producto.presentacionUnidad).toBeNull();
      expect(producto.obtenerPresentacion()).toBeNull();
    });
  });

  describe('US-10: denominación automática', () => {
    it('genera la denominación con la presentación del producto', () => {
      const producto = productoAutomatico(
        Presentacion.crear(1.5, UnidadMedida.LITRO),
      );

      expect(producto.denominacion).toBe('coca-cola gaseosas 1.5 l');
      expect(producto.origenDenominacion).toBe(OrigenDenominacion.AUTOMATICA);
      expect(producto.esDenominacionManual()).toBe(false);
    });

    it('sin presentación (CR-002 pendiente) usa marca y línea', () => {
      expect(productoAutomatico().denominacion).toBe('coca-cola gaseosas');
    });

    it('si es automática, se regenera al cambiar un componente', () => {
      const producto = productoAutomatico();

      const regenerada = producto.sincronizarDenominacion(generador, {
        marca: 'Pepsi',
        linea: 'Gaseosas',
      });

      expect(regenerada).toBe(true);
      expect(producto.denominacion).toBe('pepsi gaseosas');
    });

    it('si es automática, se regenera al cambiar la presentación', () => {
      const producto = productoAutomatico(
        Presentacion.crear(1, UnidadMedida.LITRO),
      );

      producto.asignarPresentacion(Presentacion.crear(2, UnidadMedida.LITRO));
      producto.sincronizarDenominacion(generador, cocaGaseosas);

      expect(producto.denominacion).toBe('coca-cola gaseosas 2 l');
    });
  });

  describe('US-11: denominación manual', () => {
    it('persiste el texto ingresado y marca el producto como manual', () => {
      const producto = productoAutomatico();

      producto.renombrarManualmente('Coca Clásica');

      expect(producto.denominacion).toBe('coca clásica');
      expect(producto.origenDenominacion).toBe(OrigenDenominacion.MANUAL);
      expect(producto.esDenominacionManual()).toBe(true);
    });

    it('NO se sobrescribe al cambiar marca, línea o presentación', () => {
      const producto = productoAutomatico();
      producto.renombrarManualmente('Coca Clásica');

      producto.asignarPresentacion(Presentacion.crear(2, UnidadMedida.LITRO));
      const regenerada = producto.sincronizarDenominacion(generador, {
        marca: 'Pepsi',
        linea: 'Aguas',
      });

      expect(regenerada).toBe(false);
      expect(producto.denominacion).toBe('coca clásica');
      expect(producto.origenDenominacion).toBe(OrigenDenominacion.MANUAL);
    });

    it('"restaurar automática" regenera y vuelve a modo automático', () => {
      const producto = productoAutomatico(
        Presentacion.crear(1, UnidadMedida.LITRO),
      );
      producto.renombrarManualmente('Coca Clásica');

      producto.generarDenominacionAutomatica(generador, cocaGaseosas);

      expect(producto.denominacion).toBe('coca-cola gaseosas 1 l');
      expect(producto.esDenominacionManual()).toBe(false);
    });

    it('rechaza una denominación vacía y deja el producto como estaba', () => {
      const producto = productoAutomatico();

      expect(() => producto.renombrarManualmente('')).toThrow(
        'La denominación no puede estar vacía.',
      );
      expect(() => producto.renombrarManualmente('    ')).toThrow(
        ProductoDomainException,
      );

      expect(producto.denominacion).toBe('coca-cola gaseosas');
      expect(producto.origenDenominacion).toBe(OrigenDenominacion.AUTOMATICA);
    });

    it('rechaza una denominación demasiado larga', () => {
      const producto = productoAutomatico();
      const larga = 'a'.repeat(GeneradorDenominacion.LONGITUD_MAXIMA + 1);

      expect(() => producto.renombrarManualmente(larga)).toThrow(
        ProductoDomainException,
      );
      expect(producto.denominacion).toBe('coca-cola gaseosas');
    });
  });

  describe('productos anteriores al CR-005', () => {
    it('un producto sin origen definido se trata como manual y no se pisa', () => {
      const existente = new Producto();
      existente.denominacion = 'gaseosa cola grande';

      const regenerada = existente.sincronizarDenominacion(
        generador,
        cocaGaseosas,
      );

      expect(existente.esDenominacionManual()).toBe(true);
      expect(regenerada).toBe(false);
      expect(existente.denominacion).toBe('gaseosa cola grande');
    });
  });
});
