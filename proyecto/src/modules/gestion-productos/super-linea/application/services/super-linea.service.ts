import { ConflictException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';
import { ISuperLineaRepository } from '../../domain/interfaces/super-linea.repository.interface';
import { PoliticaEliminacionSuperLinea } from '../../domain/services/politica-eliminacion-super-linea.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';
import { SuperLinea } from '../../domain/entities/super-linea.entity';
import { SuperLineaDto } from '../../dto/super-linea.dto';
import { SuperLineaMapper } from '../../mappers/super-linea.mapper';
import { ensureNotSistemaEntity } from 'src/modules/common/utils/atrituto-sistema';
import { PaginacionUtils } from 'src/modules/common/utils/pagination/paginacion-utils';

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

  private readonly ENTITY_NAME = 'Super Linea';

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

  async findById(id: number): Promise<SuperLinea> {
    this.logger.log(`Buscando ${this.ENTITY_NAME} con id ${id}`);

    const entity = await this.superLineaRepository.findOne(id);
    if (!entity) throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);
    return entity;
  }

  async findByIdDto(id:number): Promise<SuperLineaDto>{
    this.logger.log(`Buscando ${this.ENTITY_NAME} con id ${id} (DTO)`);

    const entity = await this.superLineaRepository.findOne(id);
    if (!entity) throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);

    return SuperLineaMapper.toDto(entity);
  }

  async findByIdConAuditoria(id: number){
    const entity = await this.superLineaRepository.findByIdConAuditoria(id);
    if (!entity) throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);
    return entity;
  }

  async findByDenominacionFiltered(
      denominacion: string,
      skip = 0,
      take = 10,
      incluirEliminados: boolean = false,
    ): Promise<{ data: SuperLineaDto[]; total: number }> {
    this.logger.log(
      `Buscando Super Linea: ${denominacion}  skip=${skip}, take=${take} | Service`,
    );
    const result = await this.superLineaRepository.findByDenominacionFiltered(
      denominacion,
      skip,
      take,
      incluirEliminados,
    );
    const data: SuperLineaDto[] = result.data.map((linea) =>
      SuperLineaMapper.toDto(linea),
    );
    return {
      data,
      //totalItems simplemente devuelve el mismo número que se manda como parámetro
      //Lo dejo igual, pero podría ser directamente total: result.total
      total: PaginacionUtils.totalItems(result.total),
    };
  }

  async update(id: number, dto: UpdateSuperLineaDto) {
    this.logger.log(`Actualizando  ${this.ENTITY_NAME} con ID: ${id} | Service`);

    const superLinea = await this.superLineaRepository.findOne(id);
    if (!superLinea) throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);

    ensureNotSistemaEntity(superLinea, 'Linea');
    if (dto.denominacion)
      await this.checkDenominacionExists(dto.denominacion, id);


    const entity = await this.superLineaRepository.update(id, dto);
    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'editada',
    );
  }

  async remove(id: number, usuarioId: number) {

    const entity = await this.superLineaRepository.findOne(id);
    
    if (!entity) throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);
    
    ensureNotSistemaEntity(entity, 'Super Linea');
  
    const usuario = await this.usuarioService.findOne(usuarioId);
    if (!usuario) throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);

    const tieneLineasActivas = await this.validacionesService.tieneLineasActivasParaSuperLinea(id);

    if (tieneLineasActivas) throw new ConflictException(
      'No se puede eliminar la marca porque está asociada a productos activos.');
    

    await this.superLineaRepository.delete(entity.id, usuario.id);
    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'eliminada',
    );
  }
}