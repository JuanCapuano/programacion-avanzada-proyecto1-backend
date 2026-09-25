Feature: Denominación automática del producto (CR-005)
  Como administrador de catálogo
  Quiero que la denominación se arme sola a partir de la marca, la línea y la presentación
  Para que el catálogo tenga nombres consistentes y no dependa de cómo escribe cada persona

  Background:
    Given existe la marca "CAROYENSE"
    And existe la marca "CIRCE"
    And existe la línea "ACEITES"

  @valido
  Scenario: La denominación se genera a partir de marca, línea y presentación
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 1.5 "l"
    Then el producto se guarda correctamente
    And la denominación del producto es "caroyense aceites 1.5 l"
    And el origen de la denominación es "AUTOMATICA"

  @valido
  Scenario: La denominación se puede previsualizar antes de guardar
    When previsualizo la denominación de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    Then la denominación previsualizada es "caroyense aceites 1 l"
    And no se guarda ningún producto

  @valido
  Scenario: La previsualización se actualiza al cambiar un componente
    Given previsualizo la denominación de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When previsualizo la denominación de la marca "CIRCE", línea "ACEITES" y presentación 1 "l"
    Then la denominación previsualizada es "circe aceites 1 l"

  @valido
  Scenario: La denominación previsualizada es la que después se guarda
    Given previsualizo la denominación de la marca "CAROYENSE", línea "ACEITES" y presentación 2 "l"
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 2 "l"
    Then la denominación del producto es igual a la previsualizada

  @valido
  Scenario: El usuario puede escribir su propia denominación al dar de alta
    When doy de alta un producto llamado "Aceite Premium" de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    Then el producto se guarda correctamente
    And la denominación del producto es "aceite premium"
    And el origen de la denominación es "MANUAL"

  @valido
  Scenario: Cambiar la marca regenera una denominación automática
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When cambio la marca del producto a "CIRCE" y reenvío su denominación actual
    Then la denominación del producto es "circe aceites 1 l"
    And el origen de la denominación es "AUTOMATICA"

  @valido
  Scenario: La denominación manual no se sobrescribe y puede restaurarse
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    And renombro el producto como "Aceite Premium"
    Then el origen de la denominación es "MANUAL"
    When cambio la marca del producto a "CIRCE" y reenvío su denominación actual
    Then la denominación del producto es "aceite premium"
    When restauro la denominación automática del producto
    Then la denominación del producto es "circe aceites 1 l"
    And el origen de la denominación es "AUTOMATICA"

  @valido
  Scenario: La consulta del producto informa si su denominación es automática o manual
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    And renombro el producto como "Aceite Premium"
    When consulto el producto por su identificador
    Then la respuesta indica el origen de la denominación "MANUAL"

  @invalido
  Scenario Outline: La denominación editada no puede quedar vacía ni superar los 200 caracteres
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When renombro el producto con el valor <valor>
    Then la operación es rechazada con el estado 400
    And la denominación del producto es "caroyense aceites 1 l"

    Examples:
      | valor          |
      | vacío          |
      | solo espacios  |
      | 250 caracteres |

  @invalido
  Scenario: No pueden existir dos productos con la misma denominación
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When doy de alta un producto de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    Then la operación es rechazada con el estado 409

  @invalido
  Scenario: No se puede restaurar una denominación que ya usa otro producto
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    And renombro el producto como "Aceite Premium"
    And existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When restauro la denominación automática del producto renombrado
    Then la operación es rechazada con el estado 409
    And la denominación del producto renombrado sigue siendo "aceite premium"

  @invalido
  Scenario: No se puede previsualizar con una marca inexistente
    When previsualizo la denominación de una marca inexistente, línea "ACEITES" y presentación 1 "l"
    Then la operación es rechazada con el estado 404
