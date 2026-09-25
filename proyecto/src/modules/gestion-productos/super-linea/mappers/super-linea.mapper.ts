import { Logger } from '@nestjs/common';
import { SuperLineaDto } from '../dto/super-linea.dto';
import { SuperLinea } from '../domain/entities/super-linea.entity';

export class SuperLineaMapper {
    private static readonly logger = new Logger(SuperLineaMapper.name);

    static toDto(entity: SuperLinea): SuperLineaDto {
        return {
            id: entity.id,
            denominacion: entity.denominacion,
            observacion: entity.observacion ?? '',
            sistema: entity.sistema,
            deletedAt: entity.deletedAt ? entity.deletedAt.toString() : null,
        };
    }
}