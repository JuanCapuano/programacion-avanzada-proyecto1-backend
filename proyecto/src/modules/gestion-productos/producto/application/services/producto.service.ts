import {
  BadRequestException,
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
import { Usuario } from '../../../../../modules/gestion-usuario/usuario/domain/entities/usuario.entity';
@Injectable()
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

    // Historial de precios
    private readonly historialPrecioService: HistorialPrecioService,

    // Adapter directo para operaciones internas
    private readonly persistenceAdapter: ProductoPersistenceAdapter,

  ) { }

  private readonly ENTITY_NAME = 'Producto';

  // Margen general 15%,
  private readonly PORCENTAJE_MARGEN_DEFAULT = 15;

  async create(dto: CreateProductoDto) {
    this.logger.log(`Creando un nuevo ${this.ENTITY_NAME}`);
    // Si no se proporciona porcentaje, se asigna el valor por defecto, muta el dto recibido
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

    // Dominio: la presentación se fija antes de generar la denominación
    // automática, porque esta última la necesita (CR-005 lee vía obtenerPresentacion()).
    entity.asignarPresentacion(
      Presentacion.crear(dto.presentacionCantidad, dto.presentacionUnidad),
    );

    // Dominio: decide si nace automática o manual (US-10 / US-11).
    entity.inicializarDenominacion(
      this.generadorDenominacion,
      { marca: marca.denominacion, linea: linea.denominacion },
      denominacionIngresada,
    );

    // Infraestructura: unicidad sobre el nombre final ya normalizado.
    await this.uniquenessValidator.validarDenominacionUnica(entity.denominacion);

    // Dominio: el precio se deriva de costo y porcentaje, nunca del DTO.
    entity.calcularPrecio();

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

    // La denominación no se copia del DTO: solo entra a la entidad por el dominio.
    const { denominacion: denominacionIngresada, ...datos } = dto;

    Object.assign(entity, datos);
    entity.linea = linea;
    entity.marca = marca;
    entity.usuarioUpdated = usuario;

    // Dominio: decide si el nombre fue editado o se sincroniza (US-11).
    const denominacionCambio = entity.actualizarDenominacion(
      this.generadorDenominacion,
      { marca: marca.denominacion, linea: linea.denominacion },
      denominacionIngresada,
    );

    // Infraestructura: unicidad solo si el nombre final cambió.
    if (denominacionCambio) {
      await this.uniquenessValidator.validarDenominacionUnica(
        entity.denominacion,
        id,
      );
    }

    // Dominio: el costo o el porcentaje pudieron cambiar, se recalcula el precio.
    entity.calcularPrecio();

    const { denominacion } = await this.repository.save(entity);

    return MessageFrontUtils.createSimple(
      `${this.ENTITY_NAME}`,
      denominacion,
      'editada',
    );
  }

  async actualizarPreciosMasivo(dto: ActualizacionMasivaPrecioDto) {
     
    await this.usuarioValidator.validarUsuarioExiste(dto.usuarioId)

    if (dto.alcance === 'linea') {
      await this.lineaService.findEntityById(dto.lineaId as number)
    }

    const cantidadActualizados =
      await this.repository.actualizarPreciosMasivo(dto);

    return MessageFrontUtils.createdItem(
      `Se actualizaron los precios de ${cantidadActualizados} producto(s)`,
      cantidadActualizados,
    );
  }

  /**
   * CR-006 (HU3): devuelve la previsualización de la actualización masiva de
   * precios, sin persistir nada, incluyendo los productos inválidos para que
   * el frontend los señale.
   */
  async previsualizarActualizacionMasivo(
    dto: ActualizacionMasivaPrecioDto,
  ): Promise<PreviewActualizacionMasivaPrecioDto[]> {
    if (dto.alcance === 'linea') {
      await this.lineaService.findEntityById(dto.lineaId as number);
    }

    return this.repository.previsualizarActualizacionMasivo(dto);
  }

  async findByRapido(
    codigo: string,
    exacto: boolean,
    skip: number,
    take: number,
  ): Promise<{ data: GetProductoDto[]; total: number }> {
    this.logger.warn(`service`);
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
    this.logger.warn(`service`);
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
    this.logger.log(`b1x`);
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
      `  Buscando en srvice producto o ${denominacion}  skip=${skip}, take=${take}`,
    );
    const result =
      await this.repository.findByDenominacionCodigoProveedorFiltered(
        denominacion,
        skip,
        take,
      );
    this.logger.log(result);
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

  /**
   * Guarda directamente los campos de precio en un producto ya cargado.
   * Usado internamente por el cambio masivo para evitar recargar la entidad.
   */
  async actualizarPrecioDirecto(id: number, dto: UpdatePrecioDto, usuario: Usuario): Promise<void> {
    await this.persistenceAdapter.actualizarPrecio(id, dto, usuario);
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

    // Política opcional
    // if (nuevoStock < 0) throw ...

    producto.stock = nuevoStock;
    await this.repository.updateEntity(uow, producto);

    this.logger.log(
      `[StockService] ${origen ?? 'Desconocido'} → ${stockActual} → ${nuevoStock}`,
    );

    return nuevoStock;
  }

  /**
   * Actualiza el precio de un producto individual.
   * Valida que el precio resultante sea > 0 ANTES de persistir cualquier cambio.
   * Registra en el historial SOLO si el precio cambió efectivamente.
   */
  async actualizarPrecio(id: number, dto: UpdatePrecioDto) {
    this.logger.log(`[DEBUG] actualizarPrecio llamado — id=${id} dto=${JSON.stringify(dto)}`); 
    // Validar precio > 0 antes de cualquier operación de BD
    if (dto.precio <= 0) {
      this.logger.warn(`[BACK · ProductoService] ❌ precio <= 0, rechazando`);
      throw new BadRequestException(
        `El precio (${dto.precio}) debe ser mayor a 0. El cambio fue rechazado.`,
      );
    }

    const producto = await this.findEntityById(id);
    this.logger.log(`[BACK · ProductoService] precio actual en BD: ${producto.precio}`);
    const usuario = await this.usuarioValidator.validarUsuarioExiste(dto.usuarioId);

    // Capturar valores anteriores ANTES de modificar la entidad
    const precioAnterior = dto.precioAnterior ?? producto.precio ?? 0;

    // Actualizar la entidad en la base de datos
    await this.repository.actualizarPrecio(id, dto, usuario);

    // Registrar en historial si el precio cambió
    await this.historialPrecioService.registrarSiCambio(
      {
        productoId: id,
        precioAnterior,
        costoAnterior: producto.costo ?? 0,
        costoDolarAnterior: producto.costoDolar ?? 0,
        cotizacionDolarAnterior: producto.cotizacionDolar ?? 0,
        porcentajeAnterior: producto.porcentaje ?? 0,
        precioNuevo: dto.precio,
        costoNuevo: dto.costo,
        costoDolarNuevo: dto.costoDolar,
        cotizacionDolarNuevo: dto.cotizacionDolar,
        porcentajeNuevo: dto.porcentaje,
        motivo: dto.motivo,
        usuarioId: dto.usuarioId,
      },
      producto,
      usuario,
    );

    return MessageFrontUtils.create(
      `Precio del producto ${producto.denominacion} actualizado con éxito`,
    );
  }

  /**
   * Actualiza el precio de múltiples productos en una operación masiva.
   * Registra en el historial cada producto cuyo precio efectivamente cambió.
   *
   * @param items  Lista de { productoId, dto } con los cambios a aplicar
   * @param motivo Motivo general del cambio masivo (ej: "Ajuste por inflación")
   */
  async actualizarPreciosMasivo(
    items: Array<{ productoId: number; dto: UpdatePrecioDto }>,
    motivo: string,
    usuarioId: number,
  ) {
    this.logger.log(
      `Actualización masiva de precios: ${items.length} productos. Motivo: "${motivo}"`,
    );

    const usuario = await this.usuarioValidator.validarUsuarioExiste(usuarioId);

    const resultados = await Promise.all(
      items.map(async ({ productoId, dto }) => {
        const producto = await this.findEntityById(productoId);

        const precioAnterior = producto.precio ?? 0;

        await this.repository.actualizarPrecio(productoId, dto, usuario);

        const registrado = await this.historialPrecioService.registrarSiCambio(
          {
            productoId,
            precioAnterior,
            costoAnterior: producto.costo ?? 0,
            costoDolarAnterior: producto.costoDolar ?? 0,
            cotizacionDolarAnterior: producto.cotizacionDolar ?? 0,
            porcentajeAnterior: producto.porcentaje ?? 0,
            precioNuevo: dto.precio,
            costoNuevo: dto.costo,
            costoDolarNuevo: dto.costoDolar,
            cotizacionDolarNuevo: dto.cotizacionDolar,
            porcentajeNuevo: dto.porcentaje,
            motivo,
            usuarioId,
          },
          producto,
          usuario,
        );

        return { productoId, denominacion: producto.denominacion, registrado };
      }),
    );

    const conCambio = resultados.filter((r) => r.registrado).length;
    this.logger.log(
      `Actualización masiva completada: ${conCambio}/${items.length} productos con cambio de precio registrado.`,
    );

    return {
      mensaje: `Actualización masiva completada. ${conCambio} producto(s) con cambio de precio registrado.`,
      detalle: resultados,
    };
  }

  /**
   * Orquesta todas las validaciones necesarias para crear un producto
   * @private
   */
 
 
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

    //  Validar reglas de negocio sobre entidades (Domain)
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
    // Obtener producto actual
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

    //  Validar datos intrínsecos
    this.intrinsicValidationService.validarDatosBasicos({
      denominacion: dto.denominacion,
      marcaId: dto.marcaId ?? productoActual.marcaId,
      lineaId: dto.lineaId ?? productoActual.lineaId,
      alicuotaIva: dto.alicuotaIva ?? productoActual.alicuotaIva,

    });

    // La unicidad de la denominación se valida en update(), sobre el nombre final.

    // Validar entidades relacionadas
    const { marca, linea, } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId ?? productoActual.marcaId,
        dto.lineaId ?? productoActual.lineaId,

      );

    //  Validar reglas de negocio
    this.validationService.validarEntidadesRelacionadas(
      marca,
      linea,

    );

    // 5 Validar usuario
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

  /**
   * US-10: devuelve la denominación que se generaría, sin guardar nada.
   *
   * Aplica las mismas validaciones que el alta (marca y línea existentes y
   * utilizables) y usa el mismo GeneradorDenominacion, de modo que el nombre
   * que ve el usuario es exactamente el que se va a guardar.
   */
  async previsualizarDenominacion(
    dto: PrevisualizarDenominacionDto,
  ): Promise<DenominacionPrevisualizadaDto> {
    const { marca, linea } =
      await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(
        dto.marcaId,
        dto.lineaId,
      );
    this.validationService.validarEntidadesRelacionadas(marca, linea);

    // Si llega alguna parte de la presentación, se construye el Value Object:
    // si falta la otra parte, el propio VO lo rechaza con su mensaje.
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
