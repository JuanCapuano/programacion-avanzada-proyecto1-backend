import { Test, TestingModule } from '@nestjs/testing';
import { AlicuotaIvaController } from './alicuota-iva.controller';
import { AlicuotaIvaService } from '../services/alicuota-iva.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';

describe('AlicuotaIvaController', () => {
  let controller: AlicuotaIvaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlicuotaIvaController],
      providers: [{ provide: AlicuotaIvaService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlicuotaIvaController>(AlicuotaIvaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
