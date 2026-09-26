# CR-006. Los escenarios siguen los criterios de aceptación de las cuatro US:
# ajuste porcentual sobre el costo, ajuste por monto fijo, asignación de un
# margen nuevo y previsualización previa a la confirmación.
# El precio nunca se envía: sale de costo y margen.

Feature: Actualización masiva de precios (CR-006)
  Como encargado comercial
  Quiero ajustar el costo o el margen de un conjunto de productos
  Para trasladar los cambios de mis proveedores y la rentabilidad sin editar producto por producto

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"
    And existe la línea "GASEOSAS"
    And existe un producto de la línea "ACEITES" con costo 80 y margen 25
    And existe un producto de la línea "ACEITES" con costo 400 y margen 25
    And existe un producto de la línea "GASEOSAS" con costo 200 y margen 25

  @valido
  Scenario Outline: Un ajuste porcentual cambia el costo y recalcula el precio
    When aplico un ajuste de <valor> por ciento a la línea "ACEITES"
    Then la operación se realiza correctamente
    And el producto de costo 80 queda con costo <costo 80> y precio <precio 80>
    And el producto de costo 400 queda con costo <costo 400> y precio <precio 400>
    And el margen de los productos ajustados sigue siendo 25

    Examples:
      | valor | costo 80 | precio 80 | costo 400 | precio 400 |
      | 10    | 88       | 110       | 440       | 550        |
      | -10   | 72       | 90        | 360       | 450        |

  @valido
  Scenario: El ajuste por línea no modifica los productos de otras líneas
    When aplico un ajuste de 10 por ciento a la línea "ACEITES"
    Then el producto de costo 200 mantiene su costo 200 y su precio 250
    And el resultado informa 2 productos actualizados

  @valido
  Scenario: El ajuste global modifica todos los productos del catálogo
    When aplico un ajuste de 10 por ciento a todo el catálogo
    Then el producto de costo 80 queda con costo 88 y precio 110
    And el producto de costo 200 queda con costo 220 y precio 275
    And el resultado informa 3 productos actualizados

  @valido
  Scenario: Sumar un monto fijo al costo de una línea
    When aplico un ajuste de 20 pesos a la línea "ACEITES"
    Then el producto de costo 80 queda con costo 100 y precio 125
    And el producto de costo 400 queda con costo 420 y precio 525
    And el margen de los productos ajustados sigue siendo 25

  @valido
  Scenario: Sumar un monto fijo a todo el catálogo
    When aplico un ajuste de 20 pesos a todo el catálogo
    Then el producto de costo 80 queda con costo 100 y precio 125
    And el producto de costo 200 queda con costo 220 y precio 275
    And el resultado informa 3 productos actualizados

  @valido
  Scenario: Asignar un margen nuevo mantiene el costo y recalcula el precio
    When asigno un margen de 40 a la línea "ACEITES"
    Then el producto de costo 80 queda con costo 80 y precio 112
    And el producto de costo 400 queda con costo 400 y precio 560
    And el margen de los productos ajustados sigue siendo 40
    And el resultado informa 2 productos actualizados

  @valido
  Scenario: Asignar un margen uniforma productos que tenían márgenes distintos
    Given existe un producto de la línea "ACEITES" con costo 100 y margen 15
    When asigno un margen de 40 a la línea "ACEITES"
    Then el producto de costo 100 queda con costo 100 y precio 140
    And el producto de costo 80 queda con costo 80 y precio 112
    And el margen de los productos ajustados sigue siendo 40

  @valido
  Scenario: Asignar un margen a todo el catálogo
    When asigno un margen de 40 a todo el catálogo
    Then el producto de costo 200 queda con costo 200 y precio 280
    And el resultado informa 3 productos actualizados

  @valido
  Scenario: Un margen de 0 deja el precio igual al costo
    When asigno un margen de 0 a la línea "ACEITES"
    Then el producto de costo 80 queda con costo 80 y precio 80
    And el producto de costo 400 queda con costo 400 y precio 400

  @valido
  Scenario: La previsualización muestra el precio actual, el resultante y el estado de cada producto
    When previsualizo un ajuste de 10 por ciento sobre la línea "ACEITES"
    Then la previsualización muestra 2 productos afectados
    And cada producto previsualizado muestra su precio actual, su precio resultante y su estado
    And el producto de costo 80 se previsualiza con precio actual 100 y precio resultante 110

  @valido
  Scenario: Previsualizar no modifica ningún producto
    When previsualizo una asignación de margen de 40 sobre la línea "ACEITES"
    Then la previsualización muestra 2 productos afectados
    And el producto de costo 80 mantiene su costo 80 y su precio 100
    And el producto de costo 400 mantiene su costo 400 y su precio 500

  @invalido
  Scenario: La previsualización marca inválido el producto que quedaría con costo en cero o menos
    Given existe un producto de la línea "ACEITES" con costo 12 y margen 25
    When previsualizo un ajuste de -20 pesos sobre la línea "ACEITES"
    Then la previsualización muestra 3 productos afectados
    And el producto de costo 12 se previsualiza como inválido
    And la previsualización informa 1 producto inválido de 3

  @invalido
  Scenario Outline: La previsualización rechaza valores que no producen un cambio válido
    When previsualizo <ajuste> sobre la línea "ACEITES"
    Then la operación es rechazada con el estado 400

    Examples:
      | ajuste                           |
      | un ajuste de 0 por ciento        |
      | un ajuste de 0 pesos             |
      | un ajuste de -100 por ciento     |
      | una asignación de margen de -10  |

  @invalido
  Scenario: Un ajuste que dejaría un costo en cero o menos rechaza toda la operación
    When aplico un ajuste de -100 pesos a la línea "ACEITES"
    Then la operación es rechazada
    And el producto de costo 80 mantiene su costo 80 y su precio 100
    And el producto de costo 400 mantiene su costo 400 y su precio 500

  @invalido
  Scenario: Asignar un margen negativo rechaza toda la operación
    When asigno un margen de -10 a la línea "ACEITES"
    Then la operación es rechazada con el estado 400
    And el producto de costo 80 mantiene su costo 80 y su precio 100

  @invalido
  Scenario Outline: El ajuste rechaza un alcance mal indicado
    When aplico un ajuste de 10 por ciento con alcance <alcance>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | alcance               | estado |
      | sin indicar la línea  | 400    |
      | una línea inexistente | 404    |
