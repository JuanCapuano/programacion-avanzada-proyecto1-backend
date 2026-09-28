import { Test, TestingModule } from '@nestjs/testing';
import { PersonalController } from './personal.controller';
import { PersonalService } from '../services/personal.service';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';

describe('PersonalController', () => {
  let controller: PersonalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalController],
      providers: [{ provide: PersonalService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PersonalController>(PersonalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
