import { ApiProperty } from '@nestjs/swagger';

export class PreviewActualizacionMasivaPrecioDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  id: number;

  @ApiProperty({ example: 'coca-cola gaseosas 1.5 l', description: 'Denominación del producto' })
  denominacion: string;

  @ApiProperty({ example: 100, description: 'Precio actual del producto, antes del ajuste' })
  precioActual: number;

  @ApiProperty({ example: 110, description: 'Precio que resultaría de aplicar el ajuste' })
  precioResultante: number;

  @ApiProperty({ example: 25.5, description: 'Porcentaje de margen resultante sobre el costo' })
  porcentajeResultante: number;

  @ApiProperty({ example: true, description: 'Indica si el precio resultante es válido (> 0)' })
  valido: boolean;
}
