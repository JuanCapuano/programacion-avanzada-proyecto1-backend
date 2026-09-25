import { HistorialPrecioProducto } from '../domain/entities/historial-precio-producto.entity';
import { HistorialPrecioDto } from '../dto/historial-precio.dto';
import { RegistrarHistorialPrecioDto } from '../dto/registrar-historial-precio.dto';
import { Producto } from '../../producto/domain/entities/producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';

export class HistorialPrecioMapper {
  /**
   * Construye la entidad a partir del DTO interno y las entidades relacionadas.
   */
  static toEntity(
    dto: RegistrarHistorialPrecioDto,
    producto: Producto,
    usuario: Usuario,
  ): HistorialPrecioProducto {
    const entidad = new HistorialPrecioProducto();

    entidad.producto = producto;
    entidad.productoId = producto.id;
    entidad.usuario = usuario;

    entidad.precioAnterior = dto.precioAnterior;
    entidad.costoAnterior = dto.costoAnterior;
    entidad.costoDolarAnterior = dto.costoDolarAnterior;
    entidad.cotizacionDolarAnterior = dto.cotizacionDolarAnterior;
    entidad.porcentajeAnterior = dto.porcentajeAnterior;

    entidad.precioNuevo = dto.precioNuevo;
    entidad.costoNuevo = dto.costoNuevo;
    entidad.costoDolarNuevo = dto.costoDolarNuevo;
    entidad.cotizacionDolarNuevo = dto.cotizacionDolarNuevo;
    entidad.porcentajeNuevo = dto.porcentajeNuevo;

    entidad.motivo = dto.motivo;

    return entidad;
  }

  /**
   * Mapea la entidad al DTO de salida para el controlador.
   * El usuario se aplana a su denominación para simplificar la respuesta.
   */
  static toDto(entidad: HistorialPrecioProducto): HistorialPrecioDto {
    const dto = new HistorialPrecioDto();

    dto.id = entidad.id;
    dto.productoId = entidad.productoId;
    dto.fecha = entidad.fecha;
    dto.motivo = entidad.motivo;
    dto.usuario = entidad.usuario?.denominacion ?? '';

    dto.precioAnterior = entidad.precioAnterior;
    dto.costoAnterior = entidad.costoAnterior;
    dto.costoDolarAnterior = entidad.costoDolarAnterior;
    dto.cotizacionDolarAnterior = entidad.cotizacionDolarAnterior;
    dto.porcentajeAnterior = entidad.porcentajeAnterior;

    dto.precioNuevo = entidad.precioNuevo;
    dto.costoNuevo = entidad.costoNuevo;
    dto.costoDolarNuevo = entidad.costoDolarNuevo;
    dto.cotizacionDolarNuevo = entidad.cotizacionDolarNuevo;
    dto.porcentajeNuevo = entidad.porcentajeNuevo;

    return dto;
  }

  static toDtoList(entidades: HistorialPrecioProducto[]): HistorialPrecioDto[] {
    return entidades.map((e) => HistorialPrecioMapper.toDto(e));
  }
}
