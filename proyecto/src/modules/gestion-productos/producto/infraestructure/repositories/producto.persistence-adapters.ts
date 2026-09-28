import { FiltrosCatalogo } from '../../domain/interfaces/filtros-catalogo';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transactional } from 'src/modules/common/decorators/transactional.decoratos';
import { DatabaseConnectionException } from 'src/modules/common/exceptions/database-connection.exception';
import { EntityNotFoundException } from 'src/modules/common/exceptions/entity-notFound-exceptions';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { Linea } from 'src/modules/gestion-productos/linea/domain/entities/linea.entity';
import { Marca } from 'src/modules/gestion-productos/marca/domain/entities/marca.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { Repository, IsNull, DataSource } from 'typeorm';
import { Producto } from '../../domain/entities/producto.entity';
import { IProductoRepository } from '../../domain/interfaces/producto.repository-interface';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { UpdatePrecioDto } from '../../dto/update-precio.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { ProductoMapper } from '../../mappers/producto.mapper';
import { HistorialPrecioProducto } from '../../../historial-precio-producto/domain/entities/historial-precio-producto.entity';


@Injectable()
export class ProductoPersistenceAdapter implements IProductoRepository {
  private readonly logger = new Logger(ProductoPersistenceAdapter.name);

  private readonly ENTITY_NAME = 'Producto';

  constructor(
    @InjectRepository(Producto)
    private readonly repository: Repository<Producto>,
    private readonly dataSource: DataSource,
    @Inject('UnitOfWork') public readonly uow: IUnitOfWork,
  ) { }

  // El precio lo calcula ProductoService (entity.calcularPrecio()) antes de llamar a save(); acá solo se persiste.
  async save(entity: Producto): Promise<Producto> {
    try {
      return await this.repository.save(entity);
    } catch (error) {
      this.logger.error(`Error al guardar ${this.ENTITY_NAME}:`, error);
      throw new DatabaseConnectionException('Error al guardar en la base de datos.');
    }
  }

  async findOne(id: number): Promise<Producto | null> {
    try {
      const entity = await this.repository
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.linea', 'linea')
        .leftJoinAndSelect('producto.marca', 'marca')
        .where('producto.id = :id', { id })
        .andWhere('producto.deletedAt IS NULL')
        .getOne();
      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada.');
      }
      return entity;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        // Deja pasar la excepción específica
        throw error;
      }

      // Otros errores son considerados como problemas de conexión
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findByIdConAuditoria(id: number): Promise<Producto | null> {
    try {
      const entity = await this.repository
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.usuarioCreated', 'usuarioCreated')
        .leftJoinAndSelect('producto.usuarioUpdated', 'usuarioUpdated')
        .leftJoinAndSelect('producto.usuarioDeleted', 'usuarioDeleted')
        .where('producto.id = :id', { id })

        .getOne();
      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada.');
      }
      return entity;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        // Deja pasar la excepción específica
        throw error;
      }

      // Otros errores son considerados como problemas de conexión
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findByIdWithoutRelations(id: number): Promise<Producto | null> {
    try {
      const entity = await this.repository
        .createQueryBuilder('producto')
        .where('producto.id = :id', { id })
        .andWhere('producto.deletedAt IS NULL') // Si usás soft delete
        .getOne();

      if (!entity) {
        throw new EntityNotFoundException('Entidad no encontrada.');
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

  async updateEntity(uow: IUnitOfWork, producto: Producto): Promise<Producto> {
    const repo = uow.getRepository(Producto);
    return await repo.save(producto);
  }

  async remove(entity: Producto, usuario: Usuario): Promise<Producto> {

    if (entity.deletedAt) {
      throw new NotFoundException('Entidad  ya eliminada.');
    }

    try {
      // Marcar como eliminada y guardar los cambios
      entity.deletedAt = new Date();
      entity.usuarioDeleted = usuario;
      return await this.repository.save(entity);
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al guardar en la base de datos.',
      );
    }
  }

  async findByCatalogo(filtros: FiltrosCatalogo): Promise<{ data: Producto[]; total: number }> {
    const query = this.repository.createQueryBuilder('producto')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.linea', 'linea')
      .leftJoin('linea.superLinea', 'superLinea')
      .where('producto.deletedAt IS NULL');

    const campos = {
      denominacion: 'producto.denominacion',
      linea: 'linea.denominacion',
      superLinea: 'superLinea.denominacion',
    } as const;
    for (const clave of Object.keys(campos) as (keyof typeof campos)[]) {
      const texto = filtros[clave]?.trim();
      if (texto) {
        // Los comodines escritos por el usuario se buscan como caracteres literales.
        const literal = texto.replace(/[!%_]/g, (caracter) => `!${caracter}`);
        query.andWhere(`UPPER(${campos[clave]}) LIKE UPPER(:${clave}) ESCAPE '!'`, {
          [clave]: `%${literal}%`,
        });
      }
    }
    const texto = filtros.texto?.trim();
    if (texto) {
      const literal = texto.replace(/[!%_]/g, (caracter) => `!${caracter}`);
      const seleccionados = [
        filtros.buscarDenominacion !== false ? campos.denominacion : null,
        filtros.buscarLinea !== false ? campos.linea : null,
        filtros.buscarSuperLinea !== false ? campos.superLinea : null,
      ].filter((campo) => campo !== null);
      if (seleccionados.length === 0) return { data: [], total: 0 };
      query.andWhere(`(${seleccionados.map(
        (campo) => `UPPER(${campo}) LIKE UPPER(:texto) ESCAPE '!'`,
      ).join(' OR ')})`, { texto: `%${literal}%` });
    }
    const [data, total] = await query.orderBy('producto.denominacion', 'ASC')
      .addOrderBy('producto.id', 'ASC')
      .skip(filtros.skip).take(filtros.take).getManyAndCount();
    return { data, total };
  }

  async findBy(
    denominacion: string,
    codigoProveedor: string,
    codProveedorExacto: boolean,
    codigoReferencia: string,
    marca_id: number,
    linea_id: number,
    proveedor_id: number,
    conStock: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: Producto[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.linea', 'linea')

    if (denominacion || codigoProveedor || codigoReferencia) {
      const condiciones: string[] = [];
      const parametros: any = {};

      if (denominacion) {
        condiciones.push(
          `UPPER(producto.denominacion) LIKE UPPER(:denominacion)`,
        );
        parametros.denominacion = `%${denominacion}%`;
      }

      if (codigoProveedor) {
        if (codProveedorExacto) {
          condiciones.push(
            `UPPER(producto.codigoProveedor) = UPPER(:codigoProveedor)`,
          );
          parametros.codigoProveedor = codigoProveedor;
        } else {
          condiciones.push(
            `UPPER(producto.codigoProveedor) LIKE UPPER(:codigoProveedor)`,
          );
          parametros.codigoProveedor = `%${codigoProveedor}%`;
        }
      }

      if (codigoReferencia) {
        condiciones.push(
          `UPPER(producto.codigoReferencia) LIKE UPPER(:codigoReferencia)`,
        );
        parametros.codigoReferencia = `%${codigoReferencia}%`;
      }

      query.andWhere(`(${condiciones.join(' OR ')})`, parametros);
    }

    if (marca_id) {
      query.andWhere('marca.id = :marca_id', { marca_id });
    }
    if (linea_id) {
      query.andWhere('linea.id = :linea_id', { linea_id });
    }

    if (conStock) {
      query.andWhere('producto.stock > 0');
    }
    query.andWhere('producto.deletedAt IS NULL');
    query.orderBy('producto.denominacion', 'ASC');
    // Paginación
    query.skip(skip).take(take);

    const [data, total] = await query.getManyAndCount();
    return {
      data,
      total,
    };
  }

  async findByRapido(
    codigo: string,
    exacto: boolean,
    skip: any,
    take: number,
  ): Promise<{ data: Producto[]; total: number }> {

    const query = this.repository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.linea', 'linea')
      .leftJoinAndSelect('producto.proveedor', 'proveedor')
      .where('producto.deletedAt IS NULL');


    if (codigo) {
      if (exacto) {
        // Exacto solo en los códigos
        query.andWhere(
          '(producto.codigoProveedor = :codigo OR producto.codigoReferencia = :codigo)',
          { codigo },
        );
      } else {
        // Parcial en códigos Y denominación
        query.andWhere(
          `(
        producto.codigoProveedor LIKE :codigo OR 
        producto.codigoReferencia LIKE :codigo OR 
        producto.denominacion LIKE :codigo
      )`,
          { codigo: `%${codigo}%` },
        );
      }
    }

    query.orderBy('producto.denominacion', 'ASC');
    query.skip(skip).take(take);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async isCodigoProveedorDuplicado(
    codigoProveedor: string | null,
    id?: number,
  ): Promise<boolean> {
    // Si el código es nulo, vacío o '0', no hace falta verificar duplicados
    if (
      !codigoProveedor ||
      codigoProveedor.trim() === '' ||
      codigoProveedor === '0'
    ) {
      return false;
    }

    const query = this.repository
      .createQueryBuilder('producto')
      .where('producto.codigoProveedor = :codigoProveedor', {
        codigoProveedor,
      });

    // Si se está actualizando, excluimos el producto actual
    if (id) {
      query.andWhere('producto.id != :id', { id });
    }

    const existe = await query.getExists();

    return existe; // true si existe otro con el mismo código
  }

  async findParaAjusteMasivo(
    alcance: 'linea' | 'global',
    lineaId?: number,
  ): Promise<Producto[]> {
    const query = this.repository
      .createQueryBuilder('producto')
      .where('producto.deletedAt IS NULL');

    if (alcance === 'linea') {
      query.andWhere('producto.linea_id = :lineaId', { lineaId });
    }

    return query.getMany();
  }

  @Transactional()
  async saveMany(entities: Producto[]): Promise<Producto[]> {
    const repo = this.uow.getRepository(Producto);
    return repo.save(entities);
  }

  @Transactional()
  async guardarConHistorial(
    productos: Producto[],
    historial: HistorialPrecioProducto[],
  ): Promise<Producto[]> {
    try {
      const guardados = await this.uow.getRepository(Producto).save(productos);
      if (historial.length > 0) {
        await this.uow.getRepository(HistorialPrecioProducto).save(historial);
      }
      this.logger.log(
        `${guardados.length} ${this.ENTITY_NAME}(s) guardado(s) con ${historial.length} registro(s) de historial de precio`,
      );
      return guardados;
    } catch (error) {
      this.logger.error(`Error al guardar ${this.ENTITY_NAME} con historial de precio:`, error);
      throw new DatabaseConnectionException('Error al guardar en la base de datos.');
    }
  }

  async findByDenominacion(denominacion: string): Promise<Producto | null> {
    try {
      const entity = await this.repository.findOne({
        where: { denominacion, deletedAt: IsNull() },
      });
      return entity;
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async existsByDenominacion(
    denominacion: string,
    excludeId?: number,
  ): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('producto')
        .where('producto.denominacion = :denominacion', { denominacion })
        .andWhere('producto.deletedAt IS NULL');

      if (excludeId) {
        queryBuilder.andWhere('producto.id != :excludeId', { excludeId });
      }

      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error verificando existencia de denominación: `,
      );
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async findByDenominacionCodigoProveedorFiltered(
    denominacion: string,
    skip = 0,
    take = 10,
  ): Promise<{ data: Producto[]; total: number }> {
    try {
      const query = this.repository
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.marca', 'marca')
        .leftJoinAndSelect('producto.linea', 'linea')

      query.andWhere('producto.deletedAt IS NULL');
      query.orderBy('producto.denominacion', 'ASC');
      // Paginación
      query.skip(skip).take(take);

      const [data, total] = await query.getManyAndCount();

      return { data, total };
    } catch (error) {
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }

  async existsProductosActivosByMarca(marcaId: number): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('producto')
      .where('producto.marca_id = :marcaId', { marcaId })
      .andWhere('producto.deletedAt IS NULL')
      .limit(1)
      .getCount();

    return count > 0;
  }

  async existsProductosActivosByLinea(lineaId: number): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('producto')
      .where('producto.linea_id = :lineaId', { lineaId })
      .andWhere('producto.deletedAt IS NULL')
      .limit(1) // opcional, para optimizar
      .getCount();

    return count > 0;
  }

  async findByIds(ids: number[]): Promise<Producto[]> {

    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return [];
    }

    return await this.repository
      .createQueryBuilder('producto')
      .where('producto.id IN (:...ids)', { ids: uniqueIds })
      .getMany();
  }

  async existsByCodigoProveedor(codigoProveedor: string, excludeId: number): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('producto')
        .where('producto.codigoProveedor = :codigoProveedor', { codigoProveedor })
        .andWhere('producto.deletedAt IS NULL');

      if (excludeId) {
        queryBuilder.andWhere('producto.id != :excludeId', { excludeId });
      }

      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error verificando existencia de denominación:}`,
      );
      throw new DatabaseConnectionException(
        'Error al conectar con la base de datos.',
      );
    }
  }
}

