import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { Roles } from 'src/modules/gestion-usuario/auth/roles.decorator';
import { HistorialPrecioService } from '../services/historial-precio.service';
import { HistorialPrecioDto } from '../../dto/historial-precio.dto';
import { PaginationDto } from 'src/modules/common/dto/pagination.dto';
import { GuardarCambioPreciosMasivoDto } from '../../dto/guardar-cambio-precios-masivo.dto';

@ApiTags('Historial Precio Producto')
@Controller('producto')
@UseGuards(AuthGuard)
export class HistorialPrecioController {
  private readonly logger = new Logger(HistorialPrecioController.name);

  constructor(private readonly service: HistorialPrecioService) {}

  /**
   * GET /producto/:productoId/historial-precio
   * Historial paginado de cambios de precio de un producto.
   */
  @Get(':productoId/historial-precio')
  @Roles('Root', 'Administrador', 'Empleado')
  @ApiOkResponse({ type: [HistorialPrecioDto] })
  async findByProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query() paginacion: PaginationDto,
  ): Promise<{ data: HistorialPrecioDto[]; total: number }> {
    const { skip = 0, take = 20 } = paginacion;
    this.logger.log(
      `[BACK · HistorialPrecioController] GET /producto/${productoId}/historial-precio — skip=${skip} take=${take}`,
    );
    const result = await this.service.findByProductoId(productoId, skip, take);
    this.logger.log(
      `[BACK · HistorialPrecioController] Respondiendo total=${result.total} registros=${result.data.length}`,
    );
    return result;
  }

  /**
   * PATCH /producto/cambio-precios-masivo
   * Aplica cambios de precio a múltiples productos y registra el historial.
  
  @Patch('cambio-precios-masivo')
  @Roles('Root', 'Administrador', 'Empleado')
  async guardarCambioPreciosMasivo(
    @Body() dto: GuardarCambioPreciosMasivoDto,
  ) {
    this.logger.log(
      `[BACK · HistorialPrecioController] PATCH /producto/cambio-precios-masivo — ${dto.items.length} productos — motivo="${dto.motivo}"`,
    );
    return this.service.guardarCambioPreciosMasivo(dto);
  }
     */
}
