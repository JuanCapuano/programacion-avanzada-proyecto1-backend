import { Test, TestingModule } from '@nestjs/testing';
import { AlicuotaIvaService } from './alicuota-iva.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';

describe('AlicuotaIvaService', () => {
  let service: AlicuotaIvaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlicuotaIvaService,
        { provide: 'IAlicuotaIvaRepository', useValue: {} },
        { provide: UsuarioService, useValue: {} },
      ],
    }).compile();

    service = module.get<AlicuotaIvaService>(AlicuotaIvaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
