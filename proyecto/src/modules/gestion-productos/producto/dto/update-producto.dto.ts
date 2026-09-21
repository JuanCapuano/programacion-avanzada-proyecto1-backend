import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CreateProductoDto } from './create-producto.dto';
import {
  DENOMINACION_LONGITUD_MAXIMA,
  DENOMINACION_PATRON,
  transformarDenominacionEdicion,
} from './denominacion.validacion';

/**
 * La denominación se excluye de la herencia porque en la edición tiene otra
 * regla: en el alta un campo vacío significa "generar automática", pero al
 * editar significa que el usuario borró el nombre, y eso se rechaza (US-11).
 */
export class UpdateProductoDto extends PartialType(
  OmitType(CreateProductoDto, ['denominacion'] as const),
) {
  /**
   * Si no viene, el nombre no se toca (o se regenera si es automático).
   * Si viene igual al actual, no cuenta como edición.
   * Para volver a la denominación automática se usa el endpoint
   * PATCH /producto/:id/restaurar-denominacion.
   */
  @Transform(transformarDenominacionEdicion)
  @IsOptional()
  @IsString({ message: 'La denominación debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La denominación no puede estar vacía.' })
  @MaxLength(DENOMINACION_LONGITUD_MAXIMA, {
    message: `La denominación no puede superar los ${DENOMINACION_LONGITUD_MAXIMA} caracteres.`,
  })
  @Matches(DENOMINACION_PATRON, {
    message: 'La denominación contiene caracteres inválidos.',
  })
  denominacion?: string;

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;

  updatedAt: Date;
}
