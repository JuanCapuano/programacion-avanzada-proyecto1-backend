import { HistorialPrecioProducto } from '../entities/historial-precio-producto.entity';
import { Producto } from '../../../producto/domain/entities/producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { RegistrarHistorialPrecioDto } from '../../dto/registrar-historial-precio.dto';

export interface IHistorialPrecioRepository {
  /**
   * Persiste un nuevo registro de cambio de precio.
   */
  registrar(
    dto: RegistrarHistorialPrecioDto,
    producto: Producto,
    usuario: Usuario,
  ): Promise<HistorialPrecioProducto>;

  /**
   * Devuelve todos los registros de historial de un producto,
   * ordenados del más reciente al más antiguo.
   */
  findByProductoId(
    productoId: number,
    skip: number,
    take: number,
  ): Promise<{ data: HistorialPrecioProducto[]; total: number }>;
}
