import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialPrecioProducto } from './domain/entities/historial-precio-producto.entity';
import { HistorialPrecioPersistenceAdapter } from './infraestructure/repositories/historial-precio.persistence-adapter';
import { HistorialPrecioService } from './application/services/historial-precio.service';
import { HistorialPrecioController } from './application/controllers/historial-precio.controller';
import { ProductoModule } from '../producto/producto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HistorialPrecioProducto]),
    forwardRef(() => ProductoModule),
  ],
  controllers: [HistorialPrecioController],
  providers: [
    HistorialPrecioService,
    HistorialPrecioPersistenceAdapter,
    {
      provide: 'IHistorialPrecioRepository',
      useClass: HistorialPrecioPersistenceAdapter,
    },
  ],
  exports: [HistorialPrecioService],
})
export class HistorialPrecioProductoModule {}
