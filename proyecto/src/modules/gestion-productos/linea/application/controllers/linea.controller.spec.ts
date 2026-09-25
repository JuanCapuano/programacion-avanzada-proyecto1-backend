import { Test, TestingModule } from '@nestjs/testing';
import { LineaController } from './linea.controller';
import { LineaService } from '../services/linea.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';

describe('LineaController', () => {
  let controller: LineaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineaController],
      providers: [{ provide: LineaService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LineaController>(LineaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
