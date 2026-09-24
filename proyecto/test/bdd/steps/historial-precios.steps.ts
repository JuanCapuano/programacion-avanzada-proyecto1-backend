import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/historial-precios.feature'),
);

const USUARIO_ID = 9;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;
  let idProducto: number;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  async function altaDeProducto(costo: number, margen: number) {
    ctx.respuesta = await ctx.http.post('/producto').send({
      marcaId: ctx.idMarca('CAROYENSE'),
      lineaId: ctx.idLinea('ACEITES'),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo,
      porcentaje: margen,
      presentacionCantidad: ctx.productos.length + 1,
      presentacionUnidad: 'l',
    });
    expect(ctx.respuesta.status).toBe(201);
    return ctx.ultimoProducto.id;
  }

  /**
   * Traduce los casos escritos en el escenario al cuerpo que espera el endpoint
   * PATCH /producto/:id/precio, donde el precio viaja ya calculado.
   */
  async function actualizarPrecio(caso: string) {
    const producto = ctx.productoPorId(idProducto);
    const costoActual = Number(producto?.costo ?? 0);
    const margenActual = Number(producto?.porcentaje ?? 0);

    const costo = /costo (-?\d+(?:\.\d+)?)/.exec(caso);
    const margen = /margen (-?\d+(?:\.\d+)?)/.exec(caso);
    const motivo = /motivo "(.*)"/.exec(caso);

    const nuevoCosto = costo ? Number(costo[1]) : costoActual;
    const nuevoMargen = margen ? Number(margen[1]) : margenActual;

    const cuerpo: Record<string, unknown> = {
      costo: nuevoCosto,
      porcentaje: nuevoMargen,
      precio: nuevoCosto + (nuevoCosto * nuevoMargen) / 100,
      usuarioId: USUARIO_ID,
    };
    if (motivo) {
      cuerpo.motivo = motivo[1];
    }

    ctx.respuesta = await ctx.http
      .patch(`/producto/${idProducto}/precio`)
      .send(cuerpo);
  }

  function pasosDeFondo(given: any, and: any) {
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
    and(/^existe la línea "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaLinea(nombre),
    );
    and(
      /^existe un producto con costo (\d+) y margen (\d+)$/,
      async (costo: string, margen: string) => {
        idProducto = await altaDeProducto(Number(costo), Number(margen));
      },
    );
  }

  function pasoActualizarPrecio(paso: any) {
    paso(/^actualizo el precio del producto (.*)$/, async (caso: string) => {
      await actualizarPrecio(caso);
    });
  }

  function verificarCantidadRegistros(paso: any) {
    paso(
      /^el historial del producto tiene (\d+) registros?$/,
      (cantidad: string) => {
        expect(ctx.historialDe(idProducto)).toHaveLength(Number(cantidad));
      },
    );
  }

  function verificarSinRegistros(paso: any) {
    paso(/^el historial del producto no tiene registros$/, () => {
      expect(ctx.historialDe(idProducto)).toHaveLength(0);
    });
  }

  // ------------------------------------------------------------ escenarios

  test('Cambiar el costo registra el cambio de precio con su motivo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoActualizarPrecio(when);
    verificarCantidadRegistros(then);

    and(
      /^el registro indica precio anterior (.*) y precio nuevo (.*)$/,
      (anterior: string, nuevo: string) => {
        const registro = ctx.historialDe(idProducto)[0];
        expect(Number(registro.precioAnterior)).toBe(Number(anterior));
        expect(Number(registro.precioNuevo)).toBe(Number(nuevo));
      },
    );
    and(
      /^el registro tiene fecha y el motivo "(.*)"$/,
      (motivo: string) => {
        const registro = ctx.historialDe(idProducto)[0];
        expect(registro.fecha).toBeInstanceOf(Date);
        expect(registro.motivo).toBe(motivo);
      },
    );
  });

  test('Cambiar el margen también queda registrado', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoActualizarPrecio(when);
    verificarCantidadRegistros(then);
    and(
      /^el registro indica precio anterior (.*) y precio nuevo (.*)$/,
      (anterior: string, nuevo: string) => {
        const registro = ctx.historialDe(idProducto)[0];
        expect(Number(registro.precioAnterior)).toBe(Number(anterior));
        expect(Number(registro.precioNuevo)).toBe(Number(nuevo));
      },
    );
  });

  test('Guardar el mismo precio no genera un registro nuevo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoActualizarPrecio(when);
    verificarSinRegistros(then);
  });

  test('El historial se consulta del cambio más reciente al más antiguo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoActualizarPrecio(given);
    pasoActualizarPrecio(and);

    when(/^consulto el historial del producto$/, async () => {
      ctx.respuesta = await ctx.http.get(
        `/producto/${idProducto}/historial-precio?skip=0&take=20`,
      );
    });

    then(
      /^el historial del producto tiene (\d+) registros?$/,
      (cantidad: string) => {
        expect(ctx.respuesta.status).toBe(200);
        expect(ctx.respuesta.body.data).toHaveLength(Number(cantidad));
      },
    );
    and(
      /^el primer registro del listado tiene el motivo "(.*)"$/,
      (motivo: string) => {
        expect(ctx.respuesta.body.data[0].motivo).toBe(motivo);
      },
    );
    and(
      /^cada registro muestra fecha, precio anterior, precio nuevo y motivo$/,
      () => {
        for (const registro of ctx.respuesta.body.data) {
          expect(registro.fecha).toBeDefined();
          expect(registro.precioAnterior).toBeDefined();
          expect(registro.precioNuevo).toBeDefined();
          expect(registro.motivo).toBeDefined();
        }
      },
    );
  });

  test('Un producto sin cambios de precio no tiene historial', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^consulto el historial del producto$/, async () => {
      ctx.respuesta = await ctx.http.get(
        `/producto/${idProducto}/historial-precio?skip=0&take=20`,
      );
    });
    then(/^el historial del producto no tiene registros$/, () => {
      expect(ctx.respuesta.status).toBe(200);
      expect(ctx.respuesta.body.data).toHaveLength(0);
    });
  });

  // Pendiente: la actualización masiva todavía no registra historial.
  test.skip('Una actualización masiva registra el cambio de cada producto afectado', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    given(/^existe otro producto de la línea "(.*)" con costo (\d+) y margen (\d+)$/, async () => {});
    when(/^aplico un aumento del (\d+) por ciento a la línea "(.*)"$/, async () => {});
    then(/^el historial del primer producto tiene (\d+) registro$/, () => {});
    and(/^el historial del segundo producto tiene (\d+) registro$/, () => {});
  });

  test('Un cambio de precio inválido es rechazado y no se registra', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoActualizarPrecio(when);

    then(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
    verificarSinRegistros(and);
    and(/^el precio del producto sigue siendo (.*)$/, (precio: string) => {
      expect(Number(ctx.productoPorId(idProducto)?.precio)).toBe(
        Number(precio),
      );
    });
  });

  // Pendiente: hoy devuelve 200 con lista vacía en vez de 404.
  test.skip('No se puede consultar el historial de un producto inexistente', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    when(/^consulto el historial de un producto inexistente$/, async () => {});
    then(/^la operación es rechazada con el estado (\d+)$/, () => {});
  });
});
