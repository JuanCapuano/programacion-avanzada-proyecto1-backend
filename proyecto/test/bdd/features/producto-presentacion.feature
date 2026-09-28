Feature: Presentación del producto (CR-002)
  Como administrador de catálogo
  Quiero registrar en qué presentación se vende cada producto
  Para poder distinguir entre variantes del mismo producto que hoy se confunden entre sí

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"

  @valido
  Scenario: La presentación se guarda con su cantidad y su unidad de medida
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    Then el producto se guarda correctamente
    And la presentación del producto es 1 "l"

  @valido
  Scenario: La cantidad de la presentación admite decimales
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 1.5 "l"
    Then la presentación del producto es 1.5 "l"
    And la denominación del producto es "caroyense aceites 1.5 l"

  @valido
  Scenario: Dos productos de la misma marca y línea se distinguen por su presentación
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 2 "l"
    Then el producto se guarda correctamente
    And el listado contiene los productos "caroyense aceites 1 l" y "caroyense aceites 2 l"

  @valido
  Scenario: Se puede corregir la presentación de un producto ya cargado
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When modifico la presentación del producto a 1.5 "l"
    Then la presentación del producto es 1.5 "l"

  @valido
  Scenario: Modificar la presentación no altera el costo, el margen, el precio ni el stock
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When modifico la presentación del producto a 1.5 "l"
    Then el costo del producto sigue siendo 1000
    And el precio del producto sigue siendo 1150
    And el margen del producto sigue siendo 15
    And el stock del producto no cambió

  @invalido
  Scenario Outline: El alta rechaza presentaciones inválidas o incompletas
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación <cantidad> "<unidad>"
    Then la operación es rechazada con el estado 400
    And no se guarda ningún producto

    Examples:
      | cantidad | unidad   |
      | 0        | l        |
      | -1       | l        |
      | 1        | barriles |
      | 1        |          |
      |          | l        |
