import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * La columna `porcentaje` de `producto` nació como decimal(5,2) (Init), lo que
 * limita el margen almacenable a 999.99. El decorador `@PorcentajeColumn()` en
 * la entidad ya declara precision:10 desde antes, pero esa metadata nunca se
 * sincronizó con una migración: la tabla real seguía en decimal(5,2), y por
 * eso un ajuste masivo de precio que dejara un margen > 999.99% fallaba en el
 * UPDATE con "Out of range value for column 'porcentaje'" (ER_WARN_DATA_OUT_OF_RANGE),
 * aunque la validación de dominio lo hubiera dado como válido.
 */
export class AmpliarPorcentajeProducto1790092693628 implements MigrationInterface {
    name = 'AmpliarPorcentajeProducto1790092693628'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`producto\` MODIFY COLUMN \`porcentaje\` decimal(10,2) NOT NULL DEFAULT '0.00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`producto\` MODIFY COLUMN \`porcentaje\` decimal(5,2) NOT NULL DEFAULT '0.00'`);
    }
}
