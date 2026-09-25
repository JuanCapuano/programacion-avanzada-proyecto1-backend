import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Linea } from '../../../linea/domain/entities/linea.entity';
import { Marca } from '../../../marca/domain/entities/marca.entity';
import { AlicuotaIva } from 'src/modules/organizacion/enums/alicuota-iva.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ProductoOperacion } from '../../../producto-operacion/entities/producto-operacion.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { MonetarioColumn } from 'src/modules/common/decorators/monetario-column.decorator';
import { CantidadColumn } from 'src/modules/common/decorators/cantidad-column.decorator';
import { PorcentajeColumn } from 'src/modules/common/decorators/porcentaje-column.decorator';
import { Proveedor } from 'src/modules/organizacion/proveedor/domain/entities/proveedor.entity';
import { OrigenDenominacion } from '../enums/origen-denominacion.enum';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { Presentacion } from '../value-objects/presentacion.vo';
import {
  ComponentesDenominacion,
  GeneradorDenominacion,
} from '../services/generador-denominacion.service';
import { ProductoDomainException } from '../exceptions/producto-domain.exception';

/** Valores que definen el precio de un producto en un momento dado (CR-007). */
export interface DatosPrecioProducto {
  precio: number;
  costo: number;
  costoDolar: number;
  cotizacionDolar: number;
  porcentaje: number;
}

@Entity('producto')
export class Producto {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'text' })
  denominacion: string;
  
  @Column({
    type: 'varchar',
    length: 20,
    default: OrigenDenominacion.MANUAL,
  })
  origenDenominacion: OrigenDenominacion;

  // ========== PRESENTACIÓN (CR-002) ==========
  // Columnas de persistencia del Value Object Presentacion. No se acceden
  // directamente: usar obtenerPresentacion() / asignarPresentacion().
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
    transformer: {
      to: (value?: number | null): string | null =>
        value === null || value === undefined ? null : value.toString(),
      from: (value?: string | null): number | null =>
        value === null || value === undefined ? null : Number(value),
    },
  })
  presentacionCantidad?: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  presentacionUnidad?: UnidadMedida | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  codigoProveedor?: string | null;

  @Column({ type: 'text', nullable: true })
  codigoBarra?: string | null;

  // ========== PROVEEDOR ==========
  @ManyToOne(() => Proveedor, (pro) => pro.proveedoresOperacion, {
    eager: true,
  })
  @JoinColumn({ name: 'proveedor_id' })
  @Index()
  proveedor: Proveedor;

  @Column({ type: 'int', nullable: true })
  proveedorId?: number;

  /*Nota: No usar el enum alciculta iva en @Column sino no anda el importar precios */
  @PorcentajeColumn(21.0)
  alicuotaIva: AlicuotaIva;

  // Stock: cantidades reales, admite fracciones (1.5 kg, 0.25 lts)
  @CantidadColumn()
  stock: number;

  @Column('boolean', { default: false })
  utilizaStockMinimo: boolean;

  @Column('boolean', { default: false })
  utilizaStockMinimoPorEmpresa: boolean;

  @CantidadColumn()
  stockMinimo: number;

  @MonetarioColumn()
  costo?: number;

  @MonetarioColumn()
  costoDolar?: number;

  /*Ultima cotizacion dolar por el cambio de precio si producto posee costo dolar*/
  @MonetarioColumn()
  cotizacionDolar?: number;
  //se utiliza en las importaciones;

  @MonetarioColumn()
  precioDolar?: number;
  // Precio de venta

  @MonetarioColumn()
  precio?: number;

  @PorcentajeColumn()
  porcentaje?: number;

  @Column({ type: 'timestamp', nullable: true })
  fechaCosto?: Date;

  @Column('boolean', { default: false })
  costoEnDolar?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaCostoDolar?: Date;


  @Column('boolean', { default: false })
  destacado?: boolean;

  @Column('boolean', { default: false })
  envioGratis?: boolean;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  deletedAt?: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_created_id' })
  usuarioCreated: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_updated_id' })
  usuarioUpdated: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_deleted_id' })
  usuarioDeleted: Usuario;


  // ========== LINEA ==========
  @ManyToOne(() => Linea, (linea) => linea.productos)
  @JoinColumn({ name: 'linea_id' })
  linea: Linea;

  @Column({ type: 'int', nullable: true })
  lineaId?: number;


 // ==========  MARCA ==========
  @ManyToOne(() => Marca, (marca) => marca.productos)
  @JoinColumn({ name: 'marca_id' })
  marca: Marca;

  @Column({ type: 'int', nullable: true })
  marcaId?: number;


  @Column({ default: false })
  utilizaPack: boolean;

  @Column({ type: 'int', nullable: true })
  cantidadPorPack: number | null;

  @Column({ type: 'text', nullable: true })
  imagen?: string;


  @Column({ type: 'text', nullable: true })
  ubicacion?: string;

  @ManyToOne(() => Producto, (producto) => producto.productosOperacion)
  productosOperacion: ProductoOperacion;


  @Column({ type: 'int', default: 0 })
  sistema: number;

  @Column({ type: 'text', nullable: true })
  codigoReferencia?: string | null;

  calcularPrecio(): number {
  const costo = this.costo ?? 0;
  const porcentaje = this.porcentaje ?? 0;

  const precioCalculado = costo + (costo * porcentaje) / 100;

  if (precioCalculado <= 0) {
    throw new ProductoDomainException(
      `El precio calculado (${precioCalculado}) debe ser mayor a 0. Revisá el costo y el porcentaje cargados.`,
    );
  }

  this.precio = precioCalculado;
  return this.precio;
}

  obtenerDatosPrecio(): DatosPrecioProducto {
    return {
      precio: this.precio ?? 0,
      costo: this.costo ?? 0,
      costoDolar: this.costoDolar ?? 0,
      cotizacionDolar: this.cotizacionDolar ?? 0,
      porcentaje: this.porcentaje ?? 0,
    };
  }

  actualizarCostoYMargen(cambios: {
    costo?: number;
    porcentaje?: number;
    // SIN USO por ahora: el costo en dólares no participa del precio.
    // costoDolar?: number;
    // cotizacionDolar?: number;
  }): void {
    if (cambios.costo !== undefined && cambios.costo !== this.costo) {
      this.costo = cambios.costo;
      this.fechaCosto = new Date();
    }
    // SIN USO por ahora. Se comenta (no se borra) para referencia.
    //
    // if (
    //   cambios.costoDolar !== undefined &&
    //   cambios.costoDolar !== this.costoDolar
    // ) {
    //   this.costoDolar = cambios.costoDolar;
    //   this.fechaCostoDolar = new Date();
    // }
    // if (cambios.cotizacionDolar !== undefined) {
    //   this.cotizacionDolar = cambios.cotizacionDolar;
    // }
    if (cambios.porcentaje !== undefined) {
      this.porcentaje = cambios.porcentaje;
    }

    this.calcularPrecio();
  }

  /* Simula el resultado de aplicar un ajuste masivo de precio (CR-006), sin mutar el estado de la entidad. Quien llama decide si aplica el resultado.*/
  simularAjustePrecio(
    tipoAjuste: 'porcentaje' | 'monto',
    valor: number,
  ): { precioResultante: number; porcentajeResultante: number; valido: boolean } {
    const precio = this.precio ?? 0;
    const costo = this.costo ?? 0;

    const precioResultante =
      tipoAjuste === 'porcentaje' ? precio * (1 + valor / 100) : precio + valor;

    const porcentajeResultante = (precioResultante / costo - 1) * 100;

    return {
      precioResultante,
      porcentajeResultante,
      valido:
      precioResultante > 0 &&
      porcentajeResultante >= -99.99
    };
  }

  /* Aplica un ajuste masivo de precio (CR-006), mutando la entidad. */
  aplicarAjustePrecio(tipoAjuste: 'porcentaje' | 'monto', valor: number): void {
    const { precioResultante, porcentajeResultante, valido } =
      this.simularAjustePrecio(tipoAjuste, valor);

    if (!valido) {
      throw new ProductoDomainException(
        `La actualización dejaría el precio del producto "${this.denominacion}" en un valor inválido (${precioResultante}). Se rechaza la operación completa y ningún producto fue modificado.`,
      );
    }
    this.porcentaje = porcentajeResultante;
    this.calcularPrecio(); // el precio se deriva de costo + margen
  }

  /** Reconstruye el Value Object a partir de sus columnas de persistencia. */
  obtenerPresentacion(): Presentacion | null {
    if (
      this.presentacionCantidad === null ||
      this.presentacionCantidad === undefined ||
      !this.presentacionUnidad
    ) {
      return null;
    }
    return Presentacion.crear(
      this.presentacionCantidad,
      this.presentacionUnidad,
    );
  }

  asignarPresentacion(presentacion: Presentacion | null): void {
    this.presentacionCantidad = presentacion?.cantidad ?? null;
    this.presentacionUnidad = presentacion?.unidad ?? null;
  }

  esDenominacionManual(): boolean {
    return this.origenDenominacion !== OrigenDenominacion.AUTOMATICA;
  }

  generarDenominacionAutomatica(
    generador: GeneradorDenominacion,
    componentes: Omit<ComponentesDenominacion, 'presentacion'>,
  ): void {
    this.denominacion = generador.generar({
      ...componentes,
      presentacion: this.obtenerPresentacion(),
    });
    this.origenDenominacion = OrigenDenominacion.AUTOMATICA;
  }

  sincronizarDenominacion(
    generador: GeneradorDenominacion,
    componentes: Omit<ComponentesDenominacion, 'presentacion'>,
  ): boolean {
    if (this.esDenominacionManual()) {
      return false;
    }
    this.generarDenominacionAutomatica(generador, componentes);
    return true;
  }

  renombrarManualmente(denominacion: string): void {
    const normalizada = Producto.normalizarDenominacion(denominacion);

    if (!normalizada) {
      throw new ProductoDomainException(
        'La denominación no puede estar vacía.',
      );
    }
    if (normalizada.length > GeneradorDenominacion.LONGITUD_MAXIMA) {
      throw new ProductoDomainException(
        `La denominación no puede superar los ${GeneradorDenominacion.LONGITUD_MAXIMA} caracteres.`,
      );
    }

    this.denominacion = normalizada;
    this.origenDenominacion = OrigenDenominacion.MANUAL;
  }

  inicializarDenominacion(
    generador: GeneradorDenominacion,
    componentes: Omit<ComponentesDenominacion, 'presentacion'>,
    denominacionIngresada?: string,
  ): void {
    if (denominacionIngresada === undefined) {
      this.generarDenominacionAutomatica(generador, componentes);
      return;
    }
    this.renombrarManualmente(denominacionIngresada);
  }

  actualizarDenominacion(
    generador: GeneradorDenominacion,
    componentes: Omit<ComponentesDenominacion, 'presentacion'>,
    denominacionIngresada?: string,
  ): boolean {
    const anterior = this.denominacion;

    const fueEditada =
      denominacionIngresada !== undefined &&
      Producto.normalizarDenominacion(denominacionIngresada) !== anterior;

    if (fueEditada) {
      this.renombrarManualmente(denominacionIngresada);
    } else {
      this.sincronizarDenominacion(generador, componentes);
    }

    return this.denominacion !== anterior;
  }

  /** Misma normalización que el resto del catálogo: minúsculas y espacios simples. */
  private static normalizarDenominacion(texto: string | null | undefined): string {
    return (texto ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
