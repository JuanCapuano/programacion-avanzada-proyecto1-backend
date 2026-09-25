import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

//Agregar las API property para la documentación de Swagger
export class SuperLineaDto {

    @Type(() => Number)
    @IsInt()
    id: number;

    @IsString()
    denominacion: string;

    @IsOptional()
    @IsString()
    observacion?: string;

    @Type(() => Number)
    @IsInt()
    sistema: number;

    @IsOptional()
    deletedAt: string | null;
}