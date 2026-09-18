import { Injectable } from '@nestjs/common';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';

@Injectable()
export class SuperLineaService {
  create(createSuperLineaDto: CreateSuperLineaDto) {
    return 'This action adds a new superLinea';
  }

  findAll() {
    return `This action returns all superLinea`;
  }

  findOne(id: number) {
    return `This action returns a #${id} superLinea`;
  }

  update(id: number, updateSuperLineaDto: UpdateSuperLineaDto) {
    return `This action updates a #${id} superLinea`;
  }

  remove(id: number) {
    return `This action removes a #${id} superLinea`;
  }
}
