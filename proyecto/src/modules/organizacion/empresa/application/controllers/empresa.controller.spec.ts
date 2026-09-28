import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from '../services/empresa.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';

describe('EmpresaController', () => {
  let controller: EmpresaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaController],
      providers: [{ provide: EmpresaService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmpresaController>(EmpresaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
