import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SuperLineaService } from '../services/super-linea.service';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';

@Controller('super-linea')
export class SuperLineaController {
  constructor(private readonly superLineaService: SuperLineaService) {}

  @Post()
  create(@Body() createSuperLineaDto: CreateSuperLineaDto) {
    return this.superLineaService.create(createSuperLineaDto);
  }

  @Get()
  findAll() {
    return this.superLineaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superLineaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSuperLineaDto: UpdateSuperLineaDto) {
    return this.superLineaService.update(+id, updateSuperLineaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.superLineaService.remove(+id);
  }
}
