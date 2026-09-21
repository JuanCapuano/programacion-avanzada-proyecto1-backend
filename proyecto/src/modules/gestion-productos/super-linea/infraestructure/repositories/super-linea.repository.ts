import { Logger } from "@nestjs/common";
import { ISuperLineaRepository } from "../../domain/interfaces/super-linea.repository.interface";
import { SuperLinea } from "../../domain/entities/super-linea.entity";
import { CreateSuperLineaDto } from "../../dto/create-super-linea.dto";
import { UpdateSuperLineaDto } from "../../dto/update-super-linea.dto";
import { AuditoriaDto } from "src/modules/gestion-sistema/auditoria/dto/auditoria.dto";


export class SuperLineaRepository implements ISuperLineaRepository {

    constructor(
        private readonly persistenceService: ISuperLineaRepository
    ) {}

    private readonly logger = new Logger(SuperLineaRepository.name);
    
    private readonly ENTITY_NAME = 'SuperLinea';

    async create(data: CreateSuperLineaDto): Promise<SuperLinea> {
        this.logger.log(`Creando un nuevo ${this.ENTITY_NAME}`);

        try {
            return await this.persistenceService.create(data);
        } catch (error) {
            throw new Error('No se pudo crear la entidad en la base de datos.');
        }
    }

    async findAll(): Promise<SuperLinea[]> {
        this.logger.log(`Buscando todos los ${this.ENTITY_NAME}`);
        return this.persistenceService.findAll();
    }

    async findAllFor(denominacion: string): Promise<SuperLinea[]> {
        this.logger.log(`Buscando todos los ${this.ENTITY_NAME} con denominación: ${denominacion}`);
        return this.persistenceService.findAllFor(denominacion);
    }

    async findAllSinSistemaFor(denominacion: string): Promise<SuperLinea[]> {
        this.logger.log(`Buscando todos los ${this.ENTITY_NAME} sin sistema con denominación: ${denominacion}`);
        return this.persistenceService.findAllSinSistemaFor(denominacion);
    }

    async findOne(id: number): Promise<SuperLinea | null> {
        this.logger.log(`Buscando ${this.ENTITY_NAME} con ID: ${id}`);
        return this.persistenceService.findOne(id);
    }

    async findByDenominacion(denominacion: string): Promise<SuperLinea | null> {
        this.logger.log(`Buscando ${this.ENTITY_NAME} con denominación: ${denominacion}`);
        return this.persistenceService.findByDenominacion(denominacion);
    }

    async findByDenominacionWithDeleted(denominacion: string): Promise<SuperLinea | null> {
        this.logger.log(`Buscando ${this.ENTITY_NAME} con denominación (incluyendo eliminados): ${denominacion}`);
        return this.persistenceService.findByDenominacionWithDeleted(denominacion);
    }

    async update(id: number, data: UpdateSuperLineaDto): Promise<SuperLinea> {
        this.logger.log(`Actualizando ${this.ENTITY_NAME} con ID: ${id}`);
        return this.persistenceService.update(id, data);
    }

    async delete(id: number): Promise<SuperLinea> {
        this.logger.log(`Eliminando ${this.ENTITY_NAME} con ID: ${id}`);
        return this.persistenceService.delete(id);
    }

    async findByIdConAuditoria(id: number): Promise<AuditoriaDto | null> {
        this.logger.log(`Buscando ${this.ENTITY_NAME} con ID: ${id}`);
        return this.persistenceService.findByIdConAuditoria(id);
    }

    async findByDenominacionFiltered(
        denominacion: string,
        skip?: number,
        take?: number,
        incluirEliminados?: boolean
    ): Promise<{ data: SuperLinea[]; total: number }> {
        this.logger.log(`Buscando ${this.ENTITY_NAME} con denominación: ${denominacion}`);
        return this.persistenceService.findByDenominacionFiltered(denominacion, skip, take, incluirEliminados);
    }

}