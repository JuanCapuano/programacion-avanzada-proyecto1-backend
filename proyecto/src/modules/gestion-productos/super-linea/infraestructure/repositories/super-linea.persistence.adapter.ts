import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BasePersistenceAdapter } from 'src/modules/common/persistence/base-persistence.adapter';
import { DatabaseConnectionException } from 'src/modules/common/exceptions/database-connection.exception';
import { EntityNotFoundException } from 'src/modules/common/exceptions/entity-notFound-exceptions';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { Transactional } from 'src/modules/common/decorators/transactional.decoratos';
import { QueryBuilderHelper } from 'src/modules/common/query-builders/query-builder-helpers';
import { handleDatabaseError } from 'src/modules/common/query-builders/database-error.helper';
import { FechaUtils } from 'src/modules/common/utils/date/fecha-utils';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { SuperLinea } from '../../domain/entities/super-linea.entity';
import { ISuperLineaRepository } from '../../domain/interfaces/super-linea.repository.interface';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';

@Injectable()
export class SuperLineaPersistenceAdapter
  extends BasePersistenceAdapter<SuperLinea>
  implements ISuperLineaRepository
{
  private readonly logger = new Logger(SuperLineaPersistenceAdapter.name);

  protected readonly ALIAS = 'superLinea';

  constructor(
    @InjectRepository(SuperLinea)
    repository: Repository<SuperLinea>,

    private readonly dataSource: DataSource,
    @Inject('UnitOfWork') public readonly uow: IUnitOfWork,
  ) {
    super(repository);
  }

  @Transactional()
  async create(data: CreateSuperLineaDto): Promise<SuperLinea> {
    const repo = this.uow.getRepository(SuperLinea);

    try {
      const nuevaEntity = repo.create({
        denominacion: data.denominacion,
        observacion: data.observacion,
        usuarioCreatedId: data.usuarioCreatedId,
      });

      const entityGuardada = await repo.save(nuevaEntity);

      return entityGuardada;
    } catch (error) {
      this.logger.error(`Error al conectar con la base de datos: ${error}`);
      throw new DatabaseConnectionException(
        'Error al guardar en la base de datos.',
      );
    }
  }

  @Transactional()
  async update(id: number, data: UpdateSuperLineaDto): Promise<SuperLinea> {
    const repo = this.uow.getRepository(SuperLinea);

    const entity = await repo.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`SuperLínea con ID ${id} no encontrada`);
    }
    //Actualiza sólo los datos que se proporcionan en el DTO, dejando los demás campos sin cambios
    entity.denominacion = data.denominacion ?? entity.denominacion;
    entity.observacion = data.observacion ?? entity.observacion;
    entity.usuarioUpdatedId = data.usuarioUpdatedId;

    const entityActualizada = await repo.save(entity);

    return entityActualizada;
  }

  async findOne(id: number): Promise<SuperLinea | null> {
    try {
      const entity = await this.repository
        .createQueryBuilder('superLinea')
        .where('superLinea.id = :id', { id })
        .andWhere('superLinea.deletedAt IS NULL')
        .getOne();

      this.logger.warn(`Entidad obtenida: ${JSON.stringify(entity)}`);

      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada');
      }

      return entity;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }

      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findByDenominacion(denominacion: string): Promise<SuperLinea | null> {
    try {
      const entity = await this.repository
        .createQueryBuilder('superLinea')
        .where('superLinea.denominacion = :denominacion', { denominacion })
        .andWhere('superLinea.deletedAt IS NULL')
        .getOne();

      return entity;
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findByDenominacionWithDeleted(denominacion: string): Promise<SuperLinea | null> {
    this.logger.log(
      ` Buscando denominación (incluyendo borradas): ${denominacion}`,
    );
    try {
      const denominacionNormalizada = denominacion.trim().toUpperCase();

      const entity = await this.repository
        .createQueryBuilder('superLinea')
        .withDeleted()
        .where('UPPER(superLinea.denominacion) = :denominacion', {
          denominacion: denominacionNormalizada,
        })
        .getOne();

      if (!entity) {
        this.logger.log(
          ` No encontrada superLínea: ${denominacionNormalizada}`,
        );
        return null;
      }

      this.logger.log(
        ` Encontrada superLínea: ID=${entity.id}, denominación=${entity.denominacion}`,
      );

      return entity;
    } catch (error) {
      handleDatabaseError(this.logger, 'findByDenominacionWithDeleted', error);
    }
  }

  async findByDenominacionFiltered(
    denominacion: string,
    skip = 0,
    take = 10,
    incluirEliminados = false,
  ): Promise<{ data: SuperLinea[]; total: number }> {
    try {
      const query = this.baseQuery(incluirEliminados);
      const denominacionNormalizada = denominacion.trim().toUpperCase();

      if (denominacion) {
        query.andWhere(`UPPER(${this.ALIAS}.denominacion) LIKE :denominacion`, {
          denominacion: `%${denominacionNormalizada}%`,
        });
      }

      QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');
      QueryBuilderHelper.applyPagination(query, skip, take);

      // Obtiene las super líneas y el total de registros que coinciden con la búsqueda
      const [data, total] = await query.getManyAndCount();
      return { data, total };
    } catch (error) {
      handleDatabaseError(this.logger, 'findByDenominacionFiltered', error);
    }
  }

  //BÚSQUEDA PARCIAL POR DENOMINACIÓN, SIN PAGINACIÓN, PARA AUTOCOMPLETADO
  async findAllFor(denominacion: string): Promise<SuperLinea[]> {
    try {
      const denominacionNormalizada = denominacion.trim().toUpperCase();
      const query = this.baseQuery();
      query.andWhere('UPPER(superLinea.denominacion) LIKE :denominacion', {
        denominacion: `%${denominacionNormalizada}%`,
      });

      QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');
      return await query.getMany();
    } catch (error) {
      handleDatabaseError(this.logger, 'findAllFor', error);
    }
  }

  async findAll(): Promise<SuperLinea[]> {
    try {
        const query = this.baseQuery();
        QueryBuilderHelper.applyOrder(query, this.ALIAS, 'denominacion', 'ASC');
        return await query.getMany();
    } catch (error) {
      handleDatabaseError(this.logger, 'findAll', error);
    }
  }

  async findAllSinSistemaFor(denominacion: string): Promise<SuperLinea[]> {
    try {
      const query = this.repository
        .createQueryBuilder('superLinea')
        .where('superLinea.deletedAt IS NULL')
        .andWhere('superLinea.sistema = :sistema', { sistema: 0 });

      if (denominacion && denominacion.trim() !== '') {
        query.andWhere('UPPER(superLinea.denominacion) LIKE :denominacion', {
          denominacion: `%${denominacion.toUpperCase()}%`,
        });
      }

      return await query.orderBy('superLinea.denominacion', 'ASC').getMany();
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  //soft delete
  @Transactional()
  async delete(id: number): Promise<SuperLinea> {
    const repo = this.uow.getRepository(SuperLinea);

    const entity = await repo.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`SuperLínea con ID ${id} no encontrada`);
    }

    entity.deletedAt = new Date();
    await repo.save(entity);

    return entity;
  }


  //BÚSQUEDA PARA AUDITORIA (CON DETALLES DEL USUARIO)
  async findByIdConAuditoria(id: number): Promise<AuditoriaDto | null> {
    try {
      const raw = await this.repository
        .createQueryBuilder('superLinea')
        .leftJoin(
          'usuario',
          'usuarioCreated',
          'usuarioCreated.id = superLinea.usuarioCreatedId',
        )
        .leftJoin(
          'usuario',
          'usuarioUpdated',
          'usuarioUpdated.id = superLinea.usuarioUpdatedId',
        )
        .leftJoin(
          'usuario',
          'usuarioDeleted',
          'usuarioDeleted.id = superLinea.usuarioDeletedId',
        )
        .addSelect([
          'superLinea.id as superLinea_id',
          'superLinea.denominacion as superLinea_denominacion',
          'superLinea.createdAt as superLinea_createdAt',
          'superLinea.updatedAt as superLinea_updatedAt',
          'superLinea.deletedAt as superLinea_deletedAt',
          'usuarioCreated.denominacion as usuarioCreated_nombre',
          'usuarioUpdated.denominacion as usuarioUpdated_nombre',
          'usuarioDeleted.denominacion as usuarioDeleted_nombre',
        ])
        .where('superLinea.id = :id', { id })
        .getRawOne();

      console.debug('RAW RESULTADO:', raw);

      if (!raw) return null;

      return {
        id: raw.superLinea_id ?? 0,
        detalle: raw.superLinea_denominacion
          ? `superLínea ${raw.superLinea_denominacion}`
          : 'superLínea (sin denominación)',
        createdAt: raw.superLinea_createdAt
          ? FechaUtils.formatFechaHora(raw.superLinea_createdAt)
          : '',
        updatedAt: raw.superLinea_updatedAt
          ? FechaUtils.formatFechaHora(raw.superLinea_updatedAt)
          : '',
        deletedAt: raw.superLinea_deletedAt
          ? FechaUtils.formatFechaHora(raw.superLinea_deletedAt)
          : '',
        usuarioCreated: raw.usuarioCreated_nombre ?? '',
        usuarioUpdated: raw.usuarioUpdated_nombre ?? '',
        usuarioDeleted: raw.usuarioDeleted_nombre ?? '',
      };
    } catch (error) {
      console.error('ERROR EN findByIdConAuditoria:', error);
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }
}
