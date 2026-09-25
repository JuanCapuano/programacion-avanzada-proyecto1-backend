import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO interno utilizado por el servicio para registrar un cambio de precio.
 * NO es un DTO de entrada HTTP — se construye programáticamente en el servicio.
 */
export class RegistrarHistorialPrecioDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productoId: number;

  // ─── Valores anteriores ──────────────────────────────────────────────
  @IsNumber()
  precioAnterior: number;

  @IsNumber()
  costoAnterior: number;

  @IsNumber()
  costoDolarAnterior: number;

  @IsNumber()
  cotizacionDolarAnterior: number;

  @IsNumber()
  porcentajeAnterior: number;

  // ─── Valores nuevos ───────────────────────────────────────────────────
  @IsNumber()
  @Min(0.00001, { message: 'El precio nuevo debe ser mayor a 0.' })
  precioNuevo: number;

  @IsNumber()
  costoNuevo: number;

  @IsNumber()
  costoDolarNuevo: number;

  @IsNumber()
  cotizacionDolarNuevo: number;

  @IsNumber()
  porcentajeNuevo: number;

  // ─── Contexto ─────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'El motivo del cambio de precio es obligatorio.' })
  @MaxLength(500)
  motivo: string;

  @IsNumber()
  usuarioId: number;
}
