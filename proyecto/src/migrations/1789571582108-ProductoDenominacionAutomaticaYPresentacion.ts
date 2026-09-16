import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * CR-005 (Denominación automática) + soporte mínimo de CR-002 (Presentación).
 *
 * - origenDenominacion: los productos existentes quedan como 'MANUAL' por el
 *   DEFAULT, de modo que sus nombres escritos a mano no se regeneran solos.
 * - presentacionCantidad / presentacionUnidad: columnas del Value Object
 *   Presentacion embebido en producto. Nulas: los productos existentes no
 *   tienen presentación cargada.
 */
export class ProductoDenominacionAutomaticaYPresentacion1789571582108 implements MigrationInterface {
    name = 'ProductoDenominacionAutomaticaYPresentacion1789571582108'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`producto\` ADD \`origenDenominacion\` varchar(20) NOT NULL DEFAULT 'MANUAL'`);
        await queryRunner.query(`ALTER TABLE \`producto\` ADD \`presentacionCantidad\` decimal(12,3) NULL`);
        await queryRunner.query(`ALTER TABLE \`producto\` ADD \`presentacionUnidad\` varchar(10) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`presentacionUnidad\``);
        await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`presentacionCantidad\``);
        await queryRunner.query(`ALTER TABLE \`producto\` DROP COLUMN \`origenDenominacion\``);
    }
}
