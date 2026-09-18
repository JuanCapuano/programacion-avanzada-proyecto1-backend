import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperLineaService } from './application/services/super-linea.service';
import { SuperLineaController } from './application/controllers/super-linea.controller';
import { LineaModule } from '../linea/linea.module';
import { SuperLinea } from './domain/entities/super-linea.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperLinea]),
    forwardRef(() => LineaModule),
  ],
  controllers: [SuperLineaController],
  providers: [SuperLineaService],
})
export class SuperLineaModule {}
