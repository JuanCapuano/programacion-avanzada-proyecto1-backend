import { ConflictException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';
import { ISuperLineaRepository } from '../../domain/interfaces/super-linea.repository.interface';
import { PoliticaEliminacionSuperLinea } from '../../domain/services/politica-eliminacion-super-linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';
import { SuperLinea } from '../../domain/entities/super-linea.entity';
import { SuperLineaDto } from '../../dto/super-linea.dto';
import { SuperLineaMapper } from '../../mappers/super-linea.mapper';

@Injectable()
export class SuperLineaService {

  private readonly logger = new Logger(SuperLineaService.name);

  constructor(
    @Inject('ISuperLineaRepository')
    private readonly superLineaRepository: ISuperLineaRepository,

    @Inject(forwardRef(() => PoliticaEliminacionSuperLinea))
    private readonly validacionesService: PoliticaEliminacionSuperLinea,

    private readonly usuarioService: UsuarioService,
  ){}

  private readonly ENTITY_NAME = 'SuperLinea';

  private async checkDenominacionExists(denominacion: string, id?: number) {
    const denominacionNormalizada = denominacion.trim().toUpperCase();

    this.logger.log(
      ` Verificando denominación: "${denominacionNormalizada}" para ID: ${id}`,
    );

    const exists = await this.superLineaRepository.findByDenominacionWithDeleted(
      denominacionNormalizada,
    );

    this.logger.log(
      `Resultado: ${exists ? `Encontrado ID ${exists.id}` : 'No encontrado'}`,
    );

    if (exists && exists.id !== id) {
      this.logger.warn(
        ` Conflicto: denominación ya está en uso: ${denominacionNormalizada} (ID existente: ${exists.id})`,
      );
      throw new ConflictException('Denominación ya en uso o esta eliminada.');
    }

    this.logger.log(`✅ Denominación disponible`);
  }

  async create(dto: CreateSuperLineaDto) {
    this.logger.log(
      `Creando un nuevo ${this.ENTITY_NAME} con denominación: ${dto.denominacion} `,
    );

    await this.checkDenominacionExists(dto.denominacion);
    
    const entity = await this.superLineaRepository.create(dto);
    
    
    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'creada',
    );
  }

  async findAll(): Promise<SuperLinea[]> {
    return this.superLineaRepository.findAll();
  }

  async findAllFor(denominacion: string): Promise<{data: SuperLineaDto[]; total: number}> {
    const result = await this.superLineaRepository.findAllFor(denominacion);
    this.logger.log(`Resultado: ${result} `);
    
    const data: SuperLineaDto[] = result.map((superLinea) => SuperLineaMapper.toDto(superLinea));
    return {
      data,
      total: 1,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} superLinea`;
  }

  update(id: number, dto: UpdateSuperLineaDto) {
    return `This action updates a #${id} superLinea`;
  }

  remove(id: number) {
    return `This action removes a #${id} superLinea`;
  }
}
