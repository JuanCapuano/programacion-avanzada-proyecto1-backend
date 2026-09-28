import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsuarioValidator } from 'src/modules/common/utils/validation/usuario-validator';
import { HistorialPrecioService } from 'src/modules/gestion-productos/historial-precio-producto/application/services/historial-precio.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { LineaService } from '../../../linea/application/services/linea.service';
import { MarcaService } from '../../../marca/application/services/marca.service';
import { Producto } from '../../domain/entities/producto.entity';
import { UnidadMedida } from '../../domain/enums/unidad-medida.enum';
import { GeneradorDenominacion } from '../../domain/services/generador-denominacion.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from '../../domain/services/producto-validation.service.ts';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { ProductoPersistenceAdapter } from '../../infraestructure/repositories/producto.persistence-adapters';
import { ProductoRelatedEntitiesValidator } from '../../infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from '../../infraestructure/validators/producto-uniqueness.validator.ts';
import { ProductoDeletePolicy } from '../policies/producto-delete.policy';
import { ProductoService } from './producto.service';

/**
 * CR-001 - US-1: el costo y el margen se validan en el servicio, no solo en el
 * DTO, para que ninguna llamada interna pueda persistir valores invalidos.
 * El precio no viene del DTO: lo deriva el dominio (costo + costo * margen / 100).
 */
describe('ProductoService - CR-001 costo y margen', () => {
  let service: ProductoService;
  let productoPersistido: Producto;
  let repository: {
    findOne: jest.Mock;
    save: jest.Mock;
    guardarConHistorial: jest.Mock;
  };
  let usuarioValidator: { validarUsuarioExiste: jest.Mock };

  const marca = { id: 1, sistema: 0, denominacion: 'marca uno' };
  const linea = { id: 1, sistema: 0, denominacion: 'linea uno' };
  const usuario = { id: 1 };

  const datosCreacion = {
    denominacion: 'producto valido',
    costo: 100,
    utilizaStockMinimo: false,
    utilizaPack: false,
    lineaId: 1,
    marcaId: 1,
    alicuotaIva: AlicuotaIva.ALICUOTA_21,
    usuarioCreatedId: 1,
    presentacionCantidad: 1,
    presentacionUnidad: UnidadMedida.LITRO,
  } as CreateProductoDto;

  const costosInvalidos: Array<[unknown, string]> = [
    [null, 'El costo es obligatorio'],
    ['abc', 'El costo debe ser numérico'],
    [NaN, 'El costo debe ser numérico'],
    [Infinity, 'El costo debe ser numérico'],
    [-Infinity, 'El costo debe ser numérico'],
    [0, 'El costo debe ser mayor a 0'],
    [-1, 'El costo debe ser mayor a 0'],
  ];

  const margenesInvalidos: Array<[unknown, string]> = [
    ['abc', 'El margen debe ser numérico'],
    [NaN, 'El margen debe ser numérico'],
    [-20, 'El margen no puede ser negativo'],
  ];

  beforeEach(async () => {
    // Estado persistido: costo 100 y margen 15, es decir precio 115.
    productoPersistido = Object.assign(new Producto(), {
      id: 1,
      denominacion: 'producto valido',
      costo: 100,
      porcentaje: 15,
      precio: 115,
      marcaId: 1,
      lineaId: 1,
      alicuotaIva: AlicuotaIva.ALICUOTA_21,
    });

    repository = {
      // Devuelve siempre la misma instancia, para detectar mutaciones indebidas.
      findOne: jest.fn().mockImplementation(async () => productoPersistido),
      save: jest.fn().mockImplementation(async (entity) => entity),
      guardarConHistorial: jest
        .fn()
        .mockImplementation(async (entidades) => entidades),
    };
    usuarioValidator = {
      validarUsuarioExiste: jest.fn().mockResolvedValue(usuario),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductoService,
        // Servicios de dominio reales: son lo que el CR-001 pone a prueba.
        ProductoIntrinsicValidationService,
        ProductoValidationService,
        GeneradorDenominacion,
        { provide: 'IProductoRepository', useValue: repository },
        { provide: LineaService, useValue: {} },
        { provide: MarcaService, useValue: {} },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioService, useValue: {} },
        { provide: ProductoDeletePolicy, useValue: {} },
        { provide: ProductoPersistenceAdapter, useValue: {} },
        { provide: UsuarioValidator, useValue: usuarioValidator },
        {
          provide: HistorialPrecioService,
          useValue: {
            prepararRegistroSiCambio: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: ProductoRelatedEntitiesValidator,
          useValue: {
            validarYObtenerEntidadesRelacionadas: jest
              .fn()
              .mockResolvedValue({ marca, linea }),
          },
        },
        {
          provide: ProductoUniquenessValidator,
          useValue: {
            validarDenominacionUnica: jest.fn().mockResolvedValue(undefined),
            validarCodigoProveedorUnico: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ProductoService>(ProductoService);
  });

  describe('create', () => {
    it.each([100, 0.01])(
      'persiste un costo positivo %s (CA1)',
      async (costo) => {
        await service.create({ ...datosCreacion, costo });

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save.mock.calls[0][0]).toMatchObject({
          costo,
          // Igual que el dominio: costo + costo * margen / 100 (margen por defecto 15).
          precio: costo + (costo * 15) / 100,
        });
      },
    );

    it.each(costosInvalidos)(
      'un costo %s invalido no llega al repositorio, aun sin pasar por el DTO (CA1/CA3)',
      async (costo, mensaje) => {
        const dto = { ...datosCreacion, costo } as unknown as CreateProductoDto;

        await expect(service.create(dto)).rejects.toThrow(
          new BadRequestException(mensaje),
        );
        expect(repository.save).not.toHaveBeenCalled();
      },
    );

    it('rechaza el costo omitido en llamadas internas (CA1)', async () => {
      const { costo, ...sinCosto } = datosCreacion;

      await expect(
        service.create(sinCosto as CreateProductoDto),
      ).rejects.toThrow(new BadRequestException('El costo es obligatorio'));
      expect(repository.save).not.toHaveBeenCalled();
    });

    it.each(margenesInvalidos)(
      'un margen %s invalido no llega al repositorio (CA2/CA3)',
      async (porcentaje, mensaje) => {
        const dto = {
          ...datosCreacion,
          porcentaje,
        } as unknown as CreateProductoDto;

        await expect(service.create(dto)).rejects.toThrow(
          new BadRequestException(mensaje),
        );
        expect(repository.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('update', () => {
    it.each(costosInvalidos)(
      'un costo %s invalido conserva el estado persistido (CA3/CA4)',
      async (costo, mensaje) => {
        const estadoAnterior = { ...productoPersistido };
        const dto = {
          usuarioUpdatedId: 1,
          costo,
        } as unknown as UpdateProductoDto;
        const solicitudAnterior = { ...dto };

        await expect(service.update(1, dto)).rejects.toThrow(
          new BadRequestException(mensaje),
        );

        expect(repository.findOne).toHaveBeenCalledWith(1);
        expect(usuarioValidator.validarUsuarioExiste).toHaveBeenCalledWith(1);
        expect(repository.guardarConHistorial).not.toHaveBeenCalled();
        expect(productoPersistido).toEqual(estadoAnterior);
        expect(productoPersistido.costo).toBe(100);
        expect(productoPersistido.precio).toBe(115);
        expect(dto).toEqual(solicitudAnterior);
      },
    );

    it.each(margenesInvalidos)(
      'un margen %s invalido conserva el estado persistido (CA2/CA4)',
      async (porcentaje, mensaje) => {
        const dto = {
          usuarioUpdatedId: 1,
          porcentaje,
        } as unknown as UpdateProductoDto;

        await expect(service.update(1, dto)).rejects.toThrow(
          new BadRequestException(mensaje),
        );

        expect(repository.guardarConHistorial).not.toHaveBeenCalled();
        expect(productoPersistido.porcentaje).toBe(15);
        expect(productoPersistido.precio).toBe(115);
      },
    );

    it('permite un costo positivo y recalcula el precio (CA4)', async () => {
      const dto = { usuarioUpdatedId: 1, costo: 200 } as UpdateProductoDto;

      await service.update(1, dto);

      expect(repository.guardarConHistorial).toHaveBeenCalledTimes(1);
      expect(productoPersistido.costo).toBe(200);
      expect(productoPersistido.precio).toBe(230);
    });

    it('omitir el costo permite editar otro campo y conserva costo y precio (CA4)', async () => {
      const dto = {
        usuarioUpdatedId: 1,
        denominacion: 'producto editado',
      } as UpdateProductoDto;

      await service.update(1, dto);

      expect(repository.guardarConHistorial).toHaveBeenCalledTimes(1);
      expect(dto).not.toHaveProperty('costo');
      expect(productoPersistido.denominacion).toBe('producto editado');
      expect(productoPersistido.costo).toBe(100);
      expect(productoPersistido.precio).toBe(115);
    });

    it('un producto inexistente con costo negativo conserva el NotFoundException', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, {
          usuarioUpdatedId: 1,
          costo: -1,
        } as UpdateProductoDto),
      ).rejects.toThrow(
        new NotFoundException('Producto con ID 99 no encontrado.'),
      );
      expect(repository.guardarConHistorial).not.toHaveBeenCalled();
    });

    it('conserva la precedencia de las validaciones existentes ante un costo negativo', async () => {
      usuarioValidator.validarUsuarioExiste.mockRejectedValue(
        new NotFoundException('Usuario no encontrado'),
      );

      await expect(
        service.update(1, {
          usuarioUpdatedId: 1,
          costo: -1,
        } as UpdateProductoDto),
      ).rejects.toThrow(new NotFoundException('Usuario no encontrado'));

      expect(repository.guardarConHistorial).not.toHaveBeenCalled();
      expect(productoPersistido.costo).toBe(100);
      expect(productoPersistido.precio).toBe(115);
    });
  });
});
