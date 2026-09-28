import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioService } from './usuario.service';
import { RolService } from 'src/modules/gestion-usuario/rol/application/services/rol.service';

describe('UsuarioService', () => {
  let service: UsuarioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        { provide: 'IUsuarioRepository', useValue: {} },
        { provide: RolService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
