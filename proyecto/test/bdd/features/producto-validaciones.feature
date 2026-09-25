Feature: Validación de datos y cálculo del precio (CR-001)
  Como administrador de catálogo
  Quiero que el sistema rechace costos y márgenes inválidos y derive el precio del costo
  Para no generar precios de venta absurdos que terminen en una venta con pérdida

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"

  @valido
  Scenario Outline: El precio se calcula como costo más margen
    When doy de alta un producto con costo <costo> y margen <margen>
    Then el producto se guarda correctamente
    And el precio del producto es <precio>

    Examples:
      | costo | margen     | precio |
      | 1000  | 15         | 1150   |
      | 1000  | 25         | 1250   |
      | 1000  | sin margen | 1150   |

  @valido
  Scenario: Al modificar el costo el precio se recalcula solo
    Given existe un producto con costo 1000 y margen 15
    When modifico el costo del producto a 2000 con el motivo "aumento del proveedor"
    Then el precio del producto es 2300

  @invalido
  Scenario Outline: El alta rechaza costos y márgenes inválidos
    When doy de alta un producto con costo <costo> y margen <margen>
    Then la operación es rechazada con el estado 400
    And no se guarda ningún producto

    Examples:
      | costo | margen |
      | 0     | 15     |
      | -100  | 15     |
      | mil   | 15     |

  # Resuelto por el CR-001: el alta rechaza el margen negativo con el mensaje
  # "El margen no puede ser negativo". Antes el sistema respondía 201.
  @invalido
  Scenario: Un margen negativo es rechazado
    When doy de alta un producto con costo 1000 y margen -20
    Then la operación es rechazada con el estado 400
    And no se guarda ningún producto

  @invalido
  Scenario: Un producto existente conserva su costo si se intenta guardar uno inválido
    Given existe un producto con costo 1000 y margen 15
    When modifico el costo del producto a -50
    Then la operación es rechazada con el estado 400
    And el costo del producto sigue siendo 1000
    And el precio del producto sigue siendo 1150

  @invalido
  Scenario Outline: La marca y la línea son obligatorias y deben existir
    When doy de alta un producto <caso>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | caso                        | estado |
      | sin marca                   | 400    |
      | sin línea                   | 400    |
      | con una marca inexistente   | 404    |
      | con una línea inexistente   | 404    |
