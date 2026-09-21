import { ApiProperty } from '@nestjs/swagger';

/** DTO de salida para un registro del historial de precios */
export class HistorialPrecioDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  productoId: number;

  @ApiProperty()
  fecha: Date;

  @ApiProperty()
  motivo: string;

  @ApiProperty()
  usuario: string;

  // ─── Valores anteriores ───────────────────────────────────────────────
  @ApiProperty()
  precioAnterior: number;

  @ApiProperty()
  costoAnterior: number;

  @ApiProperty()
  costoDolarAnterior: number;

  @ApiProperty()
  cotizacionDolarAnterior: number;

  @ApiProperty()
  porcentajeAnterior: number;

  // ─── Valores nuevos ──────────────────────────────────────────────────
  @ApiProperty()
  precioNuevo: number;

  @ApiProperty()
  costoNuevo: number;

  @ApiProperty()
  costoDolarNuevo: number;

  @ApiProperty()
  cotizacionDolarNuevo: number;

  @ApiProperty()
  porcentajeNuevo: number;
}
