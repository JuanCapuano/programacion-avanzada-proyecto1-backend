import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/producto-busqueda.feature'),
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

  async function altaConNombre(denominacion: string, linea: string) {
    ctx.respuesta = await ctx.http.post('/producto').send({
      marcaId: ctx.idMarca('CAROYENSE'),
      lineaId: ctx.idLinea(linea),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo: 1000,
      denominacion,
      presentacionCantidad: ctx.productos.length + 1,
      presentacionUnidad: 'l',
    });
    expect(ctx.respuesta.status).toBe(201);
  }

  async function buscar(texto?: string, lineaId?: number) {
    const partes = ['skip=0', 'take=50'];
    if (texto !== undefined) {
      partes.push(`denominacion=${encodeURIComponent(texto)}`);
    }
    if (lineaId !== undefined) {
      partes.push(`lineaId=${lineaId}`);
    }
    ctx.respuesta = await ctx.http.get(`/producto/search-by?${partes.join('&')}`);
  }

  function denominaciones(): string[] {
    return (ctx.respuesta.body.data ?? []).map((p: any) => p.denominacion);
  }

  function pasosDeFondo(given: any, and: any) {
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
    and(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
    and(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
    and(
      /^existe un producto llamado "(.*)" de la línea "(.*)"$/,
      async (nombre: string, linea: string) => altaConNombre(nombre, linea),
    );
    and(
      /^existe un producto llamado "(.*)" de la línea "(.*)"$/,
      async (nombre: string, linea: string) => altaConNombre(nombre, linea),
    );
  }

  function verificarContiene(paso: any) {
    paso(/^el listado contiene el producto "(.*)"$/, (nombre: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(denominaciones()).toContain(nombre);
    });
  }

  function verificarNoContiene(paso: any) {
    paso(/^el listado no contiene el producto "(.*)"$/, (nombre: string) => {
      expect(denominaciones()).not.toContain(nombre);
    });
  }

  // ------------------------------------------------------------ escenarios

  test('La búsqueda por denominación admite coincidencias parciales sin distinguir mayúsculas', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^busco productos que contengan "(.*)"$/, async (texto: string) => {
      await buscar(texto);
    });

    verificarContiene(then);
    verificarNoContiene(and);
  });

  test('Filtrar los productos por línea', ({ given, and, when, then }) => {
    pasosDeFondo(given, and);

    when(/^filtro los productos por la línea "(.*)"$/, async (linea: string) => {
      await buscar(undefined, ctx.idLinea(linea));
    });

    verificarContiene(then);
    verificarNoContiene(and);
  });

  test('Combinar el texto de búsqueda con el filtro de línea', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    given(
      /^existe un producto llamado "(.*)" de la línea "(.*)"$/,
      async (nombre: string, linea: string) => altaConNombre(nombre, linea),
    );

    when(
      /^busco productos que contengan "(.*)" y filtro por la línea "(.*)"$/,
      async (texto: string, linea: string) => {
        await buscar(texto, ctx.idLinea(linea));
      },
    );

    then(/^el listado contiene (\d+) productos$/, (cantidad: string) => {
      expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
    });
  });

  test('El resultado informa la cantidad de productos encontrados', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^busco productos que contengan "(.*)"$/, async (texto: string) => {
      await buscar(texto);
    });

    then(/^el listado informa el total de productos encontrados$/, () => {
      expect(ctx.respuesta.body.total).toBe(ctx.respuesta.body.data.length);
    });
  });

  test('Una búsqueda sin coincidencias devuelve un listado vacío', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^busco productos que contengan "(.*)"$/, async (texto: string) => {
      await buscar(texto);
    });

    then(/^el listado contiene (\d+) productos$/, (cantidad: string) => {
      expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
    });
    and(/^el listado informa el total (\d+)$/, (total: string) => {
      expect(ctx.respuesta.body.total).toBe(Number(total));
    });
  });

  // Pendiente: la búsqueda no contempla el nombre de la línea (CR-004).
  test.skip('Buscar productos por el nombre de su línea', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    when(/^busco productos que contengan "(.*)"$/, async () => {});
    then(/^el listado contiene el producto "(.*)"$/, () => {});
  });

  // Pendiente: depende del CR-003 (SuperLínea), todavía no integrado.
  test.skip('Buscar productos por el nombre de su superlínea', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    given(/^existe la superlínea "(.*)" con la línea "(.*)"$/, () => {});
    when(/^busco productos que contengan "(.*)"$/, async () => {});
    then(/^el listado contiene el producto "(.*)"$/, () => {});
  });
});
