import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateProductoDto } from './create-producto.dto';
import {
  DENOMINACION_LONGITUD_MAXIMA,
  DENOMINACION_PATRON,
  transformarDenominacionEdicion,
} from './denominacion.validacion';

/**
 * Se excluyen de la herencia dos campos porque en la edición tienen otras
 * reglas que en el alta:
 * - denominacion (CR-005): en el alta vacía significa "generar automática";
 *   al editar significa que el usuario borró el nombre, y se rechaza.
 * - costo (CR-001): en el alta es obligatorio; al editar es opcional, pero si
 *   viene debe ser numérico (el rango lo valida el dominio).
 */
export class UpdateProductoDto extends PartialType(
  OmitType(CreateProductoDto, ['denominacion', 'costo'] as const),
) {
  /*Si no viene, el nombre no se toca (o se regenera si es automático). Si viene igual al actual, no cuenta como edición.*/
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

  /* CR-001: el costo es opcional al editar; si viene debe ser numérico. */
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({}, { message: 'El costo debe ser numérico' })
  costo?: number;

  /* CR-007: motivo del cambio de precio. Solo es obligatorio si el costo o el porcentaje enviados hacen cambiar el precio*/
  @IsOptional()
  @IsString({ message: 'El motivo debe ser una cadena de texto.' })
  @MaxLength(500, { message: 'El motivo no puede superar los 500 caracteres.' })
  motivo?: string;

  @IsNotEmpty({ message: 'El usuarioUpdatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioUpdatedId debe ser un número entero.' })
  usuarioUpdatedId: number;

  updatedAt: Date;
}
