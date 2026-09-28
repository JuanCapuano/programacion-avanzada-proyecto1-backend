import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/producto-baja-y-consultas.feature'),
);

const USUARIO_ID = 9;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  async function altaDeProducto(
    marca: string,
    linea: string,
    cantidad: number,
    unidad: string,
    codigoProveedor?: string,
  ) {
    const cuerpo: Record<string, unknown> = {
      marcaId: ctx.idMarca(marca),
      lineaId: ctx.idLinea(linea),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo: 1000,
      presentacionCantidad: cantidad,
      presentacionUnidad: unidad,
    };
    if (codigoProveedor !== undefined) {
      cuerpo.codigoProveedor = codigoProveedor;
    }
    ctx.respuesta = await ctx.http.post('/producto').send(cuerpo);
    expect(ctx.respuesta.status).toBe(201);
  }

  async function listado() {
    return ctx.http.get('/producto/search-by?skip=0&take=50');
  }

  function pasosDeFondo(given: any, and: any) {
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
    and(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
  }

  function pasoProductoAutomatico(paso: any) {
    paso(
      /^existe un producto automático de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, Number(cantidad), unidad);
      },
    );
  }

  function pasoProductoConCodigo(paso: any) {
    paso(
      /^existe un producto con código de proveedor "(.*)"$/,
      async (codigo: string) => {
        await altaDeProducto(
          'CAROYENSE',
          'ACEITES',
          ctx.productos.length + 1,
          'l',
          codigo,
        );
      },
    );
  }

  function pasoEliminarProducto(paso: any) {
    paso(/^elimino el producto$/, async () => {
      ctx.respuesta = await ctx.http.delete(
        `/producto/${ctx.ultimoProducto.id}?usuarioId=${USUARIO_ID}`,
      );
    });
  }

  function pasoBusquedaRapida(paso: any, exacto: boolean) {
    const patron = exacto
      ? /^busco en modo rápido el código exacto "(.*)"$/
      : /^busco en modo rápido el texto parcial "(.*)"$/;
    paso(patron, async (codigo: string) => {
      ctx.respuesta = await ctx.http.get(
        `/producto/search-by-rapido?skip=0&take=50&exacto=${exacto}&codigo=${encodeURIComponent(codigo)}`,
      );
    });
  }

  function verificarListadoRapido(paso: any) {
    paso(
      /^el listado rápido contiene (\d+) productos?$/,
      (cantidad: string) => {
        expect(ctx.respuesta.status).toBe(200);
        expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
      },
    );
  }

  function verificarRechazo(paso: any) {
    paso(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
  }

  // ------------------------------------------------------------ escenarios

  test('Dar de baja un producto', ({ given, and, when, then }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoEliminarProducto(when);

    then(/^la baja se realiza correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(200);
    });
    and(/^el producto no figura en el listado$/, async () => {
      const listadoActual = await listado();
      expect(listadoActual.body.data).toHaveLength(0);
    });
  });

  test('No se puede dar de baja un producto del sistema', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);

    and(/^el producto está marcado como del sistema$/, () => {
      ctx.ultimoProducto.sistema = 1;
    });

    pasoEliminarProducto(when);
    verificarRechazo(then);
    and(/^el producto figura en el listado$/, async () => {
      const listadoActual = await listado();
      expect(listadoActual.body.data).toHaveLength(1);
    });
  });

  test('No se puede dar de baja un producto inexistente', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^elimino el producto con identificador (\d+)$/,
      async (id: string) => {
        ctx.respuesta = await ctx.http.delete(
          `/producto/${id}?usuarioId=${USUARIO_ID}`,
        );
      },
    );

    verificarRechazo(then);
  });

  test('Buscar un producto por su código exacto de proveedor', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoConCodigo(given);
    pasoProductoConCodigo(and);
    pasoBusquedaRapida(when, true);
    verificarListadoRapido(then);
  });

  test('La búsqueda rápida parcial también mira la denominación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoConCodigo(given);
    pasoProductoConCodigo(and);
    pasoBusquedaRapida(when, false);
    verificarListadoRapido(then);
  });

  test('Una búsqueda rápida sin coincidencias no devuelve resultados', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoConCodigo(given);
    pasoBusquedaRapida(when, false);
    verificarListadoRapido(then);
  });

  test('Consultar la auditoría de un producto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);

    when(/^consulto la auditoría del producto$/, async () => {
      ctx.respuesta = await ctx.http.get(
        `/producto/${ctx.ultimoProducto.id}/audit`,
      );
    });

    then(/^la auditoría indica el detalle "(.*)"$/, (detalle: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.detalle).toBe(detalle);
    });
    and(/^la auditoría informa el usuario que lo creó$/, () => {
      expect(ctx.respuesta.body.usuarioCreated).toBe('Tester');
    });
  });

  test('Consultar un producto inexistente', ({ given, and, when, then }) => {
    pasosDeFondo(given, and);

    when(/^consulto el producto con identificador (\d+)$/, async (id: string) => {
      ctx.respuesta = await ctx.http.get(`/producto/${id}`);
    });

    verificarRechazo(then);
  });

  test('Consultar una marca por su identificador', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^consulto la marca "(.*)" por su identificador$/,
      async (nombre: string) => {
        ctx.respuesta = await ctx.http.get(`/marca/${ctx.idMarca(nombre)}`);
      },
    );

    then(/^la respuesta contiene la denominación "(.*)"$/, (esperada: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.denominacion).toBe(esperada);
    });
  });

  test('Obtener las marcas disponibles para el selector del formulario', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );

    when(/^consulto las marcas disponibles para el selector$/, async () => {
      ctx.respuesta = await ctx.http.get(
        '/producto/find-all-for-marcas/select?denominacion=',
      );
    });

    then(/^el selector contiene (\d+) marcas$/, (cantidad: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
    });
  });

  test('Obtener las líneas disponibles para el selector del formulario', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    given(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );

    when(/^consulto las líneas disponibles para el selector$/, async () => {
      ctx.respuesta = await ctx.http.get(
        '/producto/find-all-for-lineas/select?denominacion=',
      );
    });

    then(/^el selector contiene (\d+) líneas$/, (cantidad: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
    });
  });
});
