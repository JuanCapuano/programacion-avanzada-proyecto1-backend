# CR-001 · US-2 · NO IMPLEMENTADO en la rama develop.
# El servicio tiene incrementarStock() y decrementarStock(), pero ningún endpoint
# los expone y no existe el concepto de "ajuste de stock con motivo". Los escenarios
# se derivan de los criterios de aceptación de la US 2 para dejarlos documentados
# y listos para ejecutarse cuando la funcionalidad se implemente.

@pendiente
Feature: Ajustes de stock (CR-001 · US-2)
  Como responsable de depósito
  Quiero que el sistema me impida registrar stocks inválidos y exija un motivo en cada ajuste
  Para corregir el dato en el momento y poder auditar después por qué cambió el stock

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"
    And existe un producto con stock 5

  @pendiente @valido
  Scenario: Registrar un ajuste de stock con su motivo
    When ajusto el stock del producto a 8 con motivo "Inventario físico"
    Then el stock del producto es 8
    And el ajuste queda registrado con el motivo "Inventario físico"

  @pendiente @valido
  Scenario: Registrar una salida de stock dentro de lo disponible
    When registro una salida de 3 unidades del producto
    Then el stock del producto es 2

  @pendiente @invalido
  Scenario: El stock no puede quedar negativo
    When ajusto el stock del producto a -1 con motivo "Error de carga"
    Then la operación es rechazada con el estado 400
    And el stock del producto sigue siendo 5

  @pendiente @invalido
  Scenario: No se puede registrar una salida mayor al stock disponible
    When registro una salida de 8 unidades del producto
    Then la operación es rechazada con el estado 400
    And el stock del producto sigue siendo 5

  @pendiente @invalido
  Scenario Outline: El motivo del ajuste es obligatorio
    When ajusto el stock del producto a 8 con motivo <motivo>
    Then la operación es rechazada con el estado 400
    And el stock del producto sigue siendo 5

    Examples:
      | motivo        |
      | vacío         |
      | solo espacios |
