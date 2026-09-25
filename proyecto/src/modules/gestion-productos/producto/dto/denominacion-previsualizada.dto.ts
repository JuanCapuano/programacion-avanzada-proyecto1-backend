import { ApiProperty } from '@nestjs/swagger';

export class DenominacionPrevisualizadaDto {
  @ApiProperty({
    example: 'coca-cola gaseosas 1.5 l',
    description:
      'Denominación que se generaría automáticamente. No se guarda nada.',
  })
  denominacion: string;
}
