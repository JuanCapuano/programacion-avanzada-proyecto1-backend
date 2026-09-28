import { Test, TestingModule } from '@nestjs/testing';
import { LocalidadService } from './localidad.service';
import { ProvinciaService } from 'src/modules/gutil/provincia/application/services/provincia.service';

describe('LocalidadService', () => {
  let service: LocalidadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalidadService,
        { provide: 'ILocalidadRepository', useValue: {} },
        { provide: ProvinciaService, useValue: {} },
      ],
    }).compile();

    service = module.get<LocalidadService>(LocalidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
