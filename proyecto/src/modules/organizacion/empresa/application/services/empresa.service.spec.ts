import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaService } from './empresa.service';
import { CondicionIvaService } from 'src/modules/gutil/condicion-iva/application/services/condicion-iva.service';

describe('EmpresaService', () => {
  let service: EmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        { provide: 'IEmpresaRepository', useValue: {} },
        { provide: CondicionIvaService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
