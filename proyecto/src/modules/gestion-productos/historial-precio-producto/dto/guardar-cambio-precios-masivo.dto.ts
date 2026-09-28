import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ItemCambioPrecioDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  productoId: number;

  @ApiProperty({ example: 120.5, description: 'Precio nuevo (sin IVA)' })
  @IsNumber()
  @Min(0.00001, { message: 'El precio debe ser mayor a 0' })
  precio: number;

  @ApiProperty({ example: 100, description: 'Costo nuevo' })
  @IsNumber()
  @Min(0)
  costo: number;

  @ApiProperty({ example: 0, description: 'Costo en dólares' })
  @IsNumber()
  @Min(0)
  costoDolar: number;

  @ApiProperty({ example: 0, description: 'Cotización del dólar' })
  @IsNumber()
  @Min(0)
  cotizacionDolar: number;

  @ApiProperty({ example: 20, description: 'Porcentaje de margen' })
  @IsNumber()
  @Min(0)
  porcentaje: number;
}

export class GuardarCambioPreciosMasivoDto {
  @ApiProperty({ type: [ItemCambioPrecioDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemCambioPrecioDto)
  items: ItemCambioPrecioDto[];

  @ApiProperty({
    example: 'Ajuste por inflación mensual',
    description: 'Motivo general del cambio masivo. Se registra en el historial de cada producto afectado.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del cambio masivo es obligatorio.' })
  @MaxLength(500)
  motivo: string;

  @ApiProperty({ example: 3, description: 'ID del usuario que aplica el cambio' })
  @IsInt()
  usuarioId: number;
}
