import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';
import {
  IsNotEmpty,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  // acá no se redefine la denominacion, partial type ya la hereda

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;

  updatedAt: Date;
}
