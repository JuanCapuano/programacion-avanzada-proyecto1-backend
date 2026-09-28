import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(path.resolve(__dirname, '../features/marca.feature'));

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

  function valorDeTabla(valor: string): string {
    if (valor === 'vacío') return '';
    if (valor === 'solo espacios') return '   ';
    return valor;
  }

  async function altaDeMarca(denominacion: string) {
    ctx.respuesta = await ctx.http
      .post('/marca')
      .send({ denominacion, usuarioCreatedId: USUARIO_ID });
  }

  async function listadoDeMarcas() {
    return ctx.http.get('/marca/search-by?skip=0&take=50');
  }

  function pasosDeFondo(given: any) {
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
  }

  function pasoAltaDeMarca(paso: any) {
    paso(/^doy de alta la marca "(.*)"$/, async (nombre: string) => {
      await altaDeMarca(nombre);
    });
  }

  // ------------------------------------------------------------ escenarios

  test('Dar de alta, modificar y eliminar una marca', ({
    given,
    when,
    then,
  }) => {
    pasosDeFondo(given);
    pasoAltaDeMarca(when);

    then(/^la marca se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });

    when(
      /^modifico la marca "(.*)" con la denominación "(.*)"$/,
      async (actual: string, nueva: string) => {
        ctx.respuesta = await ctx.http
          .put(`/marca/${ctx.idMarca(actual)}`)
          .send({ denominacion: nueva, usuarioUpdatedId: USUARIO_ID });
        expect(ctx.respuesta.status).toBe(200);
      },
    );
    then(
      /^la marca "(.*)" figura en el listado de marcas$/,
      async (nombre: string) => {
        const listado = await listadoDeMarcas();
        const nombres = listado.body.data.map((m: any) => m.denominacion);
        expect(nombres).toContain(nombre);
      },
    );

    when(/^elimino la marca "(.*)"$/, async (nombre: string) => {
      ctx.respuesta = await ctx.http.delete(
        `/marca/${ctx.idMarca(nombre)}?usuarioId=${USUARIO_ID}`,
      );
      expect(ctx.respuesta.status).toBe(200);
    });
    then(
      /^la marca "(.*)" no figura en el listado de marcas$/,
      async (nombre: string) => {
        const listado = await listadoDeMarcas();
        const nombres = listado.body.data.map((m: any) => m.denominacion);
        expect(nombres).not.toContain(nombre);
      },
    );
  });

  test('Buscar marcas por coincidencia parcial de la denominación', ({
    given,
    and,
    when,
    then,
  }) => {
    // Tres pasos de marca: el del Background y los dos propios del escenario.
    pasosDeFondo(given);
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
    and(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );

    when(/^busco marcas que contengan "(.*)"$/, async (texto: string) => {
      ctx.respuesta = await ctx.http.get(
        `/marca/search-by?skip=0&take=50&denominacion=${encodeURIComponent(texto)}`,
      );
    });

    then(/^el listado contiene (\d+) marcas$/, (cantidad: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
    });
    and(/^el listado no contiene la marca "(.*)"$/, (nombre: string) => {
      const nombres = ctx.respuesta.body.data.map((m: any) => m.denominacion);
      expect(nombres).not.toContain(nombre);
    });
  });

  test('No se puede eliminar una marca con productos activos', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given);
    given(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
    and(
      /^existe un producto de la marca "(.*)" y línea "(.*)"$/,
      async (marca: string, linea: string) => {
        ctx.respuesta = await ctx.http.post('/producto').send({
          marcaId: ctx.idMarca(marca),
          lineaId: ctx.idLinea(linea),
          alicuotaIva: 21,
          utilizaStockMinimo: false,
          utilizaPack: false,
          usuarioCreatedId: USUARIO_ID,
          costo: 1000,
          presentacionCantidad: 1,
          presentacionUnidad: 'l',
        });
        expect(ctx.respuesta.status).toBe(201);
      },
    );

    when(/^elimino la marca "(.*)"$/, async (nombre: string) => {
      ctx.respuesta = await ctx.http.delete(
        `/marca/${ctx.idMarca(nombre)}?usuarioId=${USUARIO_ID}`,
      );
    });

    then(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
    and(
      /^la marca "(.*)" figura en el listado de marcas$/,
      async (nombre: string) => {
        const listado = await listadoDeMarcas();
        const nombres = listado.body.data.map((m: any) => m.denominacion);
        expect(nombres).toContain(nombre);
      },
    );
  });

  test('El alta rechaza denominaciones inválidas o repetidas', ({
    given,
    when,
    then,
  }) => {
    pasosDeFondo(given);

    when(/^doy de alta la marca con el valor (.*)$/, async (valor: string) => {
      await altaDeMarca(valorDeTabla(valor));
    });

    then(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
  });
});
