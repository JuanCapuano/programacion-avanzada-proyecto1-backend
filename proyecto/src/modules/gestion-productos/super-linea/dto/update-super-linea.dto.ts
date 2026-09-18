import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperLineaDto } from './create-super-linea.dto';

export class UpdateSuperLineaDto extends PartialType(CreateSuperLineaDto) {}
