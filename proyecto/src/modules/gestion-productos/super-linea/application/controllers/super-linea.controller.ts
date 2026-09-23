import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Logger, UsePipes, Query } from '@nestjs/common';
import { SuperLineaService } from '../services/super-linea.service';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { NormalizeDenominacionPipe } from 'src/modules/common/pipes/normalize-denominations.pipe';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';
import { NormalizeDenominacionSearchPipe } from 'src/modules/common/pipes/normalize-denominations-search.pipe';
import { PaginationWithDenominacionDto } from 'src/modules/common/dto/busquedas/pagination-with-denominacion.dto';

//AGREGAR ROLES Y GUARDS

@ApiTags('Gestion Productos')
@Controller('super-linea')
export class SuperLineaController {

  private readonly logger = new Logger(SuperLineaController.name)
  constructor(private readonly superLineaService: SuperLineaService) {}

  private readonly ENTITY_NAME = 'Super Linea';

  @Post()
  @UsePipes(NormalizeDenominacionPipe)
  create(@Body() createSuperLineaDto: CreateSuperLineaDto) {
    this.logger.log(`Creando un nuevo ${this.ENTITY_NAME}...`);
    return this.superLineaService.create(createSuperLineaDto);
  }

   @Get('search-by')
  @UsePipes(NormalizeDenominacionSearchPipe)
  findByDenominacionFiltered(
    @Query() paginationDto: PaginationWithDenominacionDto,
  ) {
    const { denominacion = '', skip, take, incluirEliminados } = paginationDto;
    this.logger.log(`Buscando usuarios con denominación: ${denominacion}`);
    return this.superLineaService.findByDenominacionFiltered(
      denominacion,
      skip,
      take,
      incluirEliminados,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Buscando  ${this.ENTITY_NAME} con ID: ${id}`);
    return this.superLineaService.findByIdDto(id);
  }

  @Put(':id')
  @UsePipes(NormalizeDenominacionPipe)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSuperLineaDto: UpdateSuperLineaDto) {
    this.logger.log(`Actualizando  ${this.ENTITY_NAME} con ID: ${id}`);
    return this.superLineaService.update(id, updateSuperLineaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Query('usuarioId', ParseIntPipe) usuarioId: number) {
    this.logger.warn(
      `Eliminando ${this.ENTITY_NAME} con ID: ${id} por usuario: ${usuarioId}`,
    );
    return this.superLineaService.remove(id, usuarioId);
  }

  @Get(':id/audit') 
  @ApiOkResponse({
    description: 'Informacion de auditoria',
    type: AuditoriaDto,
  })
  async findByIdConAuditoria(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditoriaDto> {
    const data = await this.superLineaService.findByIdConAuditoria(id);
    return data;
  }

}
