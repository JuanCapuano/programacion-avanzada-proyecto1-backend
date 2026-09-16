import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
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

/**
 * Tests de la capa de aplicación del CR-005: verifican que ProductoService
 * orquesta correctamente el dominio. La base de datos se reemplaza por mocks.
 */
describe('ProductoService — denominación automática (CR-005)', () => {
  const linea = { id: 2, denominacion: 'Gaseosas', sistema: 0 };
  let marca = { id: 1, denominacion: 'Coca-Cola', sistema: 0 };

  let service: ProductoService;
  let repository: { findOne: jest.Mock; save: jest.Mock };
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
  };

  beforeEach(async () => {
    marca = { id: 1, denominacion: 'Coca-Cola', sistema: 0 };
    repository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: Producto) => entity),
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
      ],
    }).compile();

    service = module.get(ProductoService);
  });

  /** Producto persistido con denominación automática, como lo devolvería la BD. */
  function productoExistenteAutomatico(): Producto {
    const producto = new Producto();
    Object.assign(producto, { id: 5, marcaId: 1, lineaId: 2, alicuotaIva: 21 });
    producto.generarDenominacionAutomatica(new GeneradorDenominacion(), {
      marca: marca.denominacion,
      linea: linea.denominacion,
    });
    return producto;
  }

  function productoGuardado(): Producto {
    return repository.save.mock.calls.at(-1)![0];
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

      expect(productoGuardado().denominacion).toBe('coca-cola gaseosas');
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

      expect(unicidad.validarDenominacionUnica).toHaveBeenCalledWith('coca-cola gaseosas');
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
      expect(repository.save).not.toHaveBeenCalled();
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
      expect(repository.save).not.toHaveBeenCalled();
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
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
