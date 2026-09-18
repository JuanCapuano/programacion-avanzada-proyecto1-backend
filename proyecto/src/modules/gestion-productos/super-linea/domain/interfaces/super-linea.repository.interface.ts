import { SuperLinea } from '../entities/super-linea.entity';
import { UpdateSuperLineaDto } from '../../dto/update-super-linea.dto';
import { CreateSuperLineaDto } from '../../dto/create-super-linea.dto';

export interface ISuperLineaRepository {
    findAll(): Promise<SuperLinea[]>;
    findAllFor(denominacion: string): Promise<SuperLinea[]>;
    findAllSinSistemaFor(denominacion: string): Promise<SuperLinea[]>;
    findAllListado(): Promise<SuperLinea[]>;
    findOne(id: number): Promise<SuperLinea>;
    findByDenominacion(denominacion: string): Promise<SuperLinea>;
    findByDenominacionWith(denominacion: string): Promise<SuperLinea>;
    create(data: CreateSuperLineaDto): Promise<SuperLinea>;
    update(id: number, data: UpdateSuperLineaDto): Promise<SuperLinea>;
    delete(id: number): Promise<SuperLinea>;
    remove(): Promise<void>;

}