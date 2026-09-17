import 'reflect-metadata';
import { ProductoMapper } from './producto.mapper';
import { Producto } from '../domain/entities/producto.entity';
import { GeneradorDenominacion } from '../domain/services/generador-denominacion.service';
import { OrigenDenominacion } from '../domain/enums/origen-denominacion.enum';

/**
 * US-11: "cuando lo consulto, el sistema indica si su denominación es
 * automática o manual". Las lecturas deben exponer el origen.
 */
describe('ProductoMapper — origen de la denominación (CR-005)', () => {
  const componentes = { marca: 'Coca-Cola', linea: 'Gaseosas' };

  /** Como lo devuelve findOne(): con marca y línea cargadas (el mapper las exige). */
  function productoPersistido(): Producto {
    const producto = new Producto();
    producto.id = 5;
    producto.marca = { id: 1, denominacion: 'Coca-Cola' } as Producto['marca'];
    producto.linea = { id: 2, denominacion: 'Gaseosas' } as Producto['linea'];
    return producto;
  }

  function productoAutomatico(): Producto {
    const producto = productoPersistido();
    producto.generarDenominacionAutomatica(new GeneradorDenominacion(), componentes);
    return producto;
  }

  describe.each([
    ['toDto (GET /producto/:id)', (p: Producto) => ProductoMapper.toDto(p)],
    ['toBusquedaDto (búsquedas y listados)', (p: Producto) => ProductoMapper.toBusquedaDto(p)],
  ])('%s', (_, mapear) => {
    it('expone AUTOMATICA para una denominación generada', () => {
      const dto = mapear(productoAutomatico());

      expect(dto.denominacion).toBe('coca-cola gaseosas');
      expect(dto.origenDenominacion).toBe(OrigenDenominacion.AUTOMATICA);
    });

    it('expone MANUAL para una denominación escrita por el usuario', () => {
      const producto = productoAutomatico();
      producto.renombrarManualmente('coca clásica');

      expect(mapear(producto).origenDenominacion).toBe(OrigenDenominacion.MANUAL);
    });

    it('nunca devuelve undefined: sin origen cargado aplica la regla del dominio (MANUAL)', () => {
      const producto = productoPersistido();
      producto.denominacion = 'producto viejo';

      expect(mapear(producto).origenDenominacion).toBe(OrigenDenominacion.MANUAL);
    });
  });
});
