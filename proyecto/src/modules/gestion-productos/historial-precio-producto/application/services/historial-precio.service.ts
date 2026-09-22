import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IHistorialPrecioRepository } from '../../domain/interfaces/historial-precio.repository-interface';
import { RegistrarHistorialPrecioDto } from '../../dto/registrar-historial-precio.dto';
import { HistorialPrecioMapper } from '../../mappers/historial-precio.mapper';
import { HistorialPrecioDto } from '../../dto/historial-precio.dto';
import { Producto } from '../../../producto/domain/entities/producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { PaginacionUtils } from 'src/modules/common/utils/pagination/paginacion-utils';
import { UsuarioService } from '../../../../../modules/gestion-usuario/usuario/application/services/usuario.service';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';

@Injectable()
export class HistorialPrecioService {
  private readonly logger = new Logger(HistorialPrecioService.name);

  constructor(
    @Inject('IHistorialPrecioRepository')
    private readonly repository: IHistorialPrecioRepository,
    private readonly usuarioService: UsuarioService,
  ) {}

  async registrarSiCambio(
    dto: RegistrarHistorialPrecioDto,
    producto: Producto,
    usuario: Usuario,
  ): Promise<boolean> {
    this.logger.log(
      `[BACK · HistorialPrecioService] registrarSiCambio — productoId=${dto.productoId} precioAnterior=${dto.precioAnterior} precioNuevo=${dto.precioNuevo}`,
    );

    if (dto.precioNuevo <= 0) {
      this.logger.warn(
        `[BACK · HistorialPrecioService] ❌ precioNuevo=${dto.precioNuevo} <= 0, rechazando`,
      );
      throw new BadRequestException(
        `El precio resultante (${dto.precioNuevo}) debe ser mayor a 0. El cambio fue rechazado.`,
      );
    }

    if (dto.precioNuevo === dto.precioAnterior) {
      this.logger.log(
        `[BACK · HistorialPrecioService] precio sin cambio (${dto.precioAnterior}), no se registra`,
      );
      return false;
    }

    this.logger.log(`[BACK · HistorialPrecioService] Guardando en BD...`);
    await this.repository.registrar(dto, producto, usuario);
    this.logger.log(
      `[BACK · HistorialPrecioService] ✅ Guardado: $${dto.precioAnterior} → $${dto.precioNuevo} | motivo="${dto.motivo}"`,
    );

    return true;
  }

  async findByProductoId(
    productoId: number,
    skip = 0,
    take = 20,
  ): Promise<{ data: HistorialPrecioDto[]; total: number }> {
    this.logger.log(
      `[BACK · HistorialPrecioService] findByProductoId — productoId=${productoId} skip=${skip} take=${take}`,
    );

    const { data, total } = await this.repository.findByProductoId(
      productoId,
      skip,
      take,
    );

    this.logger.log(
      `[BACK · HistorialPrecioService] BD devolvió total=${total} registros=${data.length}`,
    );

    return {
      data: HistorialPrecioMapper.toDtoList(data),
      total: PaginacionUtils.totalItems(total),
    };
  }

  /**
   * Guarda el cambio de precio de múltiples productos y registra historial
   * por cada uno cuyo precio efectivamente cambie.

  async guardarCambioPreciosMasivo(dto: GuardarCambioPreciosMasivoDto) {
    this.logger.log(
      `[BACK · HistorialPrecioService] guardarCambioPreciosMasivo — ${dto.items.length} items — motivo="${dto.motivo}"`,
    );

    const usuario = await this.usuarioService.findOne(dto.usuarioId);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${dto.usuarioId} no encontrado.`);
    }

    const resultados = await Promise.all(
      dto.items.map(async (item) => {
        const producto = await this.productoService.findEntityById(item.productoId);

        const precioAnterior = producto.precio ?? 0;

        // Actualizar precio en el producto
        producto.precio = item.precio;
        producto.costo = item.costo;
        producto.costoDolar = item.costoDolar;
        producto.cotizacionDolar = item.cotizacionDolar;
        producto.porcentaje = item.porcentaje;
        producto.fechaCosto = new Date();
        producto.usuarioUpdated = usuario;

        // Usamos el repositorio directamente a través del servicio
        await this.productoService.actualizarPrecioDirecto(item.productoId, producto, usuario);

        const registrado = await this.registrarSiCambio(
          {
            productoId: item.productoId,
            precioAnterior,
            costoAnterior: producto.costo ?? 0,
            costoDolarAnterior: producto.costoDolar ?? 0,
            cotizacionDolarAnterior: producto.cotizacionDolar ?? 0,
            porcentajeAnterior: producto.porcentaje ?? 0,
            precioNuevo: item.precio,
            costoNuevo: item.costo,
            costoDolarNuevo: item.costoDolar,
            cotizacionDolarNuevo: item.cotizacionDolar,
            porcentajeNuevo: item.porcentaje,
            motivo: dto.motivo,
            usuarioId: dto.usuarioId,
          },
          producto,
          usuario,
        );

        return { productoId: item.productoId, denominacion: producto.denominacion, registrado };
      }),
    );

    const conCambio = resultados.filter((r) => r.registrado).length;
    this.logger.log(
      `[BACK · HistorialPrecioService] Masivo completo: ${conCambio}/${dto.items.length} con cambio registrado`,
    );

    return MessageFrontUtils.create(
      `Actualización masiva completada. ${conCambio} producto(s) con cambio de precio registrado.`,
    );
}   */
  }
