Feature: Baja y consultas de productos
  Como administrador de catálogo
  Quiero dar de baja productos y encontrarlos rápido desde el mostrador
  Para mantener el catálogo ordenado y poder operar sin recorrer listados largos

  Background:
    Given existe la marca "CAROYENSE"
    And existe la línea "ACEITES"

  # ---------------------------- Baja de productos ----------------------------

  @valido
  Scenario: Dar de baja un producto
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When elimino el producto
    Then la baja se realiza correctamente
    And el producto no figura en el listado

  @invalido
  Scenario: No se puede dar de baja un producto del sistema
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    And el producto está marcado como del sistema
    When elimino el producto
    Then la operación es rechazada con el estado 403
    And el producto figura en el listado

  @invalido
  Scenario: No se puede dar de baja un producto inexistente
    When elimino el producto con identificador 999
    Then la operación es rechazada con el estado 404

  # ------------------------- Búsqueda rápida por código ----------------------

  @valido
  Scenario: Buscar un producto por su código exacto de proveedor
    Given existe un producto con código de proveedor "ABC-1234"
    And existe un producto con código de proveedor "XYZ-9999"
    When busco en modo rápido el código exacto "abc-1234"
    Then el listado rápido contiene 1 producto

  @valido
  Scenario: La búsqueda rápida parcial también mira la denominación
    Given existe un producto con código de proveedor "ABC-1234"
    And existe un producto con código de proveedor "XYZ-9999"
    When busco en modo rápido el texto parcial "caroyense"
    Then el listado rápido contiene 2 productos

  @valido
  Scenario: Una búsqueda rápida sin coincidencias no devuelve resultados
    Given existe un producto con código de proveedor "ABC-1234"
    When busco en modo rápido el texto parcial "zzzz"
    Then el listado rápido contiene 0 productos

  # ------------------------------- Auditoría ---------------------------------

  @valido
  Scenario: Consultar la auditoría de un producto
    Given existe un producto automático de la marca "CAROYENSE", línea "ACEITES" y presentación 1 "l"
    When consulto la auditoría del producto
    Then la auditoría indica el detalle "Producto caroyense aceites 1 l"
    And la auditoría informa el usuario que lo creó

  @invalido
  Scenario: Consultar un producto inexistente
    When consulto el producto con identificador 999
    Then la operación es rechazada con el estado 404

  @valido
  Scenario: Consultar una marca por su identificador
    When consulto la marca "CAROYENSE" por su identificador
    Then la respuesta contiene la denominación "CAROYENSE"

  # ------------------- Selectores de marcas y líneas del alta ----------------

  @valido
  Scenario: Obtener las marcas disponibles para el selector del formulario
    Given existe la marca "ARCOR"
    When consulto las marcas disponibles para el selector
    Then el selector contiene 2 marcas

  @valido
  Scenario: Obtener las líneas disponibles para el selector del formulario
    Given existe la línea "GASEOSAS"
    When consulto las líneas disponibles para el selector
    Then el selector contiene 2 líneas
