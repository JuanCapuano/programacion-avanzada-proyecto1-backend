import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(path.resolve(__dirname, '../features/linea.feature'));

const USUARIO_ID = 9;
// CR-004: la super línea queda fuera del alcance de esta feature.
const SUPER_LINEA_ID = 1;

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

  async function altaDeLinea(denominacion: string, stockMinimo?: number) {
    ctx.respuesta = await ctx.http.post('/linea').send({
      denominacion,
      // CR-004: toda línea cuelga de una super línea.
      superLineaId: SUPER_LINEA_ID,
      utilizaStockMinimo: stockMinimo !== undefined,
      stockMinimo: stockMinimo ?? 0,
      usuarioCreatedId: USUARIO_ID,
    });
  }

  async function listadoDeLineas() {
    return ctx.http.get('/linea/search-by?skip=0&take=50');
  }

  function pasosDeFondo(given: any) {
    given(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
  }

  function verificarRechazo(paso: any) {
    paso(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
  }

  // ------------------------------------------------------------ escenarios

  test('Dar de alta, modificar y eliminar una línea', ({
    given,
    when,
    then,
  }) => {
    pasosDeFondo(given);

    when(/^doy de alta la línea "(.*)"$/, async (nombre: string) => {
      await altaDeLinea(nombre);
    });
    then(/^la línea se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });

    when(
      /^modifico la línea "(.*)" con la denominación "(.*)"$/,
      async (actual: string, nueva: string) => {
        ctx.respuesta = await ctx.http
          .put(`/linea/${ctx.idLinea(actual)}`)
          .send({ denominacion: nueva, usuarioUpdatedId: USUARIO_ID });
        expect(ctx.respuesta.status).toBe(200);
      },
    );
    then(
      /^la línea "(.*)" figura en el listado de líneas$/,
      async (nombre: string) => {
        const listado = await listadoDeLineas();
        const nombres = listado.body.data.map((l: any) => l.denominacion);
        expect(nombres).toContain(nombre);
      },
    );

    when(/^elimino la línea "(.*)"$/, async (nombre: string) => {
      ctx.respuesta = await ctx.http.delete(
        `/linea/${ctx.idLinea(nombre)}?usuarioId=${USUARIO_ID}`,
      );
      expect(ctx.respuesta.status).toBe(200);
    });
    then(
      /^la línea "(.*)" no figura en el listado de líneas$/,
      async (nombre: string) => {
        const listado = await listadoDeLineas();
        const nombres = listado.body.data.map((l: any) => l.denominacion);
        expect(nombres).not.toContain(nombre);
      },
    );
  });

  test('Dar de alta una línea con stock mínimo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given);

    when(
      /^doy de alta la línea "(.*)" con stock mínimo (\d+)$/,
      async (nombre: string, stock: string) => {
        await altaDeLinea(nombre, Number(stock));
      },
    );
    then(/^la línea se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
    and(
      /^la línea "(.*)" tiene stock mínimo (\d+)$/,
      (nombre: string, stock: string) => {
        const linea = ctx.lineas.find((l) => l.denominacion === nombre);
        expect(Number(linea?.stockMinimo)).toBe(Number(stock));
      },
    );
  });

  test('No se puede eliminar una línea con productos activos', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given);
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
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

    when(/^elimino la línea "(.*)"$/, async (nombre: string) => {
      ctx.respuesta = await ctx.http.delete(
        `/linea/${ctx.idLinea(nombre)}?usuarioId=${USUARIO_ID}`,
      );
    });

    verificarRechazo(then);
    and(
      /^la línea "(.*)" figura en el listado de líneas$/,
      async (nombre: string) => {
        const listado = await listadoDeLineas();
        const nombres = listado.body.data.map((l: any) => l.denominacion);
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

    when(/^doy de alta la línea con el valor (.*)$/, async (valor: string) => {
      await altaDeLinea(valorDeTabla(valor));
    });

    verificarRechazo(then);
  });
});
