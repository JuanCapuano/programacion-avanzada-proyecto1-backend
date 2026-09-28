import { Linea } from 'src/modules/gestion-productos/linea/domain/entities/linea.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';


@Entity('super_linea')
@Index(['denominacion', 'deletedAt'], { unique: true })
export class SuperLinea {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    denominacion: string;

    @Column({ type: 'text', nullable: true })
    observacion?: string;

    @OneToMany(() => Linea, (linea) => linea.superLinea)
    lineas: Linea[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({ nullable: true })
    deletedAt?: Date;

    @Column({ type: 'int', nullable: true })
    usuarioCreatedId?: number;

    @Column({ type: 'int', nullable: true })
    usuarioDeletedId?: number;

    @Column({ type: 'int', nullable: true })
    usuarioUpdatedId?: number;

    @Column({ type: 'int', default: 0 })
    sistema: number;

}
