import { Linea } from '../../../linea/domain/entities/linea.entity';
import { Marca } from '../../../marca/domain/entities/marca.entity';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { Producto } from '../entities/producto.entity';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { UpdatePrecioDto } from '../../dto/update-precio.dto';

export interface IProductoRepository {

  save (
    entity: Producto
  ): Promise<Producto>;
  
  // DEPRECADO: el alta la resuelve ProductoService armando la entidad y
  // llamando a save(). Se comenta (no se borra) para referencia.
  //
  // create(
  //   data: CreateProductoDto,
  //   linea: Linea,
  //   marca: Marca,
  //   usuario: Usuario,
  // ): Promise<Producto>;

  findOne(id: number): Promise<Producto | null>;
  findByIdConAuditoria(id: number): Promise<Producto | null>;
  findByDenominacion(denominacion: string): Promise<Producto | null>;

  findBy(
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
  ): Promise<{ data: Producto[]; total: number }>;

  findByRapido(
    codigo: string,
    exacto: boolean,
    skip: any,
    take: number,
  ): Promise<{ data: Producto[]; total: number }>;


  findByIdWithoutRelations(id: number): Promise<Producto | null> | undefined;

  // DEPRECADO: la edición la resuelve ProductoService y persiste con save().
  // Se comenta (no se borra) para referencia.
  //
  // update(
  //   id: number,
  //   data: UpdateProductoDto,
  //   linea: Linea,
  //   marca: Marca,
  //   usuario: Usuario,
  // ): Promise<Producto>;

  updateEntity(uow: IUnitOfWork, data: Producto): Promise<Producto>;

  // DEPRECADO: el cálculo de precio ahora vive en Producto.calcularPrecio()
  // y se invoca desde el PersistenceAdapter antes de guardar.
  // Se comenta (no se borra) para referencia, ver CLAUDE.md.
  //
  // actualizarPrecio(
  //   id: number,
  //   dto: UpdatePrecioDto,
  //   usuario: Usuario,
  // ): Promise<void>;
  remove(data: Producto, usuario: Usuario): Promise<Producto>;

  isCodigoProveedorDuplicado(
    codigoProveedor: string | null,
    id?: number,
  ): Promise<boolean>;

  findByDenominacionCodigoProveedorFiltered(
    denominacion: string,
    skip: number,
    take: number,
  ): Promise<{ data: Producto[]; total: number }>;

  existsByDenominacion(
    denominacion: string,
    excludeId?: number,
  ): Promise<boolean>;
  existsByCodigoProveedor(codigoProveedor: string, excludeId: number): Promise<boolean>;
  existsProductosActivosByMarca(marcaId: number): Promise<boolean>;
  existsProductosActivosByLinea(lineaId: number): Promise<boolean>;

  findByIds(ids: number[]): Promise<Producto[]>;

  /**
   * Trae los productos del alcance dado (línea puntual o todos), sin aplicar
   * ni calcular ningún ajuste: la decisión de qué es válido y la mutación de
   * costo/margen (y el recálculo del precio) quedan en Producto.aplicarAjustePrecio() /
   * simularAjustePrecio(), invocadas desde la capa de aplicación.
   */
  findParaAjusteMasivo(
    alcance: 'linea' | 'global',
    lineaId?: number,
  ): Promise<Producto[]>;

  saveMany(entities: Producto[]): Promise<Producto[]>;
}
