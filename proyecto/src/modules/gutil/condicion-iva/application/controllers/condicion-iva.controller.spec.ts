import { Test, TestingModule } from '@nestjs/testing';
import { CondicionIvaController } from './condicion-iva.controller';
import { CondicionIvaService } from '../services/condicion-iva.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';

describe('CondicionIvaController', () => {
  let controller: CondicionIvaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CondicionIvaController],
      providers: [{ provide: CondicionIvaService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CondicionIvaController>(CondicionIvaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
