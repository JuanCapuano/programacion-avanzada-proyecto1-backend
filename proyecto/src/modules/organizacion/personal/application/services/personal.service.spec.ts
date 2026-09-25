import { Test, TestingModule } from '@nestjs/testing';
import { PersonalService } from './personal.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';

describe('PersonalService', () => {
  let service: PersonalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalService,
        { provide: 'IPersonalRepository', useValue: {} },
        { provide: UsuarioService, useValue: {} },
      ],
    }).compile();

    service = module.get<PersonalService>(PersonalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
