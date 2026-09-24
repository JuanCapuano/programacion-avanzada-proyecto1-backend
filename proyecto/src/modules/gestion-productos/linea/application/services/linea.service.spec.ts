import { Test, TestingModule } from '@nestjs/testing';
import { LineaService } from './linea.service';
import { PoliticaEliminacionLinea } from '../../domain/services/politica-eliminacion-linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';

describe('LineaService', () => {
  let service: LineaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineaService,
        { provide: 'ILineaRepository', useValue: {} },
        { provide: PoliticaEliminacionLinea, useValue: {} },
        { provide: UsuarioService, useValue: {} },
      ],
    }).compile();

    service = module.get<LineaService>(LineaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
