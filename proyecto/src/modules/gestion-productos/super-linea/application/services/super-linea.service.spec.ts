import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { PoliticaEliminacionSuperLinea } from '../../domain/services/politica-eliminacion-super-linea.service';
import { SuperLineaService } from './super-linea.service';

describe('SuperLineaService', () => {
  let service: SuperLineaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperLineaService,
        { provide: 'ISuperLineaRepository', useValue: {} },
        { provide: PoliticaEliminacionSuperLinea, useValue: {} },
        { provide: UsuarioService, useValue: {} },
      ],
    }).compile();

    service = module.get<SuperLineaService>(SuperLineaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
