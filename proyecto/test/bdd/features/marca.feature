Feature: Gestión de marcas
  Como administrador de catálogo
  Quiero dar de alta, modificar y eliminar marcas
  Para clasificar los productos por su fabricante sin duplicar ni perder información

  Background:
    Given existe la marca "CAROYENSE"

  @valido
  Scenario: Dar de alta, modificar y eliminar una marca
    When doy de alta la marca "ARCOR"
    Then la marca se guarda correctamente
    When modifico la marca "ARCOR" con la denominación "ARCOR SA"
    Then la marca "ARCOR SA" figura en el listado de marcas
    When elimino la marca "ARCOR SA"
    Then la marca "ARCOR SA" no figura en el listado de marcas

  @valido
  Scenario: Buscar marcas por coincidencia parcial de la denominación
    Given existe la marca "CAROYENSE SA"
    And existe la marca "ARCOR"
    When busco marcas que contengan "caroy"
    Then el listado contiene 2 marcas
    And el listado no contiene la marca "ARCOR"

  @invalido
  Scenario: No se puede eliminar una marca con productos activos
    Given existe la línea "ACEITES"
    And existe un producto de la marca "CAROYENSE" y línea "ACEITES"
    When elimino la marca "CAROYENSE"
    Then la operación es rechazada con el estado 409
    And la marca "CAROYENSE" figura en el listado de marcas

  @invalido
  Scenario Outline: El alta rechaza denominaciones inválidas o repetidas
    When doy de alta la marca con el valor <valor>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | valor          | estado |
      | vacío          | 400    |
      | solo espacios  | 400    |
      | CAROYENSE      | 409    |
