# CR-004 · PARCIALMENTE IMPLEMENTADO.
# Hoy la búsqueda admite coincidencias parciales sobre la denominación (insensible
# a mayúsculas) y filtros por marca y línea. La búsqueda por nombre de línea o de
# superlínea todavía no existe: esos escenarios quedan marcados como @pendiente.

Feature: Búsqueda de productos (CR-004)
  Como administrador de catálogo
  Quiero buscar productos escribiendo parte de la denominación o filtrando por categoría
  Para encontrar lo que necesito sin recorrer el listado completo

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"
    And existe la línea "GASEOSAS"
    And existe un producto llamado "aceite de oliva 1 l" de la línea "ACEITES"
    And existe un producto llamado "gaseosa cola 1.5 l" de la línea "GASEOSAS"

  @valido
  Scenario Outline: La búsqueda por denominación admite coincidencias parciales sin distinguir mayúsculas
    When busco productos que contengan "<texto>"
    Then el listado contiene el producto "aceite de oliva 1 l"
    And el listado no contiene el producto "gaseosa cola 1.5 l"

    Examples:
      | texto |
      | oliva |
      | OLIVA |
      | OlIvA |

  @valido
  Scenario: Filtrar los productos por línea
    When filtro los productos por la línea "GASEOSAS"
    Then el listado contiene el producto "gaseosa cola 1.5 l"
    And el listado no contiene el producto "aceite de oliva 1 l"

  @valido
  Scenario: Combinar el texto de búsqueda con el filtro de línea
    Given existe un producto llamado "aceite de girasol 1 l" de la línea "ACEITES"
    When busco productos que contengan "aceite" y filtro por la línea "ACEITES"
    Then el listado contiene 2 productos

  @valido
  Scenario: El resultado informa la cantidad de productos encontrados
    When busco productos que contengan "aceite"
    Then el listado informa el total de productos encontrados

  @valido
  Scenario: Una búsqueda sin coincidencias devuelve un listado vacío
    When busco productos que contengan "zzzz"
    Then el listado contiene 0 productos
    And el listado informa el total 0

  @pendiente @valido
  Scenario: Buscar productos por el nombre de su línea
    When busco productos que contengan "gaseosas"
    Then el listado contiene el producto "gaseosa cola 1.5 l"

  @pendiente @valido
  Scenario: Buscar productos por el nombre de su superlínea
    Given existe la superlínea "ALMACEN" con la línea "ACEITES"
    When busco productos que contengan "almac"
    Then el listado contiene el producto "aceite de oliva 1 l"
