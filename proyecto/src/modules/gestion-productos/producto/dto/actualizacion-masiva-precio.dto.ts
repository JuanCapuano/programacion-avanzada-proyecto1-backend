import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  Min,
} from 'class-validator';
import { TipoAjustePrecio } from '../domain/enums/tipo-ajuste-precio.enum';

export class ActualizacionMasivaPrecioDto {
  @ApiProperty({
    example: TipoAjustePrecio.COSTO_PORCENTUAL,
    description:
      'Tipo de ajuste: porcentual sobre el costo, monto fijo sobre el costo o asignación de un nuevo margen',
    enum: TipoAjustePrecio,
  })
  @IsEnum(TipoAjustePrecio, {
    message:
      'tipoAjuste debe ser "costo_porcentual", "costo_monto" o "margen"',
  })
  tipoAjuste: TipoAjustePrecio;

  @ApiProperty({
    example: 10,
    description:
      'costo_porcentual: % sobre el costo (≠ 0 y > -100). costo_monto: monto a sumar o restar al costo (≠ 0). margen: nuevo margen en % (≥ 0).',
  })
  @IsNumber({}, { message: 'valor debe ser un número' })
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

  @ApiPropertyOptional({
    example: 'Ajuste por inflación mensual',
    description:
      'Motivo del cambio (CR-007). Se registra en el historial de cada producto afectado. Si no se envía, se genera uno a partir del ajuste.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @IsInt({ message: 'usuarioId debe ser un número entero' })
  @Min(1, { message: 'usuarioId debe ser mayor a 0' })
  usuarioId: number;
}


