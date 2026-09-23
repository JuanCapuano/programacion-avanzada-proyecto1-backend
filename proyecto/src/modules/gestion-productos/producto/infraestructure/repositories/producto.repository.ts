import { Injectable, Logger } from '@nestjs/common';
import { Producto } from '../../domain/entities/producto.entity';
import { IProductoRepository } from '../../domain/interfaces/producto.repository-interface';
import { ProductoPersistenceAdapter } from './producto.persistence-adapters';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { HistorialPrecioProducto } from '../../../historial-precio-producto/domain/entities/historial-precio-producto.entity';

@Injectable()
export class ProductoRepository implements IProductoRepository {
  private readonly logger = new Logger(ProductoRepository.name);

  constructor(
    private readonly persistenceService: ProductoPersistenceAdapter,
  ) {}
  findByIds(ids: number[]): Promise<Producto[]> {
    throw new Error('Method not implemented.');
  }
  
  private readonly ENTITY_NAME = 'Producto';

  async updateEntity(uow: IUnitOfWork, data: Producto): Promise<Producto> {
    return this.persistenceService.updateEntity(uow, data);
  }

  async save(entity: Producto): Promise<Producto> {
    return this.persistenceService.save(entity);
  }

  async findBy(
    denominacion: string,
    codigoProveedor: string,
    codProveedorExacto: boolean,
    codigoReferencia: string,
    marca_id: number,
    linea_id: number,
    proveedor_id: number,
    conStock: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: Producto[]; total: number }> {
    return this.persistenceService.findBy(
      denominacion,
      codigoProveedor,
      codProveedorExacto,
      codigoReferencia,
      marca_id,
      linea_id,
      proveedor_id,
      conStock,
      skip,
      take,
    );
  }

  async findByRapido(
    codigo: string,
    exacto: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: Producto[]; total: number }> {
    return this.persistenceService.findByRapido(codigo, exacto, skip, take); 
  }


  async findOne(id: number): Promise<Producto | null> {
    const entity = await this.persistenceService.findOne(id);
    return entity;
  }

  async findByIdConAuditoria(id: number): Promise<Producto | null> {
    const entity = await this.persistenceService.findByIdConAuditoria(id);
    return entity;
  }

  async remove(producto: Producto, usuario: Usuario): Promise<Producto> {
    const entity = this.persistenceService.remove(producto, usuario);
    return entity;
  }

  async isCodigoProveedorDuplicado(
    codigoProveedor: string | null,
    id?: number,
  ): Promise<boolean> {
    return this.persistenceService.isCodigoProveedorDuplicado(
      codigoProveedor,
      id,
    );
  }

  async findParaAjusteMasivo(
    alcance: 'linea' | 'global',
    lineaId?: number,
  ): Promise<Producto[]> {
    return this.persistenceService.findParaAjusteMasivo(alcance, lineaId);
  }

  async saveMany(entities: Producto[]): Promise<Producto[]> {
    return this.persistenceService.saveMany(entities);
  }

  async guardarConHistorial(
    productos: Producto[],
    historial: HistorialPrecioProducto[],
  ): Promise<Producto[]> {
    return this.persistenceService.guardarConHistorial(productos, historial);
  }


  async findByDenominacion(denominacion: string): Promise<Producto | null> {
    const entity =
      await this.persistenceService.findByDenominacion(denominacion);
    if (!entity) {
      this.logger.warn(
        `No se encontró ${this.ENTITY_NAME} con denominación: ${denominacion}`,
      );
      return null;
    }
    return entity;
  }

  async findByDenominacionCodigoProveedorFiltered(
    denominacion: string,
    skip = 0,
    take = 10,
  ): Promise<{ data: Producto[]; total: number }> {
    this.logger.log(`Buscando o ${denominacion}  skip=${skip}, take=${take}`);
    return this.persistenceService.findByDenominacionCodigoProveedorFiltered(
      denominacion,
      skip,
      take,
    );
  }

  async existsProductosActivosByMarca(marcaId: number): Promise<boolean> {
    return this.persistenceService.existsProductosActivosByMarca(marcaId);
  }
  async existsProductosActivosByLinea(lineaId: number): Promise<boolean> {
    return this.persistenceService.existsProductosActivosByLinea(lineaId);
  }


  async findByIdWithoutRelations(id: number): Promise<Producto | null> {
    return this.persistenceService.findByIdWithoutRelations(id);
  }

  async  existsByDenominacion(denominacion: string, excludeId?: number): Promise<boolean> {
    return this.persistenceService.existsByDenominacion(denominacion, excludeId); 
  }

  async  existsByCodigoProveedor(codigoProveedor: string, excludeId: number): Promise<boolean> {
   return this.persistenceService.existsByCodigoProveedor(codigoProveedor, excludeId);
  }

}
