import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * CR-007 (Historial de precios): crea la tabla del historial, que hasta ahora
 * solo existía porque `synchronize: true` la generaba al levantar la aplicación.
 *
 * Cada fila es un cambio de precio ya ocurrido: guarda los valores anteriores y
 * los nuevos, el motivo y quién lo hizo. Se escribe desde
 * ProductoPersistenceAdapter.guardarConHistorial(), en la misma transacción que
 * el producto, para que no pueda quedar un precio cambiado sin su registro.
 *
 * Sobre `productoId` y `producto_id`: la entidad declara la relación con
 * @JoinColumn({ name: 'producto_id' }) y además una columna `productoId`, así
 * que TypeORM crea las dos. Se replica tal cual para que la base quede igual a
 * lo que genera la entidad hoy; unificarlas es parte de la deuda técnica
 * registrada (el mismo caso que lineaId/linea_id y marcaId/marca_id en producto).
 */
export class HistorialPrecioProducto1790567740110 implements MigrationInterface {
    name = 'HistorialPrecioProducto1790567740110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`historial_precio_producto\` (\`id\` int NOT NULL AUTO_INCREMENT, \`productoId\` int NOT NULL, \`precioAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`costoAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`costoDolarAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`cotizacionDolarAnterior\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`porcentajeAnterior\` decimal(10,2) NOT NULL DEFAULT '0.00', \`precioNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`costoNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`costoDolarNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`cotizacionDolarNuevo\` decimal(15,5) NOT NULL DEFAULT '0.00000', \`porcentajeNuevo\` decimal(10,2) NOT NULL DEFAULT '0.00', \`motivo\` varchar(500) NOT NULL, \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`producto_id\` int NOT NULL, \`usuario_id\` int NOT NULL, INDEX \`IDX_45523b7256b15bf785a31ef396\` (\`producto_id\`), INDEX \`IDX_8f46f7fd02953d2df2fbdffab5\` (\`fecha\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`historial_precio_producto\` ADD CONSTRAINT \`FK_45523b7256b15bf785a31ef3962\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`historial_precio_producto\` ADD CONSTRAINT \`FK_e727f8519541e16d5bbfa63cd35\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`historial_precio_producto\` DROP FOREIGN KEY \`FK_e727f8519541e16d5bbfa63cd35\``);
        await queryRunner.query(`ALTER TABLE \`historial_precio_producto\` DROP FOREIGN KEY \`FK_45523b7256b15bf785a31ef3962\``);
        await queryRunner.query(`DROP INDEX \`IDX_8f46f7fd02953d2df2fbdffab5\` ON \`historial_precio_producto\``);
        await queryRunner.query(`DROP INDEX \`IDX_45523b7256b15bf785a31ef396\` ON \`historial_precio_producto\``);
        await queryRunner.query(`DROP TABLE \`historial_precio_producto\``);
    }
}
