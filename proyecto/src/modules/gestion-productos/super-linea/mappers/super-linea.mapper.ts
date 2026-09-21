import { Logger } from '@nestjs/common';
import { SuperLineaDto } from '../dto/super-linea.dto';

export class SuperLineaMapper {
    private static readonly logger = new Logger(SuperLineaMapper.name);

    static toDto(entity: SuperLineaDto): any {
        return {
            id: entity.id,
            denominacion: entity.denominacion,
            observacion: entity.observacion ?? '',
            sistema: entity.sistema,
            deletedAt: entity.deletedAt ? entity.deletedAt.toString() : null,
        };
    }
}