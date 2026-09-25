Feature: Gestión de líneas de producto
  Como administrador de catálogo
  Quiero dar de alta, modificar y eliminar líneas
  Para agrupar los productos por categoría y definir su stock mínimo

  Background:
    Given existe la línea "ACEITES"

  @valido
  Scenario: Dar de alta, modificar y eliminar una línea
    When doy de alta la línea "GASEOSAS"
    Then la línea se guarda correctamente
    When modifico la línea "GASEOSAS" con la denominación "BEBIDAS"
    Then la línea "BEBIDAS" figura en el listado de líneas
    When elimino la línea "BEBIDAS"
    Then la línea "BEBIDAS" no figura en el listado de líneas

  @valido
  Scenario: Dar de alta una línea con stock mínimo
    When doy de alta la línea "GASEOSAS" con stock mínimo 10
    Then la línea se guarda correctamente
    And la línea "GASEOSAS" tiene stock mínimo 10

  @invalido
  Scenario: No se puede eliminar una línea con productos activos
    Given existe la marca "CAROYENSE"
    And existe un producto de la marca "CAROYENSE" y línea "ACEITES"
    When elimino la línea "ACEITES"
    Then la operación es rechazada con el estado 409
    And la línea "ACEITES" figura en el listado de líneas

  @invalido
  Scenario Outline: El alta rechaza denominaciones inválidas o repetidas
    When doy de alta la línea con el valor <valor>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | valor          | estado |
      | vacío          | 400    |
      | solo espacios  | 400    |
      | ACEITES        | 409    |
