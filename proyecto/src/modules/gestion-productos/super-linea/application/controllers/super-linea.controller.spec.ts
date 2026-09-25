import { Test, TestingModule } from '@nestjs/testing';
import { SuperLineaController } from './super-linea.controller';
import { SuperLineaService } from '../services/super-linea.service';

describe('SuperLineaController', () => {
  let controller: SuperLineaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperLineaController],
      providers: [{ provide: SuperLineaService, useValue: {} }],
    }).compile();

    controller = module.get<SuperLineaController>(SuperLineaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
