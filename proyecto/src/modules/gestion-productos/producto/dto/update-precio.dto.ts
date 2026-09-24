import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

/**
 * CR-007: el precio no se envía. Se cambia el costo y/o el porcentaje de
 * margen y el precio lo recalcula el dominio (Producto.calcularPrecio()).
 * Los campos que no se envían conservan su valor actual.
 */
export class UpdatePrecioDto {

  @ApiPropertyOptional({ example: 100.5, description: 'Costo en moneda local' })
  @IsNumber()
  @Min(0, { message: 'El costo debe ser un número positivo o 0' })
  @IsOptional()
  costo?: number;

  // SIN USO por ahora: el costo en dólares no participa del cálculo del precio.
  // Se comenta (no se borra) para referencia.
  //
  // @ApiPropertyOptional({ example: 50.25, description: 'Costo en dólares' })
  // @IsNumber()
  // @Min(0, { message: 'El costo en dólares debe ser un número positivo o 0' })
  // @IsOptional()
  // costoDolar?: number;
  //
  // @ApiPropertyOptional({ example: 1500, description: 'Cotización del dólar' })
  // @IsNumber()
  // @Min(0, { message: 'La cotización del dólar debe ser un número positivo o 0' })
  // @IsOptional()
  // cotizacionDolar?: number;

  @ApiPropertyOptional({ example: 10, description: 'Porcentaje de margen' })
  @IsNumber()
  @Min(0, { message: 'El porcentaje debe ser un número positivo o 0' })
  @IsOptional()
  porcentaje?: number;

  // DEPRECADO (CR-007): el precio ya no se recibe, lo calcula el dominio a
  // partir de costo y porcentaje. El precio anterior lo toma el backend de la
  // entidad antes del cambio. Se comenta (no se borra) para referencia.
  //
  // @ApiProperty({ example: 120.5, description: 'Precio de venta resultante (sin IVA)' })
  // @IsNumber()
  // @Min(0.00001, { message: 'El precio debe ser mayor a 0' })
  // precio: number;
  //
  // @ApiProperty({ required: false })
  // @IsNumber()
  // @Min(0)
  // @IsOptional()
  // precioAnterior?: number;

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
