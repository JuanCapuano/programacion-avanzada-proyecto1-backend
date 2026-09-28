import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../../producto/domain/entities/producto.entity';
import { Usuario } from 'src/modules/gestion-usuario/usuario/domain/entities/usuario.entity';
import { MonetarioColumn } from 'src/modules/common/decorators/monetario-column.decorator';
import { PorcentajeColumn } from 'src/modules/common/decorators/porcentaje-column.decorator';

@Entity('historial_precio_producto')
export class HistorialPrecioProducto {
  @PrimaryGeneratedColumn()
  id: number;

  /** Producto al que pertenece este registro */
  @ManyToOne(() => Producto, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  @Index()
  producto: Producto;

  @Column({ type: 'int' })
  productoId: number;

  // ─── Valores ANTERIORES ──────────────────────────────────────────────────────

  @MonetarioColumn()
  precioAnterior: number;

  @MonetarioColumn()
  costoAnterior: number;

  @MonetarioColumn()
  costoDolarAnterior: number;

  @MonetarioColumn()
  cotizacionDolarAnterior: number;

  @PorcentajeColumn()
  porcentajeAnterior: number;

  // ─── Valores NUEVOS ───────────────────────────────────────────────────────────

  @MonetarioColumn()
  precioNuevo: number;

  @MonetarioColumn()
  costoNuevo: number;

  @MonetarioColumn()
  costoDolarNuevo: number;

  @MonetarioColumn()
  cotizacionDolarNuevo: number;

  @PorcentajeColumn()
  porcentajeNuevo: number;

  // ─── Contexto ─────────────────────────────────────────────────────────────────

  /**
   * Descripción del motivo del cambio. Obligatorio para forzar que
   * quien dispara el cambio explique por qué.
   * Ejemplos: "Aumento de costos proveedor", "Ajuste por inflación", "Corrección de margen"
   */
  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  /** Cuando se originó el cambio (timestamp del servidor) */
  @CreateDateColumn()
  @Index()
  fecha: Date;

  /** Usuario que realizó el cambio */
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
