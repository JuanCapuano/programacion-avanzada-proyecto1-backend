import { SuperLinea } from '../entities/super-linea.entity';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';
import { AuditoriaDto } from 'src/modules/gestion-sistema/auditoria/dto/auditoria.dto';

export interface ISuperLineaRepository {
    findAll(): Promise<SuperLinea[]>;
    findAllFor(denominacion: string): Promise<SuperLinea[]>;
    findAllSinSistemaFor(denominacion: string): Promise<SuperLinea[]>;
    findOne(id: number): Promise<SuperLinea | null>;
    findByDenominacion(denominacion: string): Promise<SuperLinea | null>;
    findByDenominacionWithDeleted(denominacion: string): Promise<SuperLinea | null>;
    findByDenominacionFiltered(
        denominacion: string,
        skip?: number,
        take?: number,
        incluirEliminados?: boolean,
    ): Promise<{ data: SuperLinea[]; total: number }>;
    findByIdConAuditoria(id: number): Promise<AuditoriaDto | null>;
    create(data: CreateSuperLineaDto): Promise<SuperLinea>;
    update(id: number, data: UpdateSuperLineaDto): Promise<SuperLinea>;
    delete(id: number, usuarioId: number): Promise<SuperLinea>;

}