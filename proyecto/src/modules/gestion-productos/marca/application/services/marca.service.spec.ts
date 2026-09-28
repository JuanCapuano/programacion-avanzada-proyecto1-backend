import { Test, TestingModule } from '@nestjs/testing';
import { MarcaService } from './marca.service';
import { PoliticaEliminacionMarca } from '../../domain/services/politica-eliminacion-marca.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';

describe('MarcaService', () => {
  let service: MarcaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcaService,
        { provide: 'IMarcaRepository', useValue: {} },
        { provide: PoliticaEliminacionMarca, useValue: {} },
        { provide: UsuarioService, useValue: {} },
      ],
    }).compile();

    service = module.get<MarcaService>(MarcaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
