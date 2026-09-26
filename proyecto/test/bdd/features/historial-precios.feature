Feature: Historial de precios (CR-007)
  Como encargado comercial
  Quiero que cada cambio de precio quede registrado sin que nadie tenga que anotarlo
  Para poder auditar después por qué un producto llegó al precio que tiene

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"
    And existe un producto con costo 1000 y margen 15

  @valido
  Scenario: Cambiar el costo registra el cambio de precio con su motivo
    When actualizo el precio del producto con costo 2000 y motivo "Aumento del proveedor"
    Then el historial del producto tiene 1 registro
    And el registro indica precio anterior 1150 y precio nuevo 2300
    And el registro tiene fecha y el motivo "Aumento del proveedor"

  @valido
  Scenario: Cambiar el margen también queda registrado
    When actualizo el precio del producto con margen 25 y motivo "Ajuste de rentabilidad"
    Then el historial del producto tiene 1 registro
    And el registro indica precio anterior 1150 y precio nuevo 1250

  @valido
  Scenario: Guardar el mismo precio no genera un registro nuevo
    When actualizo el precio del producto con costo 1000 y motivo "Sin cambios"
    Then el historial del producto no tiene registros

  @valido
  Scenario: El historial se consulta del cambio más reciente al más antiguo
    Given actualizo el precio del producto con costo 2000 y motivo "Primer aumento"
    And actualizo el precio del producto con costo 3000 y motivo "Segundo aumento"
    When consulto el historial del producto
    Then el historial del producto tiene 2 registros
    And el primer registro del listado tiene el motivo "Segundo aumento"
    And cada registro muestra fecha, precio anterior, precio nuevo y motivo

  @valido
  Scenario: Un producto sin cambios de precio no tiene historial
    When consulto el historial del producto
    Then el historial del producto no tiene registros

  @valido
  Scenario: Editar un dato que no afecta al precio no genera historial
    When modifico el stock mínimo del producto
    Then la modificación se guarda correctamente
    And el historial del producto no tiene registros

  @invalido
  Scenario Outline: El historial es de sólo lectura
    When intento <accion> un registro del historial
    Then la operación no está disponible

    Examples:
      | accion   |
      | modificar |
      | borrar    |

  # Resuelto por el CR-007: la actualización masiva arma el historial de cada
  # producto cuyo precio cambió y lo guarda en la misma transacción.
  @valido
  Scenario: Una actualización masiva registra el cambio de cada producto afectado
    Given existe otro producto de la línea "ACEITES" con costo 2000 y margen 15
    When aplico un aumento del 10 por ciento a la línea "ACEITES"
    Then el historial del primer producto tiene 1 registro
    And el historial del segundo producto tiene 1 registro

  @invalido
  Scenario Outline: Un cambio de precio inválido es rechazado y no se registra
    When actualizo el precio del producto <caso>
    Then la operación es rechazada con el estado 400
    And el historial del producto no tiene registros
    And el precio del producto sigue siendo 1150

    Examples:
      | caso                                     |
      | con costo 0 y motivo "Error de carga"    |
      | con costo 2000 y sin motivo              |

