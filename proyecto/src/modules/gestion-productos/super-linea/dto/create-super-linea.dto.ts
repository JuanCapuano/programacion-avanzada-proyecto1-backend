import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, Matches, IsOptional, IsInt } from "class-validator";


export class CreateSuperLineaDto {

    @Transform(({ value }) => value.trim().toLowerCase())
    @IsString({ message: 'La denominación debe ser una cadena de texto.' })
    @IsNotEmpty({ message: 'La denominación no puede estar vacía.' })
    @MaxLength(255, { message: 'La denominación no puede estar vacía.' })
    @Matches(/^[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ]+$/, 
        {message: 'La denominación solo puede contener letras, números y espacios.'})
    denominacion: string;

    @IsOptional()
    @IsString({ message: 'La observación debe ser una cadena de texto.' })
    observacion?: string;

    @IsNotEmpty({ message: 'El id del usuario es obligatorio.' })
    @IsInt({ message: 'El id del usuario debe ser un número entero.' })
    usuarioCreatedId: number;

    createdAt?: Date;
}
