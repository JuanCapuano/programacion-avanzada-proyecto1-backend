import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperLineaService } from './application/services/super-linea.service';
import { SuperLineaController } from './application/controllers/super-linea.controller';
import { LineaModule } from '../linea/linea.module';
import { SuperLinea } from './domain/entities/super-linea.entity';
import { PoliticaEliminacionSuperLinea } from './domain/services/politica-eliminacion-super-linea.service';
import { SuperLineaRepository } from './infraestructure/repositories/super-linea.repository';
import { DataSource } from 'typeorm';
import { IUnitOfWork } from 'src/modules/common/unit-of-work/iunit-of-work.';
import { TypeOrmUnitOfWork } from 'src/modules/common/unit-of-work/type-orm-unit-of-works1';
import { SuperLineaPersistenceAdapter } from './infraestructure/repositories/super-linea.persistence.adapter';
import { NormalizeDenominacionPipe } from 'src/modules/common/pipes/normalize-denominations.pipe';
import { UsuarioModule } from 'src/modules/gestion-usuario/usuario/usuario.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([SuperLinea]),
    forwardRef(() => LineaModule),
    UsuarioModule
  ],
  controllers: [SuperLineaController],
  providers: [
    PoliticaEliminacionSuperLinea,
    SuperLineaService,
    SuperLineaRepository,
    {
      provide: 'ISuperLineaRepository',
      useClass: SuperLineaPersistenceAdapter,
    },
    {
      provide: 'UnitOfWork',
      useFactory: (dataSource: DataSource): IUnitOfWork => {
        return new TypeOrmUnitOfWork(dataSource);
      },
      inject: [DataSource],
    },
    NormalizeDenominacionPipe
  ],
  exports: [
    SuperLineaService,
    'ISuperLineaRepository'
  ]
})
export class SuperLineaModule {}
