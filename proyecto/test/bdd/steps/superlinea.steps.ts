import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/superlinea.feature'),
);

const USUARIO_ID = 9;

/**
 * CR-003 (SuperLínea): agrupa líneas relacionadas. Los escenarios ejercitan el
 * controlador y el servicio reales; solo los repositorios están en memoria.
 */
defineFeature(feature, (test) => {
  let ctx: ContextoProducto;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  async function altaDeSuperLinea(denominacion: string) {
    ctx.respuesta = await ctx.http
      .post('/super-linea')
      .send({ denominacion, usuarioCreatedId: USUARIO_ID });
  }

  async function altaDeLinea(denominacion: string, superLinea?: string) {
    const cuerpo: Record<string, unknown> = {
      denominacion,
      utilizaStockMinimo: false,
      stockMinimo: 0,
      usuarioCreatedId: USUARIO_ID,
    };
    if (superLinea !== undefined) {
      cuerpo.superLineaId = ctx.idSuperLinea(superLinea);
    }
    ctx.respuesta = await ctx.http.post('/linea').send(cuerpo);
  }

  function fondo(given: any, and: any) {
    given(/^existe la superlínea "(.*)"$/, (nombre: string) => {
      ctx.darDeAltaSuperLinea(nombre);
    });
    and(
      /^existe la línea "(.*)" de la superlínea "(.*)"$/,
      (linea: string, superLinea: string) => {
        ctx.darDeAltaLinea(linea, 0, ctx.idSuperLinea(superLinea));
      },
    );
  }

  function verificarRechazo(paso: any) {
    paso(
      /^la operación es rechazada con el estado (\d+)$/,
      (estado: string) => {
        expect(ctx.respuesta.status).toBe(Number(estado));
      },
    );
  }

  // ------------------------------------------------------------ escenarios

  test('Dar de alta una superlínea', ({ given, and, when, then }) => {
    fondo(given, and);

    when(/^doy de alta la superlínea "(.*)"$/, async (nombre: string) => {
      await altaDeSuperLinea(nombre);
    });

    then(/^la superlínea se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });

    and(
      /^la superlínea "(.*)" queda disponible para asignar a una línea$/,
      async (nombre: string) => {
        await altaDeLinea('GASEOSAS', nombre);
        expect(ctx.respuesta.status).toBe(201);
        expect(ctx.lineaPorDenominacion('GASEOSAS')?.superLineaId).toBe(
          ctx.idSuperLinea(nombre),
        );
      },
    );
  });

  test('Renombrar una superlínea conserva sus líneas asociadas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);

    when(
      /^modifico la superlínea "(.*)" con la denominación "(.*)"$/,
      async (actual: string, nueva: string) => {
        ctx.respuesta = await ctx.http
          .put(`/super-linea/${ctx.idSuperLinea(actual)}`)
          .send({ denominacion: nueva, usuarioUpdatedId: USUARIO_ID });
        expect(ctx.respuesta.status).toBe(200);
      },
    );

    then(
      /^la línea "(.*)" sigue perteneciendo a la superlínea "(.*)"$/,
      (linea: string, superLinea: string) => {
        const asociada = ctx.lineaPorDenominacion(linea);
        expect(asociada?.superLineaId).toBe(ctx.idSuperLinea(superLinea));
      },
    );
  });

  test('Reasignar una línea a otra superlínea', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    given(/^existe la superlínea "(.*)"$/, (nombre: string) => {
      ctx.darDeAltaSuperLinea(nombre);
    });

    when(
      /^asigno la línea "(.*)" a la superlínea "(.*)"$/,
      async (linea: string, superLinea: string) => {
        const id = ctx.idLinea(linea);
        ctx.respuesta = await ctx.http.put(`/linea/${id}`).send({
          superLineaId: ctx.idSuperLinea(superLinea),
          utilizaStockMinimo: false,
          usuarioUpdatedId: USUARIO_ID,
        });
        expect(ctx.respuesta.status).toBe(200);
      },
    );

    then(
      /^la línea "(.*)" pertenece únicamente a la superlínea "(.*)"$/,
      (linea: string, superLinea: string) => {
        expect(ctx.lineaPorDenominacion(linea)?.superLineaId).toBe(
          ctx.idSuperLinea(superLinea),
        );
      },
    );
  });

  test('El alta de la superlínea rechaza denominaciones inválidas o repetidas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);

    when(
      /^doy de alta la superlínea con el valor (.*)$/,
      async (valor: string) => {
        await altaDeSuperLinea(valor === 'vacío' ? '' : valor);
      },
    );

    verificarRechazo(then);
  });

  test('La superlínea es obligatoria al dar de alta una línea', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);

    when(
      /^doy de alta la línea "(.*)" sin superlínea$/,
      async (nombre: string) => {
        await altaDeLinea(nombre);
      },
    );

    verificarRechazo(then);
  });

  test('No se puede eliminar una superlínea con líneas asignadas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);

    when(/^elimino la superlínea "(.*)"$/, async (nombre: string) => {
      const id = ctx.idSuperLinea(nombre);
      ctx.respuesta = await ctx.http.delete(
        `/super-linea/${id}?usuarioId=${USUARIO_ID}`,
      );
    });

    verificarRechazo(then);

    and(/^la superlínea "(.*)" sigue existiendo$/, (nombre: string) => {
      const superLinea = ctx.superLineaPorId(ctx.idSuperLinea(nombre));
      expect(superLinea?.deletedAt).toBeNull();
    });
  });
});
