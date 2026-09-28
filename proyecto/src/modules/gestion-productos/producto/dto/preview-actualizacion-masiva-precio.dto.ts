import { ApiProperty } from '@nestjs/swagger';

export class PreviewActualizacionMasivaPrecioDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  id: number;

  @ApiProperty({ example: 'coca-cola gaseosas 1.5 l', description: 'Denominación del producto' })
  denominacion: string;

  @ApiProperty({ example: 80, description: 'Costo actual del producto, antes del ajuste' })
  costoActual: number;

  @ApiProperty({ example: 88, description: 'Costo que resultaría de aplicar el ajuste (igual al actual si se asigna margen)' })
  costoResultante: number;

  @ApiProperty({ example: 25, description: 'Margen actual del producto (%), antes del ajuste' })
  porcentajeActual: number;

  @ApiProperty({ example: 25, description: 'Margen que resultaría de aplicar el ajuste (%) (igual al actual si se ajusta el costo)' })
  porcentajeResultante: number;

  @ApiProperty({ example: 100, description: 'Precio actual del producto, antes del ajuste' })
  precioActual: number;

  @ApiProperty({ example: 110, description: 'Precio que resultaría de aplicar el ajuste: costo × (1 + margen / 100)' })
  precioResultante: number;

  @ApiProperty({ example: true, description: 'Indica si el resultado es válido (costo > 0, margen ≥ 0 y precio > 0)' })
  valido: boolean;
}
