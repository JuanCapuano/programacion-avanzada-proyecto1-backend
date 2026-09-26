import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/producto-validaciones.feature'),
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

  /** Traduce los valores de las tablas Examples al dato real del request. */
  function costoDeTabla(valor: string): unknown {
    if (valor === 'mil') return 'mil';
    return Number(valor);
  }

  function margenDeTabla(valor: string): unknown {
    if (valor === 'sin margen') return undefined;
    if (valor === 'abc') return 'abc';
    return Number(valor);
  }

  /** El filtro global concatena los mensajes del ValidationPipe en `message`. */
  function verificarMensaje(paso: any) {
    paso(/^el mensaje de error indica "(.*)"$/, (mensaje: string) => {
      expect(ctx.respuesta.body.message).toContain(mensaje);
    });
  }

  async function altaDeProducto(opciones: {
    costo?: unknown;
    margen?: unknown;
    marcaId?: number | undefined;
    lineaId?: number | undefined;
  }) {
    const cuerpo: Record<string, unknown> = {
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      presentacionCantidad: 1,
      presentacionUnidad: 'l',
    };
    if (opciones.marcaId !== undefined) cuerpo.marcaId = opciones.marcaId;
    if (opciones.lineaId !== undefined) cuerpo.lineaId = opciones.lineaId;
    if (opciones.costo !== undefined) cuerpo.costo = opciones.costo;
    if (opciones.margen !== undefined) cuerpo.porcentaje = opciones.margen;

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

  function pasoProductoExistente(paso: any) {
    paso(
      /^existe un producto con costo (.*) y margen (.*)$/,
      async (costo: string, margen: string) => {
        await altaDeProducto({
          costo: Number(costo),
          margen: Number(margen),
          marcaId: ctx.idMarca('CAROYENSE'),
          lineaId: ctx.idLinea('ACEITES'),
        });
        expect(ctx.respuesta.status).toBe(201);
      },
    );
  }

  function pasoAltaDesdeTabla(paso: any) {
    paso(
      /^doy de alta un producto con costo (.*) y margen (.*)$/,
      async (costo: string, margen: string) => {
        await altaDeProducto({
          costo: costoDeTabla(costo),
          margen: margenDeTabla(margen),
          marcaId: ctx.idMarca('CAROYENSE'),
          lineaId: ctx.idLinea('ACEITES'),
        });
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

  function verificarPrecio(paso: any) {
    paso(/^el precio del producto es (.*)$/, (precio: string) => {
      expect(Number(ctx.ultimoProducto.precio)).toBe(Number(precio));
    });
  }

  // ------------------------------------------------------------ escenarios

  test('El precio se calcula como costo más margen', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAltaDesdeTabla(when);

    then(/^el producto se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
    verificarPrecio(and);
  });

  test('Al modificar el costo el precio se recalcula solo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoExistente(given);

    // CR-007: si el cambio de costo mueve el precio, el motivo es obligatorio.
    when(
      /^modifico el costo del producto a (.*) con el motivo "(.*)"$/,
      async (costo: string, motivo: string) => {
        ctx.respuesta = await ctx.http
          .put(`/producto/${ctx.ultimoProducto.id}`)
          .send({ costo: Number(costo), motivo, usuarioUpdatedId: USUARIO_ID });
      },
    );

    verificarPrecio(then);
  });

  test('El alta rechaza costos y márgenes inválidos indicando el motivo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAltaDesdeTabla(when);
    verificarRechazo(then);
    verificarMensaje(and);

    and(/^no se guarda ningún producto$/, () => {
      expect(ctx.productos).toHaveLength(0);
    });
  });

  test('Un producto existente conserva su costo si se intenta guardar uno inválido', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoExistente(given);

    when(/^modifico el costo del producto a (.*)$/, async (costo: string) => {
      ctx.respuesta = await ctx.http
        .put(`/producto/${ctx.ultimoProducto.id}`)
        .send({ costo: Number(costo), usuarioUpdatedId: USUARIO_ID });
    });

    verificarRechazo(then);
    verificarMensaje(and);
    and(/^el costo del producto sigue siendo (.*)$/, (costo: string) => {
      expect(Number(ctx.ultimoProducto.costo)).toBe(Number(costo));
    });
    and(/^el precio del producto sigue siendo (.*)$/, (precio: string) => {
      expect(Number(ctx.ultimoProducto.precio)).toBe(Number(precio));
    });
  });


  test('La marca y la línea son obligatorias y deben existir', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^doy de alta un producto (.*)$/, async (caso: string) => {
      const marca = ctx.idMarca('CAROYENSE');
      const linea = ctx.idLinea('ACEITES');
      const casos: Record<string, { marcaId?: number; lineaId?: number }> = {
        'sin marca': { lineaId: linea },
        'sin línea': { marcaId: marca },
        'con una marca inexistente': { marcaId: 999, lineaId: linea },
        'con una línea inexistente': { marcaId: marca, lineaId: 999 },
      };
      await altaDeProducto({ costo: 1000, margen: 15, ...casos[caso] });
    });

    verificarRechazo(then);
  });
});
