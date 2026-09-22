import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdatePrecioDto {

  @ApiProperty({ example: 100.5, description: 'Costo en moneda local' })
  @IsNumber()
  @Min(0, { message: 'El costo debe ser un número positivo o 0' })
  costo: number;

  @ApiProperty({ example: 50.25, description: 'Costo en dólares' })
  @IsNumber()
  @Min(0, { message: 'El costo en dólares debe ser un número positivo o 0' })
  @IsOptional() 
  costoDolar: number;


  @ApiProperty({ example: 1500, description: 'Cotización del dólar' })
  @IsNumber()
  @Min(0, { message: 'La cotización del dólar debe ser un número positivo o 0' })
  @IsOptional()
  cotizacionDolar: number;

  @ApiProperty({ example: 10, description: 'Porcentaje de margen' })
  @IsNumber()
  @Min(0, { message: 'El porcentaje debe ser un número positivo o 0' })
  porcentaje: number;

  @ApiProperty({ example: 120.5, description: 'Precio de venta resultante (sin IVA)' })
  @IsNumber()
  @Min(0.00001, { message: 'El precio debe ser mayor a 0' })
  precio: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioAnterior?: number;

  @ApiProperty({
    example: 'Aumento de costos del proveedor',
    description: 'Motivo del cambio de precio. Requerido para auditoría.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del cambio de precio es obligatorio.' })
  @MaxLength(500)
  motivo: string;

  @ApiProperty({ example: 3, description: 'ID del usuario que realiza la actualización' })
  @IsNumber()
  usuarioId: number;
}