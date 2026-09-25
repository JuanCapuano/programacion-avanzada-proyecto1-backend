import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/producto-presentacion.feature'),
);

const USUARIO_ID = 9;
const COSTO_POR_DEFECTO = 1000;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  /** Convierte lo escrito en el escenario al dato que viaja en el request. */
  function dato(valor: string): number | string | undefined {
    return valor === '' || valor === undefined ? undefined : valor;
  }

  async function altaDeProducto(
    marca: string,
    linea: string,
    cantidad: string,
    unidad: string,
  ) {
    const cuerpo: Record<string, unknown> = {
      marcaId: ctx.idMarca(marca),
      lineaId: ctx.idLinea(linea),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo: COSTO_POR_DEFECTO,
    };
    const cant = dato(cantidad);
    if (cant !== undefined) cuerpo.presentacionCantidad = Number(cant);
    const uni = dato(unidad);
    if (uni !== undefined) cuerpo.presentacionUnidad = uni;

    ctx.respuesta = await ctx.http.post('/producto').send(cuerpo);
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
        await altaDeProducto(marca, linea, cantidad, unidad);
        expect(ctx.respuesta.status).toBe(201);
      },
    );
  }

  function verificarPresentacion(paso: any) {
    paso(
      /^la presentación del producto es (.*) "(.*)"$/,
      (cantidad: string, unidad: string) => {
        expect(ctx.ultimoProducto.presentacionCantidad).toBe(Number(cantidad));
        expect(ctx.ultimoProducto.presentacionUnidad).toBe(unidad);
      },
    );
  }

  function pasoModificarPresentacion(paso: any) {
    paso(
      /^modifico la presentación del producto a (.*) "(.*)"$/,
      async (cantidad: string, unidad: string) => {
        ctx.respuesta = await ctx.http
          .put(`/producto/${ctx.ultimoProducto.id}`)
          .send({
            presentacionCantidad: Number(cantidad),
            presentacionUnidad: unidad,
            usuarioUpdatedId: USUARIO_ID,
          });
        expect(ctx.respuesta.status).toBe(200);
      },
    );
  }

  // ------------------------------------------------------------ escenarios

  test('La presentación se guarda con su cantidad y su unidad de medida', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, cantidad, unidad);
      },
    );

    then(/^el producto se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
    verificarPresentacion(and);
  });

  test('La cantidad de la presentación admite decimales', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, cantidad, unidad);
      },
    );

    verificarPresentacion(then);
    and(/^la denominación del producto es "(.*)"$/, (esperada: string) => {
      expect(ctx.ultimoProducto.denominacion).toBe(esperada);
    });
  });

  test('Dos productos de la misma marca y línea se distinguen por su presentación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);

    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, cantidad, unidad);
      },
    );

    then(/^el producto se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
    and(
      /^el listado contiene los productos "(.*)" y "(.*)"$/,
      async (uno: string, otro: string) => {
        const listado = await ctx.http.get('/producto/search-by?skip=0&take=10');
        const nombres = listado.body.data.map((p: any) => p.denominacion);
        expect(nombres).toEqual(expect.arrayContaining([uno, otro]));
      },
    );
  });

  test('Se puede corregir la presentación de un producto ya cargado', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoModificarPresentacion(when);
    verificarPresentacion(then);
  });

  test('Modificar la presentación no altera el costo ni el precio del producto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoModificarPresentacion(when);

    then(/^el costo del producto sigue siendo (.*)$/, (costo: string) => {
      expect(Number(ctx.ultimoProducto.costo)).toBe(Number(costo));
    });
    and(/^el precio del producto sigue siendo (.*)$/, (precio: string) => {
      expect(Number(ctx.ultimoProducto.precio)).toBe(Number(precio));
    });
  });

  test('El alta rechaza presentaciones inválidas o incompletas', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, cantidad, unidad);
      },
    );

    then(
      /^la operación es rechazada con el estado (\d+)$/,
      (estado: string) => {
        expect(ctx.respuesta.status).toBe(Number(estado));
      },
    );
    and(/^no se guarda ningún producto$/, () => {
      expect(ctx.productos).toHaveLength(0);
    });
  });
});
