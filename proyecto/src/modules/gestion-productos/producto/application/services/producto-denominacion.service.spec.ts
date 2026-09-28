import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductoService } from './producto.service';
import { ProductoModule } from '../../producto.module';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from '../../domain/services/producto-validation.service.ts';
import { ProductoRelatedEntitiesValidator } from '../../infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from '../../infraestructure/validators/producto-uniqueness.validator.ts';
import { UsuarioValidator } from 'src/modules/common/utils/validation/usuario-validator';
import { ProductoDeletePolicy } from '../policies/producto-delete.policy';
import { LineaService } from 'src/modules/gestion-productos/linea/application/services/linea.service';
import { MarcaService } from 'src/modules/gestion-productos/marca/application/services/marca.service';
import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { GeneradorDenominacion } from '../../domain/services/generador-denominacion.service';
import { Producto } from '../../domain/entities/producto.entity';
import { OrigenDenominacion } from '../../domain/enums/origen-denominacion.enum';
import { UnidadMedida } from '../../domain/enums/unidad-medida.enum';
import { ProductoDomainException } from '../../domain/exceptions/producto-domain.exception';
import { HistorialPrecioService } from 'src/modules/gestion-productos/historial-precio-producto/application/services/historial-precio.service';
import { ProductoPersistenceAdapter } from '../../infraestructure/repositories/producto.persistence-adapters';

/**
 * Tests de la capa de aplicación del CR-005: verifican que ProductoService
 * orquesta correctamente el dominio. La base de datos se reemplaza por mocks.
 */
describe('ProductoService — denominación automática (CR-005)', () => {
  const linea = { id: 2, denominacion: 'Gaseosas', sistema: 0 };
  let marca = { id: 1, denominacion: 'Coca-Cola', sistema: 0 };

  let service: ProductoService;
  let repository: {
    findOne: jest.Mock;
    save: jest.Mock;
    guardarConHistorial: jest.Mock;
  };
  let unicidad: {
    validarDenominacionUnica: jest.Mock;
    validarCodigoProveedorUnico: jest.Mock;
  };

  const altaBase = {
    marcaId: 1,
    lineaId: 2,
    alicuotaIva: 21,
    utilizaStockMinimo: false,
    utilizaPack: false,
    usuarioCreatedId: 9,
    costo: 100,
    presentacionCantidad: 1.5,
    presentacionUnidad: UnidadMedida.LITRO,
  };

  beforeEach(async () => {
    marca = { id: 1, denominacion: 'Coca-Cola', sistema: 0 };
    repository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: Producto) => entity),
      // CR-007: la edicion guarda producto e historial en la misma transaccion.
      guardarConHistorial: jest.fn(async (entidades: Producto[]) => entidades),
    };
    unicidad = {
      validarDenominacionUnica: jest.fn(),
      validarCodigoProveedorUnico: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductoService,
        ProductoIntrinsicValidationService,
        ProductoValidationService,
        GeneradorDenominacion,
        { provide: 'IProductoRepository', useValue: repository },
        { provide: ProductoUniquenessValidator, useValue: unicidad },
        {
          provide: ProductoRelatedEntitiesValidator,
          useValue: {
            validarYObtenerEntidadesRelacionadas: async () => ({
              marca,
              linea,
            }),
          },
        },
        {
          provide: UsuarioValidator,
          useValue: { validarUsuarioExiste: async () => ({ id: 9 }) },
        },
        { provide: LineaService, useValue: { findEntityById: async () => linea } },
        { provide: MarcaService, useValue: { findEntityById: async () => marca } },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioService, useValue: { findOne: async () => ({ id: 9 }) } },
        { provide: ProductoDeletePolicy, useValue: {} },
        { provide: ProductoPersistenceAdapter, useValue: {} },
        {
          provide: HistorialPrecioService,
          useValue: {
            prepararRegistroSiCambio: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get(ProductoService);
  });

  /** Producto persistido con denominación automática, como lo devolvería la BD. */
  function productoExistenteAutomatico(): Producto {
    const producto = new Producto();
    // Costo y margen: la edicion recalcula el precio y este debe ser > 0 (CR-001).
    Object.assign(producto, {
      id: 5,
      marcaId: 1,
      lineaId: 2,
      alicuotaIva: 21,
      costo: 100,
      porcentaje: 15,
      precio: 115,
    });
    producto.generarDenominacionAutomatica(new GeneradorDenominacion(), {
      marca: marca.denominacion,
      linea: linea.denominacion,
    });
    return producto;
  }

  /** El alta y la restauracion usan save(); la edicion, guardarConHistorial(). */
  function productoGuardado(): Producto {
    if (repository.save.mock.calls.length > 0) {
      return repository.save.mock.calls.at(-1)![0];
    }
    return repository.guardarConHistorial.mock.calls.at(-1)![0][0];
  }

  function esperarQueNoGuardoNada(): void {
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.guardarConHistorial).not.toHaveBeenCalled();
  }

  describe('configuración del módulo', () => {
    it('ProductoModule registra GeneradorDenominacion como provider', () => {
      const providers = Reflect.getMetadata('providers', ProductoModule);

      expect(providers).toContain(GeneradorDenominacion);
    });
  });

  describe('alta', () => {
    it('US-10: sin denominación, la genera automáticamente', async () => {
      await service.create({ ...altaBase } as any);

      expect(productoGuardado().denominacion).toBe('coca-cola gaseosas 1.5 l');
      expect(productoGuardado().origenDenominacion).toBe(
        OrigenDenominacion.AUTOMATICA,
      );
    });

    it('US-11: con denominación escrita por el usuario, la guarda como manual', async () => {
      await service.create({ ...altaBase, denominacion: 'coca clásica' } as any);

      expect(productoGuardado().denominacion).toBe('coca clásica');
      expect(productoGuardado().origenDenominacion).toBe(
        OrigenDenominacion.MANUAL,
      );
    });
  });
  describe('alta: unicidad del nombre final (arreglo 4)', () => {
    it('valida la unicidad del nombre GENERADO', async () => {
      await service.create({ ...altaBase } as any);

      expect(unicidad.validarDenominacionUnica).toHaveBeenCalledWith('coca-cola gaseosas 1.5 l');
    });

    it('valida la unicidad del nombre manual ya normalizado', async () => {
      await service.create({ ...altaBase, denominacion: '  Coca   Clásica ' } as any);

      expect(unicidad.validarDenominacionUnica).toHaveBeenCalledWith('coca clásica');
    });

    it('si el nombre generado ya existe, no guarda nada', async () => {
      unicidad.validarDenominacionUnica.mockRejectedValue(
        new ConflictException('La denominación "coca-cola gaseosas" ya está en uso'),
      );

      await expect(service.create({ ...altaBase } as any)).rejects.toThrow(
        ConflictException,
      );
      esperarQueNoGuardoNada();
    });
  });

  describe('edición: manual vs automática (arreglo 3)', () => {
    it('reenviar el mismo nombre al editar otro campo NO lo pasa a manual', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());

      await service.update(5, {
        denominacion: 'coca-cola gaseosas',
        stockMinimo: 3,
        usuarioUpdatedId: 9,
      } as any);

      expect(productoGuardado().origenDenominacion).toBe(
        OrigenDenominacion.AUTOMATICA,
      );
      expect(productoGuardado().stockMinimo).toBe(3);
    });

    it('reenviar el nombre viejo con otra marca regenera la denominación', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());
      marca = { id: 1, denominacion: 'Pepsi', sistema: 0 };

      await service.update(5, {
        denominacion: 'coca-cola gaseosas',
        usuarioUpdatedId: 9,
      } as any);

      expect(productoGuardado().denominacion).toBe('pepsi gaseosas');
      expect(productoGuardado().origenDenominacion).toBe(
        OrigenDenominacion.AUTOMATICA,
      );
    });

    it('un nombre distinto la pasa a manual', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());

      await service.update(5, {
        denominacion: 'coca clásica',
        usuarioUpdatedId: 9,
      } as any);

      expect(productoGuardado().denominacion).toBe('coca clásica');
      expect(productoGuardado().origenDenominacion).toBe(OrigenDenominacion.MANUAL);
    });
  });

  describe('edición: unicidad del nombre final (arreglo 4)', () => {
    it('si el nombre se regenera, valida la unicidad del nombre nuevo excluyendo al propio producto', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());
      marca = { id: 1, denominacion: 'Pepsi', sistema: 0 };

      await service.update(5, { usuarioUpdatedId: 9 } as any);

      expect(unicidad.validarDenominacionUnica).toHaveBeenCalledWith(
        'pepsi gaseosas',
        5,
      );
    });

    it('si el nombre no cambia, no consulta la unicidad (no bloquea datos viejos duplicados)', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());

      await service.update(5, {
        denominacion: 'coca-cola gaseosas',
        stockMinimo: 3,
        usuarioUpdatedId: 9,
      } as any);

      expect(unicidad.validarDenominacionUnica).not.toHaveBeenCalled();
    });

    it('si el nombre nuevo ya existe, no guarda nada', async () => {
      repository.findOne.mockResolvedValue(productoExistenteAutomatico());
      unicidad.validarDenominacionUnica.mockRejectedValue(
        new ConflictException('ya está en uso'),
      );

      await expect(
        service.update(5, { denominacion: 'sprite', usuarioUpdatedId: 9 } as any),
      ).rejects.toThrow(ConflictException);
      esperarQueNoGuardoNada();
    });
  });
  describe('restaurar automática: unicidad (arreglo 4)', () => {
    function productoManual(): Producto {
      const producto = productoExistenteAutomatico();
      producto.renombrarManualmente('coca clásica');
      return producto;
    }

    it('regenera, vuelve a automática y valida la unicidad del nombre restaurado', async () => {
      repository.findOne.mockResolvedValue(productoManual());

      await service.restaurarDenominacionAutomatica(5, 9);

      expect(unicidad.validarDenominacionUnica).toHaveBeenCalledWith(
        'coca-cola gaseosas',
        5,
      );
      expect(productoGuardado().origenDenominacion).toBe(
        OrigenDenominacion.AUTOMATICA,
      );
    });

    it('si el nombre restaurado ya existe, no guarda nada', async () => {
      repository.findOne.mockResolvedValue(productoManual());
      unicidad.validarDenominacionUnica.mockRejectedValue(
        new ConflictException('ya está en uso'),
      );

      await expect(service.restaurarDenominacionAutomatica(5, 9)).rejects.toThrow(
        ConflictException,
      );
      esperarQueNoGuardoNada();
    });
  });
  describe('previsualizar denominación (US-10)', () => {
    it('sin presentación devuelve marca + línea', async () => {
      const resultado = await service.previsualizarDenominacion({
        marcaId: 1,
        lineaId: 2,
      });

      expect(resultado).toEqual({ denominacion: 'coca-cola gaseosas' });
    });

    it('con presentación la incluye en el nombre', async () => {
      const resultado = await service.previsualizarDenominacion({
        marcaId: 1,
        lineaId: 2,
        presentacionCantidad: 1.5,
        presentacionUnidad: UnidadMedida.LITRO,
      });

      expect(resultado).toEqual({ denominacion: 'coca-cola gaseosas 1.5 l' });
    });

    it('no guarda ni consulta unicidad: es una consulta pura', async () => {
      await service.previsualizarDenominacion({ marcaId: 1, lineaId: 2 });

      esperarQueNoGuardoNada();
      expect(unicidad.validarDenominacionUnica).not.toHaveBeenCalled();
    });

    it('devuelve el mismo nombre que después guarda el alta', async () => {
      const { denominacion } = await service.previsualizarDenominacion({
        marcaId: 1,
        lineaId: 2,
        presentacionCantidad: 1.5,
        presentacionUnidad: UnidadMedida.LITRO,
      });
      await service.create({ ...altaBase } as any);

      expect(productoGuardado().denominacion).toBe(denominacion);
    });

    it('presentación incompleta: el Value Object la rechaza', async () => {
      await expect(
        service.previsualizarDenominacion({
          marcaId: 1,
          lineaId: 2,
          presentacionCantidad: 1.5,
        }),
      ).rejects.toThrow(
        new ProductoDomainException(
          'La unidad de medida de la presentación es obligatoria.',
        ),
      );
    });

    it('aplica las mismas reglas que el alta: una marca de sistema se rechaza', async () => {
      marca = { id: 1, denominacion: 'Coca-Cola', sistema: 1 };

      await expect(
        service.previsualizarDenominacion({ marcaId: 1, lineaId: 2 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
