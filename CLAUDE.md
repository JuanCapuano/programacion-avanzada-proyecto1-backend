# Distribuidora BV — Guía para Claude Code

## Stack

- **Backend** (este repo): NestJS 11 + TypeScript + TypeORM 0.3 + MySQL 8.
- **Frontend** (repo hermano `../Frontend`): React + Vite.
- Autenticación JWT + `AuthGuard` + `@Roles(...)`. Documentación API con Swagger en `/api`.

## Arquitectura por capas

Cada entidad de dominio (ej. `producto`, `linea`, `marca`) sigue el mismo flujo de capas, de arriba hacia abajo:

1. **Controller** (`application/controllers/*.controller.ts`) — expone endpoints REST, aplica `@Roles()`, pipes de normalización y delega todo al Service. No contiene lógica.
2. **Service** (`application/services/*.service.ts`) — orquesta el caso de uso: llama validadores en orden, invoca al repositorio y arma la respuesta. No accede a TypeORM directamente.
3. **Interfaz de Repository** (`domain/interfaces/*.repository-interface.ts`, ej. `IProductoRepository`) — contrato que el Service consume, inyectado con `@Inject('IProductoRepository')`. Define el límite entre dominio e infraestructura.
4. **Repository concreto** (`infraestructure/repositories/*.repository.ts`, ej. `ProductoRepository`) — implementa la interfaz, delega cada método al `PersistenceAdapter` y traduce errores técnicos a excepciones propias (ej. `DatabaseConnectionException`). No valida ni contiene reglas de negocio.
5. **PersistenceAdapter** (`infraestructure/repositories/*.persistence-adapters.ts`, ej. `ProductoPersistenceAdapter`) — hace el trabajo real contra TypeORM (`createQueryBuilder`, `save`, etc.).

### Puntos importantes sobre las abstracciones

- Entre **Service ↔ Repository** SÍ existe una interfaz (`IProductoRepository`, `ILineaRepository`, etc.), inyectada por token string (`@Inject('IProductoRepository')`) y registrada en el `*.module.ts` con `{ provide: 'IProductoRepository', useClass: ProductoRepository }`.
- Entre **Repository concreto ↔ PersistenceAdapter** **NO** hay interfaz intermedia: el Repository simplemente recibe el `PersistenceAdapter` por constructor (inyección de clase concreta, no de token) y delega cada llamada 1 a 1.
- El **PersistenceAdapter** es la única capa donde aparece el decorador `@Transactional()` (patrón Unit of Work). Dentro de un método `@Transactional()`, el repo de TypeORM se obtiene con `this.uow.getRepository(Entidad)` en lugar del repo inyectado por `@InjectRepository`, para que quede dentro de la misma transacción.

## Validaciones: dos carpetas, dos responsabilidades

- **`domain/services/`** (ej. `ProductoIntrinsicValidationService`, `ProductoValidationService`): reglas que **no** tocan la base de datos — formato, rangos, jerarquía de precios, si una entidad ya cargada es "de sistema", etc. Reciben datos u entidades ya obtenidas, nunca hacen queries.
- **`infraestructure/validators/`** (ej. `ProductoRelatedEntitiesValidator`, `ProductoUniquenessValidator`): reglas que **sí** consultan la base de datos — existencia de entidades relacionadas, unicidad de denominación/código. Inyectan el Service de la entidad relacionada o la interfaz de repositorio.

El **Service nunca valida directamente**: solo orquesta, llamando a estos validators en un orden fijo. Ejemplo real, `ProductoService.create()` (vía `validarYPrepararCreacion`):

```ts
// 1. Datos intrínsecos (Domain — sin DB)
this.intrinsicValidationService.validarDatosBasicos({ denominacion, marcaId, lineaId, alicuotaIva });

// 2. Unicidad (Infrastructure — DB)
await this.uniquenessValidator.validarDenominacionUnica(dto.denominacion);
if (dto.codigoProveedor) {
  await this.uniquenessValidator.validarCodigoProveedorUnico(dto.codigoProveedor, 0);
}

// 3. Entidades relacionadas existen (Infrastructure — DB)
const { marca, linea } = await this.relatedEntitiesValidator.validarYObtenerEntidadesRelacionadas(dto.marcaId, dto.lineaId);

// 4. Reglas de negocio sobre esas entidades ya obtenidas (Domain)
this.validationService.validarEntidadesRelacionadas(marca, linea);

// 5. Usuario existe (Infrastructure)
const usuario = await this.usuarioValidator.validarUsuarioExiste(dto.usuarioCreatedId);

// Recién acá el Service llama al repository.create(...)
```

Al agregar una entidad nueva o un caso de uso nuevo, replicar este mismo orden: intrínsecas → unicidad → entidades relacionadas → reglas cruzadas → usuario → persistencia.

## Convenciones repetidas en el código

- **Logging**: cada clase (`Controller`, `Service`, `Repository`, `PersistenceAdapter`) define `private readonly logger = new Logger(NombreDeClase.name)` y loguea con `this.logger.log/warn/error`.
- **Autorización**: cada endpoint declara `@Roles('Root', 'Administrador', ...)` sobre `AuthGuard` aplicado a nivel de controller.
- **Respuestas de mutación**: `create`, `update`, `remove` devuelven `MessageFrontUtils.createSimple(entidad, valor, accion)` (`src/modules/common/utils/message/message-front.util.ts`) en lugar de armar el mensaje a mano.
- **Pipes de normalización**: `NormalizeDenominacionPipe`, `NormalizeCodigoProveedorPipe`, `NormalizeDenominacionSearchPipe` (`src/modules/common/pipes/`) se aplican con `@UsePipes(...)` en los endpoints que reciben esos campos, en vez de normalizar manualmente en el Service.
- **Excepciones de infraestructura**: `DatabaseConnectionException` y `EntityNotFoundException` (`src/modules/common/exceptions/`) son las que lanza la capa de persistencia; el Repository las deja pasar o las relanza, nunca las traduce a HTTP directamente (eso lo maneja el filtro global de excepciones).
- **Módulos**: cada entidad tiene su `*.module.ts` que registra `TypeOrmModule.forFeature([Entidad])`, el binding de la interfaz al Repository, el provider `'UnitOfWork'` (factory sobre `TypeOrmUnitOfWork`) y exporta el Service + la interfaz para que otros módulos la consuman vía `forwardRef` cuando hay dependencia circular (ej. `producto` ↔ `marca`).
- **Cálculo de precio**: `Producto.calcularPrecio()` (domain) es la única fuente de verdad para `precio = costo + (costo * porcentaje / 100)`. `ProductoPersistenceAdapter` la invoca antes de cada `save()` en `create()`/`update()`, así el valor persistido nunca depende de lo que venga cargado en el DTO. El flujo previo (`ProductoRepository.actualizarPrecio` → `ProductoPersistenceAdapter.actualizarPrecio` → `ProductoMapper.mapPrecios`) quedó comentado (no borrado) como referencia histórica; no está wireado a ningún endpoint. La actualización masiva de precios (CR-006) es un desarrollo aparte, todavía no implementado.

## Documentación de referencia

- [`docs/analisis-dominio.md`](docs/analisis-dominio.md) — reglas de negocio y modelo de dominio. Consultar antes de tocar validaciones o entidades.
- [`docs/entrega-2-requisitos.md`](docs/entrega-2-requisitos.md) — Change Requests y requisitos de la entrega actual. Consultar antes de implementar features nuevas.


## Convenciones de Git
- Nunca agregar "Co-Authored-By: Claude" ni ninguna firma de IA a los mensajes de commit.
