# CR-003 · IMPLEMENTADO en develop (módulo super-linea: entidad, servicio y
# endpoints; toda línea cuelga hoy de una superlínea).
# Los escenarios quedan como pendientes porque el contexto de estas pruebas
# todavía no levanta el controlador de superlínea ni su repositorio en memoria:
# falta cablearlos, no la funcionalidad. Se derivan de los criterios de
# aceptación de las US 5, 6 y 7 y no cuentan como aprobados.

@pendiente
Feature: SuperLínea (CR-003)
  Como administrador de catálogo
  Quiero agrupar líneas relacionadas dentro de una SuperLínea
  Para analizar el catálogo por categorías amplias sin que ningún producto quede fuera de la jerarquía

  Background:
    Given existe la superlínea "ALMACEN"
    And existe la línea "ACEITES" de la superlínea "ALMACEN"

  @pendiente @valido
  Scenario: Dar de alta una superlínea
    When doy de alta la superlínea "BEBIDAS"
    Then la superlínea se guarda correctamente
    And la superlínea "BEBIDAS" queda disponible para asignar a una línea

  @pendiente @valido
  Scenario: Renombrar una superlínea conserva sus líneas asociadas
    When modifico la superlínea "ALMACEN" con la denominación "ALMACEN GENERAL"
    Then la línea "ACEITES" sigue perteneciendo a la superlínea "ALMACEN GENERAL"

  @pendiente @valido
  Scenario: Reasignar una línea a otra superlínea
    Given existe la superlínea "BEBIDAS"
    When asigno la línea "ACEITES" a la superlínea "BEBIDAS"
    Then la línea "ACEITES" pertenece únicamente a la superlínea "BEBIDAS"

  @pendiente @valido
  Scenario: El listado de precios se agrupa por superlínea y línea
    Given existe la marca "CAROYENSE"
    And existe un producto de la marca "CAROYENSE" y línea "ACEITES"
    When consulto el listado de precios agrupado
    Then los productos aparecen agrupados primero por superlínea y dentro de ella por línea
    And cada producto muestra denominación, presentación, costo, margen y precio

  @pendiente @invalido
  Scenario Outline: El alta de la superlínea rechaza denominaciones inválidas o repetidas
    When doy de alta la superlínea con el valor <valor>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | valor   | estado |
      | vacío   | 400    |
      | ALMACEN | 409    |

  @pendiente @invalido
  Scenario: La superlínea es obligatoria al dar de alta una línea
    When doy de alta la línea "GASEOSAS" sin superlínea
    Then la operación es rechazada con el estado 400

  @pendiente @invalido
  Scenario: No se puede eliminar una superlínea con líneas asignadas
    When elimino la superlínea "ALMACEN"
    Then la operación es rechazada con el estado 409
    And la superlínea "ALMACEN" sigue existiendo
