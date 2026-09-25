import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  IsPositive,
} from 'class-validator';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { UnidadMedida } from '../domain/enums/unidad-medida.enum';
import {
  DENOMINACION_LONGITUD_MAXIMA,
  DENOMINACION_PATRON,
  transformarDenominacionAlta,
} from './denominacion.validacion';

export class CreateProductoDto {

  /*Opcional (CR-005): si no viene, o viene vacía, el dominio genera ladenominación automática. Si el usuario la escribe, queda como manual.*/
  @Transform(transformarDenominacionAlta)
  @IsOptional()
  @IsString({ message: 'La denominación debe ser una cadena de texto.' })
  @MaxLength(DENOMINACION_LONGITUD_MAXIMA, {
    message: `La denominación no puede superar los ${DENOMINACION_LONGITUD_MAXIMA} caracteres.`,
  })
  @Matches(DENOMINACION_PATRON, {
    message: 'La denominación contiene caracteres inválidos.',
  })
  denominacion?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  // si no tiene poner vacio
  @IsOptional()
  @IsString()
  codigoProveedor?: string;

  @IsOptional()
  @IsString()
  codigoBarra?: string;

  @IsOptional()
  @IsString()
  codigoReferencia?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsBoolean()
  utilizaStockMinimo: boolean;

  @IsOptional()
  @IsInt()
  stockMinimo?: number;

  @IsOptional()
  @IsInt()
  stock?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  costoEnDolar?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  destacado?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  envioGratis?: boolean;

  @IsNumber(
    {},
    {
      message: ({ value }) =>
        value === undefined || value === null
          ? 'El costo es obligatorio'
          : 'El costo debe ser numérico',
    },
  )
  costo: number; 

  @IsBoolean()
  utilizaPack: boolean;

  @IsOptional()
  @IsInt()
  cantidadPorPack?: number;

  @IsOptional()
  @IsNumber()
  costoDolar?: number;

  @IsNotEmpty({ message: 'La linea es obligatoria.' })
  @IsInt({ message: 'La linea  debe ser un número entero.' })
  lineaId: number;


  @IsNotEmpty({ message: 'La marca es obligatoria.' })
  @IsInt({ message: 'La marca  debe ser un número entero.' })
  marcaId: number;


  /**
   * CR-001 · US-1: el margen es opcional; si viene, debe ser numérico y no
   * puede ser negativo.
   */
  @IsOptional()
  @IsNumber({}, { message: 'El margen debe ser numérico' })
  @Min(0, { message: 'El margen no puede ser negativo' })
  porcentaje?: number;


  createdAt?: Date;

  @IsOptional()
  @IsEnum(AlicuotaIva, {
    message:
      'tipo debe ser ALICUOTA_0  ALICUOTA_105, ALICUOTA_21, ALICUOTA_27,',
  })
  @Transform(({ value }) => {
    // Si el valor es un string, lo convierte al valor numérico del enum
    if (typeof value === 'string') {
      return AlicuotaIva[value.toUpperCase() as keyof typeof AlicuotaIva];
    }
    return value;
  })
  alicuotaIva: AlicuotaIva;

  @IsNotEmpty({ message: 'El usuarioCreatedId es obligatorio.' })
  @IsInt({ message: 'El usuarioCreatedId debe ser un número entero.' })
  usuarioCreatedId: number;

  /**
   * Presentación (CR-002): cantidad y unidad son obligatorias, no hay
   * presentación "a medias".
   */
  @IsNumber({}, { message: 'La cantidad de la presentación debe ser un número.' })
  @IsPositive({ message: 'La cantidad de la presentación debe ser mayor a 0.' })
  presentacionCantidad: number;

  @IsEnum(UnidadMedida, {
    message: `La unidad de la presentación debe ser una de: ${Object.values(UnidadMedida).join(', ')}.`,
  })
  presentacionUnidad: UnidadMedida;

}
