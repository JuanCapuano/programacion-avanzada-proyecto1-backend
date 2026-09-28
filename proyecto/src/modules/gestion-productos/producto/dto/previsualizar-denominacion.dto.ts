import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnidadMedida } from '../domain/enums/unidad-medida.enum';

/**
 * Parámetros para previsualizar la denominación automática (US-10) antes de
 * guardar un producto. Llegan por query string, por eso se convierten a número.
 *
 * La presentación es opcional (CR-002 pendiente). Si se envía, deben venir
 * cantidad y unidad juntas: esa regla la valida el Value Object Presentacion.
 */
export class PrevisualizarDenominacionDto {
  @ApiProperty({ example: 1, description: 'ID de la marca' })
  @Type(() => Number)
  @IsInt({ message: 'La marca debe ser un número entero.' })
  @Min(1, { message: 'La marca es obligatoria.' })
  marcaId: number;

  @ApiProperty({ example: 2, description: 'ID de la línea' })
  @Type(() => Number)
  @IsInt({ message: 'La línea debe ser un número entero.' })
  @Min(1, { message: 'La línea es obligatoria.' })
  lineaId: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Cantidad de la presentación' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad de la presentación debe ser un número.' })
  presentacionCantidad?: number;

  @ApiPropertyOptional({
    enum: UnidadMedida,
    example: UnidadMedida.LITRO,
    description: 'Unidad de medida de la presentación',
  })
  @IsOptional()
  @IsEnum(UnidadMedida, {
    message: `La unidad de medida debe ser una de: ${Object.values(UnidadMedida).join(', ')}.`,
  })
  presentacionUnidad?: UnidadMedida;
}
