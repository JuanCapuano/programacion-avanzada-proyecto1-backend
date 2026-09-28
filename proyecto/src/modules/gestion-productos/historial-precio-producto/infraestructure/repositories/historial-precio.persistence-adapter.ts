import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialPrecioProducto } from '../../domain/entities/historial-precio-producto.entity';
import { IHistorialPrecioRepository } from '../../domain/interfaces/historial-precio.repository-interface';
import { RegistrarHistorialPrecioDto } from '../../dto/registrar-historial-precio.dto';
import { Producto } from '../../../producto/domain/entities/producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { HistorialPrecioMapper } from '../../mappers/historial-precio.mapper';
import { DatabaseConnectionException } from 'src/modules/common/exceptions/database-connection.exception';

@Injectable()
export class HistorialPrecioPersistenceAdapter
  implements IHistorialPrecioRepository
{
  private readonly logger = new Logger(HistorialPrecioPersistenceAdapter.name);

  constructor(
    @InjectRepository(HistorialPrecioProducto)
    private readonly repository: Repository<HistorialPrecioProducto>,
  ) {}

  async registrar(
    dto: RegistrarHistorialPrecioDto,
    producto: Producto,
    usuario: Usuario,
  ): Promise<HistorialPrecioProducto> {
    this.logger.log(
      `[BACK · HistorialPrecioPersistence] registrar — productoId=${producto.id} usuarioId=${usuario.id}`,
    );
    try {
      const entidad = HistorialPrecioMapper.toEntity(dto, producto, usuario);
      this.logger.log(`[BACK · HistorialPrecioPersistence] entidad construida:`, JSON.stringify(entidad));
      const guardada = await this.repository.save(entidad);
      this.logger.log(`[BACK · HistorialPrecioPersistence] ✅ guardada con id=${guardada.id}`);
      return guardada;
    } catch (error) {
      this.logger.error('[BACK · HistorialPrecioPersistence] ❌ Error al guardar:', error);
      throw new DatabaseConnectionException(
        'Error al guardar el historial de precio en la base de datos.',
      );
    }
  }

  async findByProductoId(
    productoId: number,
    skip: number,
    take: number,
  ): Promise<{ data: HistorialPrecioProducto[]; total: number }> {
    this.logger.log(
      `[BACK · HistorialPrecioPersistence] findByProductoId — productoId=${productoId} skip=${skip} take=${take}`,
    );
    try {
      const [data, total] = await this.repository
        .createQueryBuilder('historial')
        .leftJoinAndSelect('historial.usuario', 'usuario')
        .where('historial.productoId = :productoId', { productoId })
        .orderBy('historial.fecha', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount();

      this.logger.log(
        `[BACK · HistorialPrecioPersistence] ✅ query OK — total=${total} devueltos=${data.length}`,
      );
      return { data, total };
    } catch (error) {
      this.logger.error('[BACK · HistorialPrecioPersistence] ❌ Error en query:', error);
      throw new DatabaseConnectionException(
        'Error al consultar el historial de precio.',
      );
    }
  }
}
