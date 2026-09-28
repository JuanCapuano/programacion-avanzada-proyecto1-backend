import { Inject, Injectable } from '@nestjs/common';
import { ILineaRepository } from 'src/modules/gestion-productos/linea/domain/interfaces/linea.repository.interface';

@Injectable()
export class PoliticaEliminacionSuperLinea {
  constructor(
     @Inject('ILineaRepository')
    private readonly lineaRepository: ILineaRepository,
  ) {}

  async tieneLineasActivasParaSuperLinea(lineaId: number): Promise<boolean> {
    return this.lineaRepository.existsLineasActivasBySuperLinea(lineaId);
  }
}