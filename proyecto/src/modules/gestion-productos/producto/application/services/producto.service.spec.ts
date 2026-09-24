import { Test, TestingModule } from '@nestjs/testing';
import { ProductoService } from './producto.service';
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
import { HistorialPrecioService } from 'src/modules/gestion-productos/historial-precio-producto/application/services/historial-precio.service';
import { ProductoPersistenceAdapter } from '../../infraestructure/repositories/producto.persistence-adapters';

describe('ProductoService', () => {
  let service: ProductoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductoService,
        { provide: 'IProductoRepository', useValue: {} },
        { provide: LineaService, useValue: {} },
        { provide: MarcaService, useValue: {} },
        { provide: ProveedorService, useValue: {} },
        { provide: UsuarioService, useValue: {} },
        { provide: ProductoIntrinsicValidationService, useValue: {} },
        { provide: ProductoValidationService, useValue: {} },
        { provide: ProductoRelatedEntitiesValidator, useValue: {} },
        { provide: ProductoUniquenessValidator, useValue: {} },
        { provide: UsuarioValidator, useValue: {} },
        { provide: ProductoDeletePolicy, useValue: {} },
        { provide: GeneradorDenominacion, useValue: {} },
        { provide: HistorialPrecioService, useValue: {} },
        { provide: ProductoPersistenceAdapter, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductoService>(ProductoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
