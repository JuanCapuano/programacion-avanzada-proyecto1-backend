import { Test, TestingModule } from '@nestjs/testing';
import { SuperLineaService } from '../../super-linea.service';

describe('SuperLineaService', () => {
  let service: SuperLineaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuperLineaService],
    }).compile();

    service = module.get<SuperLineaService>(SuperLineaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
