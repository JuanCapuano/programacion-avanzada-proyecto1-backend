import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISBN,
  IsNotEmpty,
  IsNumber,
  NotEquals,
  ValidateIf,
  Min,
} from 'class-validator';
import { dot } from 'node:test/reporters';

export class ActualizacionMasivaPrecioDto {
  @ApiProperty({
    example: 'porcentaje',
    description: 'Tipo de ajuste a aplicar sobre el precio',
    enum: ['porcentaje', 'monto'],
  })
  @IsIn(['porcentaje', 'monto'], {
    message: 'tipoAjuste debe ser "porcentaje" o "monto"',
  })
  tipoAjuste: 'porcentaje' | 'monto';

  @ApiProperty({
    example: 10,
    description:
      'Valor del ajuste. Puede ser negativo (descuento). No puede ser 0.',
  })
  @IsNumber()
  @NotEquals(0, { message: 'El valor del ajuste no puede ser 0' })
  @ValidateIf((dto) => dto.tipoAjuste === 'porcentaje')
  @Min(-99.99, { message: 'Un porcentaje ≤ -100% dejaría cualquier precio en 0 o negativo' })
  valor: number;

  @ApiProperty({
    example: 'linea',
    description: 'Alcance de la actualización masiva',
    enum: ['linea', 'global'],
  })
  @IsIn(['linea', 'global'], {
    message: 'alcance debe ser "linea" o "global"',
  })
  alcance: 'linea' | 'global';

  @ApiPropertyOptional({
    example: 3,
    description: 'ID de la línea a actualizar. Requerido solo si alcance = "linea"',
  })
  @ValidateIf((dto) => dto.alcance === 'linea' || dto.lineaId !== undefined)
  @IsNotEmpty({ message: 'lineaId es obligatorio cuando alcance es "linea"' })
  @IsInt()
  @Min(1,{message:"lineaId deber ser mayor a 0"})
  lineaId?: number;

  @IsInt({ message: 'usuarioId debe ser un número entero' })
  @Min(1, { message: 'usuarioId debe ser mayor a 0' })
  usuarioId: number;
}


