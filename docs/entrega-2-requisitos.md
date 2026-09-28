# Entrega 2 — Mantenimiento Evolutivo

Fecha de entrega: **23/09/2026**. Documentación debe entregarse 48hs antes vía campus.

## Qué exige la entrega
- Análisis de dominio actualizado con el impacto de los CRs (nuevas entidades, VOs, agregados, reglas)
- Event Storming (obligatorio): eventos en pasado, comandos, reglas de negocio implícitas
- Historias de usuario derivadas de cada CR, con criterios de aceptación
- Desarrollo respetando DDD y separación de capas; refactor y justificación de deuda técnica
- Testing automatizado (Jest+Supertest backend, Vitest/RTL frontend); se valora testear reglas de negocio, no solo endpoints
- Plan de proyecto con evidencia (tablero), historial de Git prolijo, retrospectiva
- Trazabilidad: Event Storming → historias de usuario → implementación final

## Change Requests (CRs)

| Código | Descripción |
|---|---|
| CR-001 | Validación de datos: evitar valores inválidos, errores claros, no permitir guardar datos incorrectos |
| CR-002 | Presentación del producto (ej: 1L, pack) |
| CR-003 | SuperLínea: una Línea pasa a pertenecer a una SuperLínea |
| CR-004 | Búsqueda por Denominación/Línea/SuperLínea, con coincidencias parciales |
| CR-005 | Denominación automática (Marca+Línea+Presentación, editable). Depende de CR-002 |
| CR-006 | **Actualización masiva de precios**, por porcentaje o monto, por línea o global |
| CR-007 | Historial de precios: precio anterior, nuevo, fecha, motivo. Validar precio > 0 |

## User Story Actualización masiva de precios (porcentaje)
US:
Como encargado comercial quiero aplicar un aumento o descuento porcentual sobre un conjunto de productos para trasladar cambios de costos a la lista sin editar producto por producto.
Criterios de aceptacion: 
Dado un producto con precio $100, cuando aplico +10% sobre su línea, entonces su precio pasa a $110. 
Dado un producto con precio $100, cuando aplico −10%, entonces su precio pasa a $90. 
Dado que selecciono alcance "por línea", cuando aplico la actualización, entonces sólo se modifican los productos de esa línea y ningún otro. 
Dado que selecciono alcance "global", cuando aplico la actualización, entonces se modifican todos los productos del catálogo. 
Dado un porcentaje que dejaría algún precio en 0 o menos, cuando intento aplicarlo, entonces la operación se rechaza por completo y ningún producto queda modificado. 
Dado que aplico una actualización masiva, cuando finaliza, entonces el sistema informa cuántos productos fueron actualizados. 
Dado que aplico una actualización masiva, cuando finaliza, entonces el margen de cada producto afectado queda recalculado de modo que precio = costo × (1 + margen) sigue siendo verdadero. 
## User Story Actualización masiva de precios (monto)
US:
Como encargado comercial quiero sumar o restar un monto fijo a los precios de un conjunto de productos para trasladar costos que no son proporcionales al precio.
Criterios de aceptación:
Dado un producto con precio $100, cuando aplico +$20, entonces su precio pasa a $120. 
Dado productos con precios $100 y $500, cuando aplico +$20 global, entonces quedan en $120 y $520 respectivamente. 
Dado un producto con precio $15, cuando aplico −$20, entonces la operación completa se rechaza y ningún producto del lote se modifica. 
Dado que aplico un monto igual a 0, cuando confirmo, entonces la operación se rechaza por no producir cambios. 
Dado una actualización por monto aplicada, cuando consulto el producto, entonces el margen persistido refleja el margen implícito resultante del nuevo precio. 



## Análisis obligatorio a responder en el informe
- ¿Qué nuevos conceptos aparecen en el dominio a partir de los CRs?
- ¿Qué elementos son entidades y cuáles Value Objects? Justificar.
- ¿Qué cambios corresponden al dominio y cuáles son simples consultas?
- ¿Dónde se ubican las reglas de negocio en el código?
- ¿Qué servicios de dominio son necesarios?
- ¿El precio se guarda o se calcula? Justificar.

## Rúbrica (pesos)

| Criterio | Peso |
|---|---|
| Análisis de Dominio | 25% |
| Event Storming | 15% |
| Historias de Usuario | 15% |
| Implementación (DDD, capas, reglas fuera de controllers) | 20% |
| Testing (cobertura ≥70% o justificada) | 10% |
| Ingeniería de Software (métricas, plan de proyecto, Git prolijo) | 10% |
| Deuda Técnica | 5% |

## Uso de IA (obligatorio documentar)
Permitido y recomendado, pero hay que documentar: prompts usados, respuestas obtenidas, decisiones tomadas (qué se usó/descartó y por qué), modificaciones sobre lo generado, y el link al historial de conversación cuando la herramienta lo permita.
