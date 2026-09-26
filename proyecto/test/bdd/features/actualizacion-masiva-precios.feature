Feature: Actualización masiva de precios (CR-006)
  Como encargado comercial
  Quiero aplicar aumentos o descuentos sobre un conjunto de productos
  Para trasladar cambios de costos a la lista sin editar producto por producto

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"
    And existe la línea "GASEOSAS"
    And existe un producto de la línea "ACEITES" con precio 100
    And existe un producto de la línea "ACEITES" con precio 500
    And existe un producto de la línea "GASEOSAS" con precio 200

  @valido
  Scenario Outline: Aplicar un ajuste válido por porcentaje o por monto
    When aplico un ajuste de <valor> <tipo> a la línea "ACEITES"
    Then la operación se realiza correctamente
    And el producto de precio 100 pasa a valer <resultado 100>
    And el producto de precio 500 pasa a valer <resultado 500>

    Examples:
      | valor | tipo       | resultado 100 | resultado 500 |
      | 10    | por ciento | 110           | 550           |
      | -10   | por ciento | 90            | 450           |
      | 20    | pesos      | 120           | 520           |

  @valido
  Scenario: El ajuste por línea no afecta a los productos de otras líneas
    When aplico un ajuste de 10 por ciento a la línea "ACEITES"
    Then el producto de la línea "GASEOSAS" mantiene su precio 200
    And el resultado informa 2 productos actualizados

  @valido
  Scenario: Aplicar un ajuste a todo el catálogo
    When aplico un ajuste de 10 por ciento a todo el catálogo
    Then el producto de precio 100 pasa a valer 110
    And el producto de la línea "GASEOSAS" pasa a valer 220

  @valido
  Scenario: El margen de cada producto queda recalculado después del ajuste
    When aplico un ajuste de 10 por ciento a la línea "ACEITES"
    Then el margen de cada producto afectado refleja su nuevo precio

  @valido
  Scenario: Un ajuste sobre el costo conserva el margen del producto
    Given existe un producto de la línea "ACEITES" con costo 1000 y margen 20
    When aplico un ajuste de 10 por ciento a la línea "ACEITES"
    Then el costo de ese producto pasa a 1100
    And su margen sigue siendo 20
    And su precio pasa a 1320

  @valido
  Scenario: Asignar un margen nuevo cambia el precio sin tocar el costo
    Given existe un producto de la línea "ACEITES" con costo 1000 y margen 20
    When asigno un margen de 50 a la línea "ACEITES"
    Then el costo de ese producto sigue siendo 1000
    And su margen pasa a 50
    And su precio pasa a 1500

  @invalido
  Scenario: Un margen negativo rechaza toda la operación
    When asigno un margen de -10 a la línea "ACEITES"
    Then la operación es rechazada con el estado 400
    And ningún producto de la línea "ACEITES" cambió su precio

  @valido
  Scenario: Previsualizar un ajuste muestra el precio actual y el resultante sin modificar nada
    When previsualizo un ajuste de 10 por ciento sobre la línea "ACEITES"
    Then la previsualización muestra 2 productos afectados
    And la previsualización muestra el precio actual y el precio resultante de cada producto
    And el producto de precio 100 mantiene su precio 100

  @invalido
  Scenario: Un ajuste que dejaría algún precio en cero o negativo rechaza toda la operación
    When aplico un ajuste de -150 pesos a la línea "ACEITES"
    Then la operación es rechazada
    And ningún producto de la línea "ACEITES" cambió su precio

  @invalido
  Scenario Outline: El ajuste rechaza parámetros inválidos
    When aplico un ajuste de <valor> por ciento con alcance <alcance>
    Then la operación es rechazada con el estado <estado>

    Examples:
      | valor | alcance             | estado |
      | 0     | línea "ACEITES"     | 400    |
      | -100  | línea "ACEITES"     | 400    |
      | 10    | sin indicar la línea| 400    |
      | 10    | una línea inexistente| 404   |
