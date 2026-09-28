import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { ProductoController } from 'src/modules/gestion-productos/producto/application/controllers/producto.controller';
import { ProductoService } from 'src/modules/gestion-productos/producto/application/services/producto.service';
import { ProductoIntrinsicValidationService } from 'src/modules/gestion-productos/producto/domain/services/producto-intrinsic-validation.service.ts';
import { ProductoValidationService } from 'src/modules/gestion-productos/producto/domain/services/producto-validation.service.ts';
import { GeneradorDenominacion } from 'src/modules/gestion-productos/producto/domain/services/generador-denominacion.service';
import { ProductoRelatedEntitiesValidator } from 'src/modules/gestion-productos/producto/infraestructure/validators/producto-related-entities.validator.ts';
import { ProductoUniquenessValidator } from 'src/modules/gestion-productos/producto/infraestructure/validators/producto-uniqueness.validator.ts';
import { SuperLineaController } from 'src/modules/gestion-productos/super-linea/application/controllers/super-linea.controller';
import { SuperLineaService } from 'src/modules/gestion-productos/super-linea/application/services/super-linea.service';
import { PoliticaEliminacionSuperLinea } from 'src/modules/gestion-productos/super-linea/domain/services/politica-eliminacion-super-linea.service';
import { ProductoDeletePolicy } from 'src/modules/gestion-productos/producto/application/policies/producto-delete.policy';
import { ProductoPersistenceAdapter } from 'src/modules/gestion-productos/producto/infraestructure/repositories/producto.persistence-adapters';
import { Producto } from 'src/modules/gestion-productos/producto/domain/entities/producto.entity';

import { MarcaController } from 'src/modules/gestion-productos/marca/application/controllers/marca.controller';
import { MarcaService } from 'src/modules/gestion-productos/marca/application/services/marca.service';
import { PoliticaEliminacionMarca } from 'src/modules/gestion-productos/marca/domain/services/politica-eliminacion-marca.service';

import { LineaController } from 'src/modules/gestion-productos/linea/application/controllers/linea.controller';
import { LineaService } from 'src/modules/gestion-productos/linea/application/services/linea.service';
import { PoliticaEliminacionLinea } from 'src/modules/gestion-productos/linea/domain/services/politica-eliminacion-linea.service';

import { HistorialPrecioController } from 'src/modules/gestion-productos/historial-precio-producto/application/controllers/historial-precio.controller';
import { HistorialPrecioService } from 'src/modules/gestion-productos/historial-precio-producto/application/services/historial-precio.service';

import { ProveedorService } from 'src/modules/organizacion/proveedor/application/services/proveedor.service';
import { UsuarioService } from 'src/modules/gestion-usuario/usuario/application/services/usuario.service';
import { UsuarioValidator } from 'src/modules/common/utils/validation/usuario-validator';
import { AuthGuard } from 'src/modules/gestion-usuario/auth/auth.guard';
import { GlobalExceptionFilter } from 'src/modules/common/filters/global-exception.filters';

type EntidadSimple = {
  id: number;
  denominacion: string;
  sistema: number;
  // CR-003: las líneas cuelgan de una superlínea.
  superLineaId?: number;
  observacion?: string;
  deletedAt?: Date | null;
  stockMinimo?: number;
  utilizaStockMinimo?: boolean;
};

type RegistroHistorial = Record<string, unknown> & {
  id: number;
  productoId: number;
  fecha: Date;
};

/**
 * Armazón compartido por los escenarios BDD del módulo gestión de productos.
 *
 * Levanta la aplicación Nest REAL en memoria (controllers + servicios + dominio
 * + DTOs + filtros, con la misma configuración que main.ts) y reemplaza
 * únicamente los repositorios por equivalentes en memoria. Así los escenarios
 * ejercitan el comportamiento verdadero del sistema sin depender de MySQL.
 *
 * Limitación conocida: la lógica que vive dentro de los PersistenceAdapter
 * (consultas TypeORM) no se ejercita. Donde esa capa contiene reglas de negocio
 * —la actualización masiva de precios— el repositorio en memoria delega el
 * cálculo en el método de dominio real (Producto.simularAjustePrecio) y sólo
 * reproduce la orquestación.
 */
export class ContextoProducto {
  app: INestApplication;
  http: ReturnType<typeof request>;

  /** "Base de datos" en memoria. */
  productos: Producto[] = [];
  marcas: EntidadSimple[] = [];
  lineas: EntidadSimple[] = [];
  superLineas: EntidadSimple[] = [
    // Toda línea necesita una superlínea: las features que no la nombran usan esta.
    { id: 1, denominacion: 'GENERAL', sistema: 0, deletedAt: null },
  ];

  historial: RegistroHistorial[] = [];

  /** Última respuesta HTTP recibida, para verificarla en los pasos Then. */
  respuesta: request.Response;

  private proximoIdProducto = 1;
  private proximoIdHistorial = 1;

  async iniciar(): Promise<void> {
    const modulo = await Test.createTestingModule({
      controllers: [
        ProductoController,
        MarcaController,
        LineaController,
        SuperLineaController,
        HistorialPrecioController,
      ],
      providers: [
        // Código real bajo prueba
        ProductoService,
        ProductoIntrinsicValidationService,
        ProductoValidationService,
        GeneradorDenominacion,
        ProductoRelatedEntitiesValidator,
        ProductoUniquenessValidator,
        MarcaService,
        PoliticaEliminacionMarca,
        LineaService,
        PoliticaEliminacionLinea,
        HistorialPrecioService,

        // Repositorios reemplazados por memoria
        {
          provide: 'IProductoRepository',
          useValue: this.repositorioProductos(),
        },
        { provide: 'IMarcaRepository', useValue: this.repositorioMarcas() },
        { provide: 'ILineaRepository', useValue: this.repositorioLineas() },
        {
          provide: 'IHistorialPrecioRepository',
          useValue: this.repositorioHistorial(),
        },

        // Colaboradores de otros módulos (fuera del alcance de estas pruebas)
        { provide: ProveedorService, useValue: {} },
        {
          provide: UsuarioService,
          useValue: {
            findOne: async (id: number) => ({ id, denominacion: 'Tester' }),
          },
        },
        {
          provide: UsuarioValidator,
          useValue: {
            validarUsuarioExiste: async (id: number) => ({
              id,
              denominacion: 'Tester',
            }),
          },
        },
        { provide: ProductoDeletePolicy, useValue: {} },
        // CR-003: la superlínea se ejercita de verdad, con su propio feature.
        SuperLineaService,
        PoliticaEliminacionSuperLinea,
        {
          provide: 'ISuperLineaRepository',
          useValue: this.repositorioSuperLineas(),
        },
        { provide: ProductoPersistenceAdapter, useValue: {} },
      ],
    })
      // Autenticación fuera de alcance: se prueba en su propio módulo.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .setLogger({
        log() {},
        error() {},
        warn() {},
        debug() {},
        verbose() {},
      })
      .compile();

    this.app = modulo.createNestApplication();

    // Misma configuración que main.ts, para que los escenarios vean
    // exactamente las mismas validaciones y errores que un cliente real.
    this.app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    this.app.useGlobalFilters(new GlobalExceptionFilter());

    await this.app.init();
    this.http = request(this.app.getHttpServer());
  }

  async cerrar(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  // ---------------------------------------------------------------- helpers

  darDeAltaMarca(denominacion: string, sistema = 0): number {
    const id = this.marcas.length + 1;
    this.marcas.push({ id, denominacion, sistema, deletedAt: null });
    return id;
  }

  darDeAltaLinea(denominacion: string, sistema = 0, superLineaId = 1): number {
    const id = this.lineas.length + 1;
    this.lineas.push({
      id,
      denominacion,
      sistema,
      superLineaId,
      deletedAt: null,
      stockMinimo: 0,
      utilizaStockMinimo: false,
    });
    return id;
  }

  darDeAltaSuperLinea(denominacion: string, sistema = 0): number {
    const existente = this.superLineas.find(
      (sl) => sl.denominacion === denominacion,
    );
    if (existente) {
      return existente.id;
    }
    const id = this.superLineas.length + 1;
    this.superLineas.push({ id, denominacion, sistema, deletedAt: null });
    return id;
  }

  idSuperLinea(denominacion: string): number {
    const superLinea = this.superLineas.find(
      (sl) => sl.denominacion === denominacion,
    );
    if (!superLinea) {
      throw new Error(
        `La superlínea ${denominacion} no fue creada en el Background`,
      );
    }
    return superLinea.id;
  }

  superLineaPorId(id: number): EntidadSimple | undefined {
    return this.superLineas.find((sl) => sl.id === id);
  }

  lineaPorDenominacion(denominacion: string): EntidadSimple | undefined {
    return this.lineas.find((l) => l.denominacion === denominacion);
  }

  idMarca(denominacion: string): number {
    const marca = this.marcas.find((m) => m.denominacion === denominacion);
    if (!marca) {
      throw new Error(`La marca ${denominacion} no fue creada en el Background`);
    }
    return marca.id;
  }

  idLinea(denominacion: string): number {
    const linea = this.lineas.find((l) => l.denominacion === denominacion);
    if (!linea) {
      throw new Error(`La linea ${denominacion} no fue creada en el Background`);
    }
    return linea.id;
  }

  productoPorDenominacion(denominacion: string): Producto | undefined {
    return this.productos.find((p) => p.denominacion === denominacion);
  }

  productoPorId(id: number): Producto | undefined {
    return this.productos.find((p) => p.id === id);
  }

  historialDe(productoId: number): RegistroHistorial[] {
    return this.historial
      .filter((h) => h.productoId === productoId)
      .sort((a, b) => b.id - a.id);
  }

  get ultimoProducto(): Producto {
    return this.productos[this.productos.length - 1];
  }

  // ------------------------------------------------------- repositorios

  /**
   * Devuelve una copia, igual que haría TypeORM al leer de la base: si el caso
   * de uso modifica la entidad y después falla una validación, lo guardado no
   * cambia porque nunca se llamó a save().
   */
  private copiarProducto(entity: Producto): Producto {
    return Object.assign(Object.create(Producto.prototype), entity);
  }

  private repositorioProductos() {
    const productos = this.productos;
    const copiar = (e: Producto) => this.copiarProducto(e);
    const activos = () => productos.filter((p) => !p.deletedAt);

    // Las columnas de precio son decimales: MySQL redondea al guardar y el
    // repositorio en memoria hace lo mismo.
    const comoEnLaBase = (n?: number | null) =>
      n === null || n === undefined ? n : Number(n.toFixed(5));

    const guardar = (entity: Producto) => {
      // TypeORM completa estas columnas al guardar (@CreateDateColumn /
      // @UpdateDateColumn); el repositorio en memoria hace lo mismo.
      entity.createdAt = entity.createdAt ?? new Date();
      entity.updatedAt = new Date();
      entity.precio = comoEnLaBase(entity.precio) as number;
      entity.costo = comoEnLaBase(entity.costo) as number;
      entity.porcentaje = comoEnLaBase(entity.porcentaje) as number;

      if (!entity.id) {
        entity.id = this.proximoIdProducto++;
        productos.push(copiar(entity));
        return entity;
      }
      const indice = productos.findIndex((p) => p.id === entity.id);
      if (indice >= 0) {
        productos[indice] = copiar(entity);
      }
      return entity;
    };

    return {
      save: async (entity: Producto) => guardar(entity),
      updateEntity: async (_uow: unknown, entity: Producto) => guardar(entity),

      findOne: async (id: number) => {
        const guardado = productos.find((p) => p.id === id && !p.deletedAt);
        return guardado ? copiar(guardado) : null;
      },
      findByIds: async (ids: number[]) =>
        activos()
          .filter((p) => ids.includes(p.id))
          .map(copiar),

      existsByDenominacion: async (denominacion: string, excluirId?: number) =>
        activos().some(
          (p) => p.denominacion === denominacion && p.id !== excluirId,
        ),
      existsByCodigoProveedor: async (codigo: string, excluirId?: number) =>
        activos().some((p) => p.codigoProveedor === codigo && p.id !== excluirId),
      existsProductosActivosByMarca: async (marcaId: number) =>
        activos().some((p) => p.marcaId === marcaId),
      existsProductosActivosByLinea: async (lineaId: number) =>
        activos().some((p) => p.lineaId === lineaId),

      findBy: async (
        denominacion: string,
        _codigoProveedor: string,
        _codProveedorExacto: boolean,
        _codigoReferencia: string,
        marcaId: number,
        lineaId: number,
      ) => {
        const texto = (denominacion ?? '').toUpperCase();
        const data = activos()
          .filter((p) => p.denominacion.toUpperCase().includes(texto))
          .filter((p) => (marcaId ? p.marcaId === marcaId : true))
          .filter((p) => (lineaId ? p.lineaId === lineaId : true))
          .map(copiar);
        return { data, total: data.length };
      },

      /** Mismo criterio que el adaptador: exacto por código, o parcial por código y denominación. */
      findByRapido: async (codigo: string, exacto: boolean) => {
        const texto = (codigo ?? '').toUpperCase();
        const coincide = (p: Producto) =>
          exacto
            ? p.codigoProveedor === codigo || p.codigoReferencia === codigo
            : [p.codigoProveedor, p.codigoReferencia, p.denominacion].some(
                (campo) => (campo ?? '').toUpperCase().includes(texto),
              );
        const data = activos().filter(coincide).map(copiar);
        return { data, total: data.length };
      },

      findByIdConAuditoria: async (id: number) => {
        const guardado = productos.find((p) => p.id === id);
        return guardado ? copiar(guardado) : null;
      },

      remove: async (entity: Producto) => {
        const guardado = productos.find((p) => p.id === entity.id);
        if (guardado) {
          guardado.deletedAt = new Date();
        }
        return guardado;
      },

      /**
       * CR-006: el repositorio solo trae los productos del alcance. Quién es
       * válido y cómo cambia el precio lo decide el dominio
       * (Producto.aplicarAjustePrecio / simularAjustePrecio), invocado desde
       * la capa de aplicación.
       */
      findParaAjusteMasivo: async (
        alcance: 'linea' | 'global',
        lineaId?: number,
      ) =>
        activos()
          .filter((p) => (alcance === 'linea' ? p.lineaId === lineaId : true))
          .map(copiar),

      saveMany: async (entities: Producto[]) => entities.map(guardar),

      /**
       * CR-007: productos e historial se guardan juntos. Acá no hay
       * transacción real, pero se respeta el orden: si algo falla antes, este
       * método no se llama y no queda ni el cambio de precio ni el historial.
       */
      guardarConHistorial: async (
        productos: Producto[],
        registros: RegistroHistorial[] = [],
      ) => {
        const guardados = productos.map(guardar);
        registros.forEach((registro) => {
          registro.id = this.proximoIdHistorial++;
          registro.fecha = new Date();
          this.historial.push(registro);
        });
        return guardados;
      },
    };
  }

  private repositorioMarcas() {
    const marcas = this.marcas;
    const activas = () => marcas.filter((m) => !m.deletedAt);

    return {
      create: async (dto: { denominacion: string; observacion?: string }) => {
        const entity: EntidadSimple = {
          id: marcas.length + 1,
          denominacion: dto.denominacion,
          observacion: dto.observacion,
          sistema: 0,
          deletedAt: null,
        };
        marcas.push(entity);
        return entity;
      },
      update: async (id: number, dto: Partial<EntidadSimple>) => {
        const entity = marcas.find((m) => m.id === id) as EntidadSimple;
        Object.assign(entity, dto);
        return entity;
      },
      findOne: async (id: number) => activas().find((m) => m.id === id) ?? null,
      findByDenominacion: async (denominacion: string) =>
        activas().find((m) => m.denominacion === denominacion) ?? null,
      findByDenominacionWith: async (denominacion: string) =>
        marcas.find((m) => m.denominacion === denominacion) ?? null,
      findAllListado: async () => activas(),
      findAllFor: async () => activas(),
      findAllSinSistemaFor: async () => activas().filter((m) => !m.sistema),
      findAllSistemaFor: async () => activas().filter((m) => m.sistema === 1),
      findBy: async (denominacion: string) => {
        const texto = (denominacion ?? '').toUpperCase();
        const data = activas().filter((m) =>
          m.denominacion.toUpperCase().includes(texto),
        );
        return { data, total: data.length };
      },
      remove: async (entity: EntidadSimple) => {
        const guardada = marcas.find((m) => m.id === entity.id);
        if (guardada) {
          guardada.deletedAt = new Date();
        }
        return guardada;
      },
    };
  }

  private repositorioLineas() {
    const lineas = this.lineas;
    const activas = () => lineas.filter((l) => !l.deletedAt);

    return {
      create: async (dto: {
        denominacion: string;
        superLineaId?: number;
        stockMinimo?: number;
        utilizaStockMinimo?: boolean;
        observacion?: string;
      }) => {
        const entity: EntidadSimple = {
          id: lineas.length + 1,
          denominacion: dto.denominacion,
          observacion: dto.observacion,
          superLineaId: dto.superLineaId,
          stockMinimo: dto.stockMinimo ?? 0,
          utilizaStockMinimo: dto.utilizaStockMinimo ?? false,
          sistema: 0,
          deletedAt: null,
        };
        lineas.push(entity);
        return entity;
      },

      // CR-003: una superlínea con líneas activas no se puede eliminar.
      existsLineasActivasBySuperLinea: async (superLineaId: number) =>
        activas().some((l) => l.superLineaId === superLineaId),
      update: async (id: number, dto: Partial<EntidadSimple>) => {
        const entity = lineas.find((l) => l.id === id) as EntidadSimple;
        Object.assign(entity, dto);
        return entity;
      },
      findOne: async (id: number) => activas().find((l) => l.id === id) ?? null,
      findByDenominacionWith: async (denominacion: string) =>
        lineas.find((l) => l.denominacion === denominacion) ?? null,
      findAllListado: async () => activas(),
      findAllFor: async () => activas(),
      findByDenominacionFiltered: async (denominacion: string) => {
        const texto = (denominacion ?? '').toUpperCase();
        const data = activas().filter((l) =>
          l.denominacion.toUpperCase().includes(texto),
        );
        return { data, total: data.length };
      },
      remove: async (entity: EntidadSimple) => {
        const guardada = lineas.find((l) => l.id === entity.id);
        if (guardada) {
          guardada.deletedAt = new Date();
        }
        return guardada;
      },
    };
  }

  private repositorioSuperLineas() {
    const superLineas = this.superLineas;
    const activas = () => superLineas.filter((sl) => !sl.deletedAt);
    const igual = (a: string, b: string) =>
      (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();

    return {
      create: async (dto: { denominacion: string; observacion?: string }) => {
        const entity: EntidadSimple = {
          id: superLineas.length + 1,
          denominacion: dto.denominacion,
          observacion: dto.observacion,
          sistema: 0,
          deletedAt: null,
        };
        superLineas.push(entity);
        return entity;
      },
      update: async (id: number, dto: Partial<EntidadSimple>) => {
        const entity = superLineas.find((sl) => sl.id === id) as EntidadSimple;
        Object.assign(entity, dto);
        return entity;
      },
      delete: async (id: number) => {
        const entity = superLineas.find((sl) => sl.id === id);
        if (entity) {
          entity.deletedAt = new Date();
        }
        return entity;
      },
      findOne: async (id: number) => activas().find((sl) => sl.id === id) ?? null,
      findAll: async () => activas(),
      findAllFor: async () => activas(),
      findAllSinSistemaFor: async () => activas().filter((sl) => !sl.sistema),
      findByDenominacion: async (denominacion: string) =>
        activas().find((sl) => igual(sl.denominacion, denominacion)) ?? null,
      // Incluye las eliminadas: la denominación sigue ocupada.
      findByDenominacionWithDeleted: async (denominacion: string) =>
        superLineas.find((sl) => igual(sl.denominacion, denominacion)) ?? null,
      findByDenominacionFiltered: async (denominacion: string) => {
        const texto = (denominacion ?? '').toUpperCase();
        const data = activas().filter((sl) =>
          sl.denominacion.toUpperCase().includes(texto),
        );
        return { data, total: data.length };
      },
      findByIdConAuditoria: async (id: number) =>
        activas().find((sl) => sl.id === id) ?? null,
    };
  }

  private repositorioHistorial() {
    const historial = this.historial;

    return {
      registrar: async (
        dto: Record<string, unknown>,
        _producto: Producto,
        usuario: { denominacion?: string },
      ) => {
        const registro: RegistroHistorial = {
          ...dto,
          id: this.proximoIdHistorial++,
          productoId: dto.productoId as number,
          fecha: new Date(),
          usuario,
        };
        historial.push(registro);
        return registro;
      },
      findByProductoId: async (productoId: number, skip = 0, take = 20) => {
        const todos = historial
          .filter((h) => h.productoId === productoId)
          .sort((a, b) => b.id - a.id);
        return { data: todos.slice(skip, skip + take), total: todos.length };
      },
    };
  }
}
