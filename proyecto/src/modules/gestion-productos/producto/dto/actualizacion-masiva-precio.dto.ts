import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  NotEquals,
  ValidateIf,
} from 'class-validator';

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
  @ValidateIf((dto) => dto.alcance === 'linea')
  @IsNotEmpty({ message: 'lineaId es obligatorio cuando alcance es "linea"' })
  @IsInt()
  lineaId?: number;

  @ApiProperty({ example: 3, description: 'ID del usuario que realiza la actualización' })
  @IsNumber()
  usuarioId: number;
}
