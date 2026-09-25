import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Logger,
  ParseIntPipe,
  Put,
  Patch,
  Query,
  UsePipes,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { SearchCatalogoDto } from '../../dto/search-catalogo.dto';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { UpdatePrecioDto } from '../../dto/update-precio.dto';
import { NormalizeDenominacionPipe } from 'src/modules/common/pipes/normalize-denominations.pipe';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { Roles } from 'src/modules/gestion-usuario/auth/roles.decorator';
import {
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NormalizeCodigoProveedorPipe } from 'src/modules/common/pipes/normalize-codigo-proveedor.pipe';
import { GetProductoDto } from '../../dto/get-producto.dto';
import { SearchProductoPaginationWithDto } from '../../dto/search-producto-pagination-with.dto';
import { ProductoDto } from '../../dto/producto.dto';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { NormalizeDenominacionSearchPipe } from 'src/modules/common/pipes/normalize-denominations-search.pipe';
import { DenominacionBusquedaDto } from 'src/modules/common/dto/denominacion-busqueda.dto';
import { SearchProductoRapidoDto } from '../../dto/search-producto-rapido.dto';
import { ActualizacionMasivaPrecioDto } from '../../dto/actualizacion-masiva-precio.dto';
import { PreviewActualizacionMasivaPrecioDto } from '../../dto/preview-actualizacion-masiva-precio.dto';
import { ProductoService } from '../services/producto.service';
import { ProductoDomainExceptionFilter } from '../filters/producto-domain-exception.filter';
import { PrevisualizarDenominacionDto } from '../../dto/previsualizar-denominacion.dto';
import { DenominacionPrevisualizadaDto } from '../../dto/denominacion-previsualizada.dto';
import { GuardarCambioPreciosMasivoDto } from 'src/modules/gestion-productos/historial-precio-producto/dto/guardar-cambio-precios-masivo.dto';


@ApiTags('Gestion Productos')
@Controller('producto')
@UseGuards(AuthGuard)
@UseFilters(ProductoDomainExceptionFilter)
export class ProductoController {
  private readonly logger = new Logger(ProductoController.name);
  constructor(private readonly service: ProductoService) {}

  private readonly ENTITY_NAME = 'Producto';

  @Post()
  @Roles('Root', 'Administrador', 'Empleado', 'Repartidor', 'Repositor')
  @UsePipes(NormalizeDenominacionPipe)
  @UsePipes(NormalizeCodigoProveedorPipe)
  create(@Body() createDto: CreateProductoDto) {
    this.logger.log(`Creando un nuevo ${this.ENTITY_NAME}...`);
    return this.service.create(createDto);
  }
  
  // POST y no PUT: los ajustes de costo no son idempotentes (+10% dos veces da +21%),
  // y PUT le promete al cliente que puede reintentar la petición sin efectos extra.
  @Post('precios/actualizacion-masiva')
  @Roles('Root', 'Administrador')
  actualizarPreciosMasivo(@Body() dto: ActualizacionMasivaPrecioDto) {
    this.logger.log('Actualizando precios de forma masiva...');
    return this.service.actualizarPreciosMasivo(dto);
  }

  /*CR-006 (HU3): previsualiza el resultado de la actualización masiva de precios sin persistir nada, para que el frontend lo muestre antes de que el usuario confirme.*/
  @Post('precios/actualizacion-masiva/preview')
  @Roles('Root', 'Administrador')
  @ApiOkResponse({ type: PreviewActualizacionMasivaPrecioDto, isArray: true })
  previsualizarActualizacionMasivo(
    @Body() dto: ActualizacionMasivaPrecioDto,
  ): Promise<PreviewActualizacionMasivaPrecioDto[]> {
    this.logger.log('Previsualizando actualización masiva de precios...');
    return this.service.previsualizarActualizacionMasivo(dto);
  }

  @Get('find-all-for-marcas/select')
  @Roles(
    'Root',
    'Administrador',
    'Empleado',
    'Repartidor',
    'Repositor',
    'Vendedor',
  )
  @UsePipes(NormalizeDenominacionSearchPipe)
  async findAllMarcasFor(@Query() dto: DenominacionBusquedaDto) {
    const { denominacion = '' } = dto;
    return this.service.findAllForMarcas(denominacion);
  }


  @Get('find-all-for-lineas/select')
  @Roles(
    'Root',
    'Administrador',
    'Empleado',
    'Repartidor',
    'Repositor',
    'Vendedor',
  )
  @UsePipes(NormalizeDenominacionSearchPipe)
  async findAllLineasFor(@Query() dto: DenominacionBusquedaDto) {
    const { denominacion = '' } = dto;
    return this.service.findAllForLineas(denominacion);
  }

  @Get('search-by-rapido')
  @Roles(
    'Root',
    'Administrador',
    'Empleado',
    'Vendedor',
    'Repartidor',
    'Repositor',
  )
  @UsePipes(NormalizeDenominacionSearchPipe)
  async searchRapido(@Query() dto: SearchProductoRapidoDto) {
    const { exacto, codigo, skip, take } = dto;
    return this.service.findByRapido(codigo, exacto, skip, take);
  }

  @Get('search-catalogo')
  @Roles('Root', 'Administrador', 'Empleado', 'Vendedor', 'Repartidor', 'Repositor')
  searchCatalogo(@Query() dto: SearchCatalogoDto) {
    return this.service.findByCatalogo(dto);
  }

  @Get('search-by')
  @Roles(
    'Root',
    'Administrador',
    'Empleado',
    'Vendedor',
    'Repartidor',
    'Repositor',
  )
  @UsePipes(NormalizeDenominacionSearchPipe)
  async search(@Query() dto: SearchProductoPaginationWithDto) {
    const {
      denominacion = '',
      codProveedorExacto,
      codigoProveedor,
      codigoReferencia,
      marcaId,
      lineaId,
      proveedorId,
      conStock,
      skip,
      take,
    } = dto;
    return this.service.findBy(
      denominacion,
      codigoProveedor,
      codProveedorExacto,
      codigoReferencia,
      marcaId,
      lineaId,
      proveedorId,
      conStock,
      skip,
      take,
    );
  }

  /*US-10: devuelve la denominación automática que tendría un producto con esta marca, línea y presentación, sin guardar nada. El front la usa para mostrar el nombre mientras el usuario completa el formulario. Declarada antes de @Get(':id') para que nunca la capture esa ruta.*/
  @Get('denominacion/previsualizar')
  @Roles('Root', 'Administrador', 'Empleado', 'Repartidor', 'Repositor')
  @ApiOkResponse({ type: DenominacionPrevisualizadaDto })
  previsualizarDenominacion(
    @Query() dto: PrevisualizarDenominacionDto,
  ): Promise<DenominacionPrevisualizadaDto> {
    return this.service.previsualizarDenominacion(dto);
  }

  @Get('marca/:id')
  @Roles('Root', 'Administrador', 'Empleado')
  async getMarcaDelProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarMarcaDesdeProducto(id);
  }


  @Get('linea/:id')
  @Roles('Root', 'Administrador', 'Empleado')
  async geLineaDelProducto(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarLineaDesdeProducto(id);
  }

  @Get(':id')
  @Roles('Root', 'Administrador', 'Empleado')
  @ApiOkResponse({ type: ProductoDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductoDto> {
    this.logger.log(`Buscando  ${this.ENTITY_NAME} con ID: ${id}`);
    return this.service.findDtoById(+id);
  }

  @Put(':id')
  @Roles('Root', 'Administrador', 'Empleado')
  @UsePipes(NormalizeDenominacionPipe)
  @UsePipes(NormalizeCodigoProveedorPipe)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductoDto,
  ) {
    this.logger.log(`Actualizando  ${this.ENTITY_NAME} con ID: ${id}`);
    return this.service.update(id, updateDto);
  }


  /*US-11: descarta la denominación manual y vuelve a generarla a partir demarca, línea y presentación. El producto queda en modo automático. */
  @Patch(':id/restaurar-denominacion')
  @Roles('Root', 'Administrador', 'Empleado')
  restaurarDenominacion(
    @Param('id', ParseIntPipe) id: number,
    @Query('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    this.logger.log(
      `Restaurando denominación automática de ${this.ENTITY_NAME} con ID: ${id}`,
    );
    return this.service.restaurarDenominacionAutomatica(id, usuarioId);
  }

  @Delete(':id')
  @Roles('Root', 'Administrador', 'Empleado')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    this.logger.warn(
      `Eliminando ${this.ENTITY_NAME} con ID: ${id} por usuario: ${usuarioId}`,
    );
    return this.service.remove(id, usuarioId);
  }

  @Patch(':id/precio')
  @Roles('Root', 'Administrador', 'Empleado')
  actualizarPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrecioDto,
  ) {
    this.logger.log(`Actualizando precio del ${this.ENTITY_NAME} con ID: ${id}`);
    return this.service.actualizarPrecio(id, dto);
  }


  @Get(':id/audit')
  @Roles('Root', 'Administrador', 'Empleado')
  @ApiOkResponse({
    description: 'Informacion de auditoria',
    type: AuditoriaDto,
  })
  async findByIdConAuditoria(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditoriaDto> {
    const data = await this.service.findByIdConAuditoria(id);
    return data;
  }
}
