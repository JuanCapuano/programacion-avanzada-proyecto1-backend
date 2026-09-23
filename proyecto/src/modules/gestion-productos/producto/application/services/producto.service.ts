import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { PaginacionUtils } from 'src/modules/common/utils/pagination/paginacion-utils';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { ensureNotSistemaEntity } from 'src/modules/common/utils/atrituto-sistema';
import { AuditoriaMapper } from 'src/modules/gestion-sistema/auditoria/mappers/auditoria.mapper';
import { MessageFrontUtils } from 'src/modules/common/utils/message/message-front.util';
import { Producto } from '../../domain/entities/producto.entity';
import { IProductoRepository } from '../../domain/interfaces/producto.repository-interface';
import { CreateProductoDto } from '../../dto/create-producto.dto';
import { GetProductoDto } from '../../dto/get-producto.dto';
import { UpdateProductoDto } from '../../dto/update-producto.dto';
import { ActualizacionMasivaPrecioDto } from '../../dto/actualizacion-masiva-precio.dto';
import { PreviewActualizacionMasivaPrecioDto } from '../../dto/preview-actualizacion-masiva-precio.dto';
import { UpdatePrecioDto } from '../../dto/update-precio.dto';
import { ProductoMapper } from '../../mappers/producto.mapper';
import { LineaService } from '../../../../../modules/gestion-productos/linea/application/services/linea.service';
import { MarcaService } from '../../../../../modules/gestion-productos/marca/application/services/marca.service';
import { ProductoIntrinsicValidationService } from '../../domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from '../../domain/services/producto-validation.service.ts';
import { ProductoRelatedEntitiesValidator } from '../../infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from '../../infraestructure/validators/producto-uniqueness.validator.ts';
import { UsuarioValidator } from '../../../../../modules/common/utils/validation/usuario-validator';
import { ProductoDeletePolicy } from '../policies/producto-delete.policy';
import { GeneradorDenominacion } from '../../domain/services/generador-denominacion.service';
import { Presentacion } from '../../domain/value-objects/presentacion.vo';
import { UnidadMedida } from '../../domain/enums/unidad-medida.enum';
import { PrevisualizarDenominacionDto } from '../../dto/previsualizar-denominacion.dto';
import { DenominacionPrevisualizadaDto } from '../../dto/denominacion-previsualizada.dto';

import { HistorialPrecioService } from '../../../../../modules/gestion-productos/historial-precio-producto/application/services/historial-precio.service';
import { ProductoPersistenceAdapter } from '../../infraestructure/repositories/producto.persistence-adapters';
export class ProductoService {
  private readonly logger = new Logger(ProductoService.name);
  constructor(
    @Inject('IProductoRepository')
    private readonly repository: IProductoRepository,
    private readonly lineaService: LineaService,

    @Inject(forwardRef(() => MarcaService))
    private readonly marcaService: MarcaService,
    private readonly proveedorService: ProveedorService,
    private readonly usuarioService: UsuarioService,

    //  Domain Services
    private readonly intrinsicValidationService: ProductoIntrinsicValidationService,
    private readonly validationService: ProductoValidationService,

    // Infrastructure Validators
    private readonly relatedEntitiesValidator: ProductoRelatedEntitiesValidator,
    private readonly uniquenessValidator: ProductoUniquenessValidator,
    private readonly usuarioValidator: UsuarioValidator,
    private readonly productoDeletePolicy: ProductoDeletePolicy,
    private readonly generadorDenominacion: GeneradorDenominacion,
    private readonly historialPrecioService: HistorialPrecioService,
    private readonly persistenceAdapter: ProductoPersistenceAdapter,

  ) { }

  private readonly ENTITY_NAME = 'Producto';

  private readonly PORCENTAJE_MARGEN_DEFAULT = 15;

  async create(dto: CreateProductoDto) {
    this.logger.log(`Creando un nuevo ${this.ENTITY_NAME}`);
    dto.porcentaje = dto.porcentaje ?? this.PORCENTAJE_MARGEN_DEFAULT;

    const { marca, linea, usuario } =
      await this.validarYPrepararCreacion(dto);

    // La denominación no se copia del DTO: solo entra a la entidad por el dominio.
    const { denominacion: denominacionIngresada, ...datos } = dto;

    const entity = new Producto();
    Object.assign(entity, datos);
    entity.linea = linea;
    entity.marca = marca;
    entity.usuarioCreated = usuario;

    
    entity.asignarPresentacion(
      Presentacion.crear(dto.presentacionCantidad, dto.presentacionUnidad),
    );// Dominio: la presentación se fija antes de generar la denominación automática, porque esta última la necesita (CR-005 lee vía obtenerPresentacion()).

    entity.inicializarDenominacion(
      this.generadorDenominacion,
      { marca: marca.denominacion, linea: linea.denominacion },
      denominacionIngresada,
    );

    // Infraestructura: unicidad sobre el nombre final ya normalizado.
    await this.uniquenessValidator.validarDenominacionUnica(entity.denominacion);

    
    entity.calcularPrecio(); // Dominio: el precio se deriva de costo y porcentaje, nunca del DTO.

    const { denominacion } = await this.repository.save(entity);

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      denominacion,
      'creada',
    );
  }

  async update(id: number, dto: UpdateProductoDto) {
    this.logger.log(`Actualizando ${this.ENTITY_NAME} con ID: ${id}`);

    const { marca, linea, usuario } =
      await this.validarYPrepararActualizacion(id, dto);

    const entity = await this.repository.findOne(id);
    if (!entity) {
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    }

    // La denominación y los datos de precio no se copian del DTO: solo entran a la entidad por el dominio. El motivo no es un campo del producto.
    const {
      denominacion: denominacionIngresada,
      costo,
      porcentaje,
      motivo,
      ...datos
    } = dto;

    // CR-007: foto del precio antes de aplicar cambios, para el historial.
    const datosPrecioAnteriores = entity.obtenerDatosPrecio();

    Object.assign(entity, datos);
    entity.linea = linea;
    entity.marca = marca;
    entity.usuarioUpdated = usuario;

    const denominacionCambio = entity.actualizarDenominacion(
      this.generadorDenominacion,
      { marca: marca.denominacion, linea: linea.denominacion },
      denominacionIngresada,
    );

   
    if (denominacionCambio) { // Infraestructura: unicidad solo si el nombre final cambió.
      await this.uniquenessValidator.validarDenominacionUnica(
        entity.denominacion,
        id,
      );
    }

    entity.actualizarCostoYMargen({ costo, porcentaje /*, costoDolar */ });// Dominio: el costo o el porcentaje pudieron cambiar, se recalcula el precio.

    // CR-007: si el precio cambió, se exige motivo y se arma el historial.
    const historial = this.historialPrecioService.prepararRegistroSiCambio(
      datosPrecioAnteriores,
      entity,
      usuario,
      motivo,
    );

    const [{ denominacion }] = await this.repository.guardarConHistorial(
      [entity],
      historial ? [historial] : [],
    );

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      denominacion,
      'editada',
    );
  }

  /*CR-007: cambia el precio de un producto a través de su costo y/o porcentaje de margen (el precio nunca se recibe directamente) y registra el cambio en el historial si el precio resultante es distinto del actual. Producto e historial se guardan en la misma transacción. */
  async actualizarPrecio(id: number, dto: UpdatePrecioDto) {
    this.logger.log(`Actualizando precio de ${this.ENTITY_NAME} con ID: ${id}`);

    const usuario = await this.usuarioValidator.validarUsuarioExiste(dto.usuarioId);
    const entity = await this.findEntityById(id);

    const datosPrecioAnteriores = entity.obtenerDatosPrecio();

    // Dominio: aplica costo/margen y recalcula el precio (valida > 0).
    entity.actualizarCostoYMargen({
      costo: dto.costo,
      porcentaje: dto.porcentaje,
    });
    entity.usuarioUpdated = usuario;

    const historial = this.historialPrecioService.prepararRegistroSiCambio(
      datosPrecioAnteriores,
      entity,
      usuario,
      dto.motivo,
    );

    await this.repository.guardarConHistorial(
      [entity],
      historial ? [historial] : [],
    );

    return MessageFrontUtils.create(
      historial
        ? `Precio del producto ${entity.denominacion} actualizado con éxito`
        : `El precio del producto ${entity.denominacion} no cambió; no se registró historial`,
    );
  }

  async actualizarPreciosMasivo(dto: ActualizacionMasivaPrecioDto) {

    const usuario = await this.usuarioValidator.validarUsuarioExiste(dto.usuarioId)

    if (dto.alcance === 'linea') {
      await this.lineaService.findEntityById(dto.lineaId as number)
    }

    const productos = await this.repository.findParaAjusteMasivo(
      dto.alcance,
      dto.lineaId,
    );

    const motivo = dto.motivo?.trim() || this.motivoAjusteMasivo(dto);

    // Dominio: cada producto valida y aplica su propio ajuste. Si alguno es inválido, tira ProductoDomainException acá mismo, antes de que se guarde nada (guardarConHistorial ni se llega a invocar).
    // CR-007: por cada producto cuyo precio cambió se arma su historial.
    const historial = productos.flatMap((producto) => {
      const datosPrecioAnteriores = producto.obtenerDatosPrecio();
      producto.aplicarAjustePrecio(dto.tipoAjuste, dto.valor);
      producto.usuarioUpdated = usuario;

      const registro = this.historialPrecioService.prepararRegistroSiCambio(
        datosPrecioAnteriores,
        producto,
        usuario,
        motivo,
      );
      return registro ? [registro] : [];
    });

    await this.repository.guardarConHistorial(productos, historial);

    return MessageFrontUtils.create(
      `Se actualizaron los precios de ${productos.length} producto(s)`,
    );
  }

  /** Motivo por defecto del historial cuando el ajuste masivo no trae uno. */
  private motivoAjusteMasivo(dto: ActualizacionMasivaPrecioDto): string {
    const signo = dto.valor > 0 ? '+' : '';
    const ajuste =
      dto.tipoAjuste === 'porcentaje' ? `${signo}${dto.valor}%` : `${signo}$${dto.valor}`;
    const alcance =
      dto.alcance === 'linea' ? `línea ${dto.lineaId}` : 'global';
    return `Actualización masiva de precios (${alcance}): ${ajuste}`;
  }

  /*CR-006 (HU3): devuelve la previsualización de la actualización masiva de precios, sin persistir nada, incluyendo los productos inválidos para que el frontend los señale.*/
  async previsualizarActualizacionMasivo(
    dto: ActualizacionMasivaPrecioDto,
  ): Promise<PreviewActualizacionMasivaPrecioDto[]> {
    if (dto.alcance === 'linea') {
      await this.lineaService.findEntityById(dto.lineaId as number);
    }

    const productos = await this.repository.findParaAjusteMasivo(
      dto.alcance,
      dto.lineaId,
    );

    return productos.map((producto) => {
      const resultado = producto.simularAjustePrecio(dto.tipoAjuste, dto.valor);
      return {
        id: producto.id,
        denominacion: producto.denominacion,
        precioActual: producto.precio ?? 0,
        precioResultante: resultado.precioResultante,
        porcentajeResultante: resultado.porcentajeResultante,
        valido: resultado.valido,
      };
    });
  }

  async findByRapido(
    codigo: string,
    exacto: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    const result = await this.repository.findByRapido(
      codigo,
      exacto,
      skip,
      take,
    );
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
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
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    const result = await this.repository.findBy(
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
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }


  async buscarMarcaDesdeProducto(id: number) {
    return this.marcaService.findEntityById(id);
  }

  async buscarLineaDesdeProducto(id: number) {
    return this.lineaService.findEntityById(id);
  }

  async findByIdConAuditoria(id: number) {
    const entity = await this.repository.findByIdConAuditoria(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return AuditoriaMapper.mapProductoToDto(entity);
  }

  async findDtoById(id: number) {
    const entity = await this.repository.findOne(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return ProductoMapper.toDto(entity);
  }

  async findEntityById(id: number) {
    const entity = await this.repository.findOne(id);
    if (!entity)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    return entity;
  }

  async remove(id: number, usuarioId: number) {
    const entity = await this.findEntityById(id);
    if (!entity) {
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );
    }

    ensureNotSistemaEntity(entity, 'Producto');
    const usuario = await this.usuarioService.findOne(usuarioId);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    await this.repository.remove(entity, usuario);
    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      entity.denominacion,
      'eliminada',
    );
  }

  async findAllForLineas(denominacion: string) {
    return this.lineaService.findAllFor(denominacion);
  }

  async findAllForMarcas(denominacion: string) {
    return this.marcaService.findAllFor(denominacion);
  }

  async findByDenominacionCodigoProveedorFiltered(
    denominacion: string,
    skip = 0,
    take = 10,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.log(
      `  Buscando en service producto o ${denominacion}  skip=${skip}, take=${take}`,
    );
    const result =
      await this.repository.findByDenominacionCodigoProveedorFiltered(
        denominacion,
        skip,
        take,
      );
    return {
      data: result.data.map((producto) => {
        return ProductoMapper.toBusquedaDto(producto);
      }),
      total: PaginacionUtils.totalItems(result.total),
    };
  }

  async existsProductosActivosByMarca(marcaId: number): Promise<boolean> {
    return this.repository.existsProductosActivosByMarca(marcaId);
  }
  async existsProductosActivosByLinea(lineaId: number): Promise<boolean> {
    return this.repository.existsProductosActivosByLinea(lineaId);
  }


  async findByIds(ids: number[]): Promise<Producto[]> {
    return this.repository.findByIds(ids);
  }



  async incrementarStock(
    uow: IUnitOfWork,
    productoId: number,
    cantidad: number,
    origen?: string,
  ): Promise<number> {
    return this.ajustarStockInterno(uow, productoId, cantidad, origen);
  }

  async decrementarStock(
    uow: IUnitOfWork,
    productoId: number,
    cantidad: number,
    origen?: string,
  ): Promise<number> {
    return this.ajustarStockInterno(uow, productoId, -cantidad, origen);
  }

  private async ajustarStockInterno(
    uow: IUnitOfWork,
    productoId: number,
    delta: number,
    origen?: string,
  ): Promise<number> {
    const producto = await this.repository.findOne(productoId);
    if (!producto) {
      throw new Error(`Producto con ID ${productoId} no encontrado`);
    }

    const stockActual = producto.stock ?? 0;
    const nuevoStock = stockActual + delta;

    // Política opcional if (nuevoStock < 0) throw ...

    producto.stock = nuevoStock;
    await this.repository.updateEntity(uow, producto);

    this.logger.log(
      `[StockService] ${origen ?? 'Desconocido'} → ${stockActual} → ${nuevoStock}`,
    );

    return nuevoStock;
  }

  /* Orquesta todas las validaciones necesarias para crear un producto* @private*/
 
 
  private async validarYPrepararCreacion(dto: CreateProductoDto) {
    // Validar datos  (Domain - sin DB)
    this.intrinsicValidationService.validarDatosBasicos({
      denominacion: dto.denominacion,
      marcaId: dto.marcaId,
      lineaId: dto.lineaId,
      alicuotaIva: dto.alicuotaIva,
    });



    // La unicidad de la denominación se valida en create(), sobre el nombre final.

    if (dto.codigoProveedor) {
      await this.uniquenessValidator.validarCodigoProveedorUnico(
        dto.codigoProveedor,
        0,
      );
    }
    // 3 Validar entidades relacionadas existen (Infrastructure - DB)
    const { marca, linea, } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId,
        dto.lineaId,
      );

    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,
    );


    //  Validar usuario existe (Infrastructure)
    const usuario = await this.usuarioValidator.validarUsuarioExiste(
      dto.usuarioCreatedId,
    );

    return { marca, linea, usuario };
  }
  /**
   * Orquesta todas las validaciones necesarias para actualizar un producto
   * @private
   */
  private async validarYPrepararActualizacion(
    id: number,
    dto: UpdateProductoDto,
  ) {
    const productoActual = await this.repository.findOne(id);
    if (!productoActual)
      throw new NotFoundException(
        `${this.ENTITY_NAME} con ID ${id} no encontrado.`,
      );

    if (
      productoActual.lineaId == null ||
      productoActual.marcaId == null
    ) {
      throw new InternalServerErrorException('Producto en estado inválido');
    }

    this.intrinsicValidationService.validarDatosBasicos({
      denominacion: dto.denominacion,
      marcaId: dto.marcaId ?? productoActual.marcaId,
      lineaId: dto.lineaId ?? productoActual.lineaId,
      alicuotaIva: dto.alicuotaIva ?? productoActual.alicuotaIva,
    });
    const { marca, linea, } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId ?? productoActual.marcaId,
        dto.lineaId ?? productoActual.lineaId,
      );
    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,
    );
    const usuario = await this.usuarioValidator.validarUsuarioExiste(
      dto.usuarioUpdatedId,
    );
    return { marca, linea, usuario };
  }

  async restaurarDenominacionAutomatica(id: number, usuarioId: number) {
    const entity = await this.repository.findOne(id);
    if (!entity) {
      throw new NotFoundException(`${this.ENTITY_NAME} con ID ${id} no encontrado.`);
    }
    if (!entity.marcaId || !entity.lineaId) {
      throw new NotFoundException(`El producto con ID ${id} no tiene marca o línea asignada.`);
    }
    const marca = await this.marcaService.findEntityById(entity.marcaId);
    const linea = await this.lineaService.findEntityById(entity.lineaId);

    const denominacionAnterior = entity.denominacion;

    entity.generarDenominacionAutomatica(this.generadorDenominacion, {
      marca: marca.denominacion,
      linea: linea.denominacion,
    });

    // Infraestructura: unicidad solo si el nombre final cambió.
    if (entity.denominacion !== denominacionAnterior) {
      await this.uniquenessValidator.validarDenominacionUnica(
        entity.denominacion,
        id,
      );
    }

    const usuario = await this.usuarioService.findOne(usuarioId);
    entity.usuarioUpdated = usuario;

    const { denominacion } = await this.repository.save(entity);

    return MessageFrontUtils.createSimple(
      this.ENTITY_NAME,
      denominacion,
      'editada',
    );
  }

  /* US-10: devuelve la denominación que se generaría, sin guardar nada. Aplica las mismas validaciones que el alta (marca y línea existentes y utilizables) y usa el mismo GeneradorDenominacion, de modo que el nombre que ve el usuario es exactamente el que se va a guardar.*/
  async previsualizarDenominacion(
    dto: PrevisualizarDenominacionDto,
  ): Promise<DenominacionPrevisualizadaDto> {
    const { marca, linea } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId,
        dto.lineaId,
      );
    this.validationService.validarEntidadesRelacionadas(marca, linea);

    // Si llega alguna parte de la presentación, se construye el Value Object, si falta la otra parte, el propio VO lo rechaza con su mensaje.
    const hayPresentacion =
      dto.presentacionCantidad !== undefined ||
      dto.presentacionUnidad !== undefined;

    const presentacion = hayPresentacion
      ? Presentacion.crear(
          dto.presentacionCantidad as number,
          dto.presentacionUnidad as UnidadMedida,
        )
      : null;

    const denominacion = this.generadorDenominacion.generar({
      marca: marca.denominacion,
      linea: linea.denominacion,
      presentacion,
    });

    return { denominacion };
  }
}
