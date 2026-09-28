import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { FiltrosCatalogo } from '../domain/interfaces/filtros-catalogo';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const booleano = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class SearchCatalogoDto implements FiltrosCatalogo {
  @Transform(booleano)
  @IsBoolean()
  buscarDenominacion: boolean = true;

  @Transform(booleano)
  @IsBoolean()
  buscarLinea: boolean = true;

  @Transform(booleano)
  @IsBoolean()
  buscarSuperLinea: boolean = true;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(255)
  texto?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(255)
  denominacion?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(255)
  linea?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(255)
  superLinea?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 10;
}
