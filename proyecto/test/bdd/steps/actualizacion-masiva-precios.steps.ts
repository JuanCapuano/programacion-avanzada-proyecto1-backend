import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { TipoAjustePrecio } from 'src/modules/gestion-productos/producto/domain/enums/tipo-ajuste-precio.enum';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/actualizacion-masiva-precios.feature'),
);

const USUARIO_ID = 9;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;
  /** Costo con el que se dio de alta cada producto -> id, para identificarlos. */
  let porCostoInicial: Map<number, number>;
  /** Productos de la línea ACEITES, los que reciben los ajustes por línea. */
  let idsAceites: number[];

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
    porCostoInicial = new Map();
    idsAceites = [];
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  async function altaConCostoYMargen(linea: string, costo: number, margen: number) {
    ctx.respuesta = await ctx.http.post('/producto').send({
      marcaId: ctx.idMarca('CAROYENSE'),
      lineaId: ctx.idLinea(linea),
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
    porCostoInicial.set(costo, ctx.ultimoProducto.id);
    if (linea === 'ACEITES') {
      idsAceites.push(ctx.ultimoProducto.id);
    }
  }

  function productoDeCosto(costoInicial: number) {
    return ctx.productoPorId(porCostoInicial.get(costoInicial) as number);
  }

  async function aplicar(cuerpo: Record<string, unknown>) {
    ctx.respuesta = await ctx.http
      .post('/producto/precios/actualizacion-masiva')
      .send({ usuarioId: USUARIO_ID, ...cuerpo });
  }

  async function previsualizar(cuerpo: Record<string, unknown>) {
    ctx.respuesta = await ctx.http
      .post('/producto/precios/actualizacion-masiva/preview')
      .send({ usuarioId: USUARIO_ID, ...cuerpo });
  }

  function alcanceLinea(linea: string) {
    return { alcance: 'linea', lineaId: ctx.idLinea(linea) };
  }

  /** "por ciento" ajusta el costo en %, "pesos" le suma o resta un monto fijo. */
  function tipoDeAjusteDelCosto(tipo: string): TipoAjustePrecio {
    return tipo.includes('ciento')
      ? TipoAjustePrecio.COSTO_PORCENTUAL
      : TipoAjustePrecio.COSTO_MONTO;
  }

  // ------------------------------------------------------------------ pasos

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
    for (let i = 0; i < 3; i++) {
      and(
        /^existe un producto de la línea "(.*)" con costo (\d+) y margen (\d+)$/,
        async (linea: string, costo: string, margen: string) =>
          altaConCostoYMargen(linea, Number(costo), Number(margen)),
      );
    }
  }

  function pasoProductoAdicional(given: any) {
    given(
      /^existe un producto de la línea "(.*)" con costo (\d+) y margen (\d+)$/,
      async (linea: string, costo: string, margen: string) =>
        altaConCostoYMargen(linea, Number(costo), Number(margen)),
    );
  }

  function pasoAjusteDelCostoALinea(when: any) {
    when(
      /^aplico un ajuste de (-?\d+) (por ciento|pesos) a la línea "(.*)"$/,
      async (valor: string, tipo: string, linea: string) => {
        await aplicar({
          tipoAjuste: tipoDeAjusteDelCosto(tipo),
          valor: Number(valor),
          ...alcanceLinea(linea),
        });
      },
    );
  }

  function pasoAsignarMargenALinea(when: any) {
    when(
      /^asigno un margen de (-?\d+) a la línea "(.*)"$/,
      async (valor: string, linea: string) => {
        await aplicar({
          tipoAjuste: TipoAjustePrecio.MARGEN,
          valor: Number(valor),
          ...alcanceLinea(linea),
        });
      },
    );
  }

  function verificarOperacionCorrecta(paso: any) {
    paso(/^la operación se realiza correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
  }

  function verificarCostoYPrecio(paso: any) {
    paso(
      /^el producto de costo (\d+) (?:queda con|mantiene su) costo (\d+) y (?:su )?precio (\d+)$/,
      (costoInicial: string, costo: string, precio: string) => {
        const producto = productoDeCosto(Number(costoInicial));
        expect(Number(producto?.costo)).toBe(Number(costo));
        expect(Number(producto?.precio)).toBe(Number(precio));
      },
    );
  }

  function verificarMargenDeLosAjustados(paso: any) {
    paso(
      /^el margen de los productos ajustados sigue siendo (\d+)$/,
      (margen: string) => {
        for (const id of idsAceites) {
          expect(Number(ctx.productoPorId(id)?.porcentaje)).toBe(Number(margen));
        }
      },
    );
  }

  function verificarCantidadInformada(paso: any) {
    paso(
      /^el resultado informa (\d+) productos actualizados$/,
      (cantidad: string) => {
        expect(ctx.respuesta.body.mensaje).toContain(`${cantidad} producto`);
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

  test('Un ajuste porcentual cambia el costo y recalcula el precio', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteDelCostoALinea(when);
    verificarOperacionCorrecta(then);
    verificarCostoYPrecio(and);
    verificarCostoYPrecio(and);
    verificarMargenDeLosAjustados(and);
  });

  test('El ajuste por línea no modifica los productos de otras líneas', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteDelCostoALinea(when);
    verificarCostoYPrecio(then);
    verificarCantidadInformada(and);
  });

  test('El ajuste global modifica todos los productos del catálogo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^aplico un ajuste de (-?\d+) (por ciento|pesos) a todo el catálogo$/,
      async (valor: string, tipo: string) => {
        await aplicar({
          tipoAjuste: tipoDeAjusteDelCosto(tipo),
          valor: Number(valor),
          alcance: 'global',
        });
      },
    );

    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
    verificarCantidadInformada(and);
  });

  test('Sumar un monto fijo al costo de una línea', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteDelCostoALinea(when);
    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
    verificarMargenDeLosAjustados(and);
  });

  test('Sumar un monto fijo a todo el catálogo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^aplico un ajuste de (-?\d+) (por ciento|pesos) a todo el catálogo$/,
      async (valor: string, tipo: string) => {
        await aplicar({
          tipoAjuste: tipoDeAjusteDelCosto(tipo),
          valor: Number(valor),
          alcance: 'global',
        });
      },
    );

    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
    verificarCantidadInformada(and);
  });

  test('Asignar un margen nuevo mantiene el costo y recalcula el precio', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAsignarMargenALinea(when);
    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
    verificarMargenDeLosAjustados(and);
    verificarCantidadInformada(and);
  });

  test('Asignar un margen uniforma productos que tenían márgenes distintos', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAdicional(given);
    pasoAsignarMargenALinea(when);
    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
    verificarMargenDeLosAjustados(and);
  });

  test('Asignar un margen a todo el catálogo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^asigno un margen de (-?\d+) a todo el catálogo$/, async (valor: string) => {
      await aplicar({
        tipoAjuste: TipoAjustePrecio.MARGEN,
        valor: Number(valor),
        alcance: 'global',
      });
    });

    verificarCostoYPrecio(then);
    verificarCantidadInformada(and);
  });

  test('Un margen de 0 deja el precio igual al costo', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAsignarMargenALinea(when);
    verificarCostoYPrecio(then);
    verificarCostoYPrecio(and);
  });

  test('La previsualización muestra el precio actual, el resultante y el estado de cada producto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^previsualizo un ajuste de (-?\d+) (por ciento|pesos) sobre la línea "(.*)"$/,
      async (valor: string, tipo: string, linea: string) => {
        await previsualizar({
          tipoAjuste: tipoDeAjusteDelCosto(tipo),
          valor: Number(valor),
          ...alcanceLinea(linea),
        });
      },
    );

    then(
      /^la previsualización muestra (\d+) productos afectados$/,
      (cantidad: string) => {
        expect(ctx.respuesta.status).toBe(201);
        expect(ctx.respuesta.body).toHaveLength(Number(cantidad));
      },
    );

    and(
      /^cada producto previsualizado muestra su precio actual, su precio resultante y su estado$/,
      () => {
        for (const item of ctx.respuesta.body) {
          expect(item.precioActual).toBeDefined();
          expect(item.precioResultante).toBeDefined();
          expect(typeof item.valido).toBe('boolean');
        }
      },
    );

    and(
      /^el producto de costo (\d+) se previsualiza con precio actual (\d+) y precio resultante (\d+)$/,
      (costoInicial: string, actual: string, resultante: string) => {
        const id = porCostoInicial.get(Number(costoInicial));
        const item = ctx.respuesta.body.find((p: { id: number }) => p.id === id);
        expect(Number(item.precioActual)).toBe(Number(actual));
        expect(Number(item.precioResultante)).toBe(Number(resultante));
      },
    );
  });

  test('Previsualizar no modifica ningún producto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^previsualizo una asignación de margen de (-?\d+) sobre la línea "(.*)"$/,
      async (valor: string, linea: string) => {
        await previsualizar({
          tipoAjuste: TipoAjustePrecio.MARGEN,
          valor: Number(valor),
          ...alcanceLinea(linea),
        });
      },
    );

    then(
      /^la previsualización muestra (\d+) productos afectados$/,
      (cantidad: string) => {
        expect(ctx.respuesta.body).toHaveLength(Number(cantidad));
      },
    );
    verificarCostoYPrecio(and);
    verificarCostoYPrecio(and);
  });

  test('La previsualización marca inválido el producto que quedaría con costo en cero o menos', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAdicional(given);

    when(
      /^previsualizo un ajuste de (-?\d+) (por ciento|pesos) sobre la línea "(.*)"$/,
      async (valor: string, tipo: string, linea: string) => {
        await previsualizar({
          tipoAjuste: tipoDeAjusteDelCosto(tipo),
          valor: Number(valor),
          ...alcanceLinea(linea),
        });
      },
    );

    then(
      /^la previsualización muestra (\d+) productos afectados$/,
      (cantidad: string) => {
        expect(ctx.respuesta.status).toBe(201);
        expect(ctx.respuesta.body).toHaveLength(Number(cantidad));
      },
    );

    and(
      /^el producto de costo (\d+) se previsualiza como inválido$/,
      (costoInicial: string) => {
        const id = porCostoInicial.get(Number(costoInicial));
        const item = ctx.respuesta.body.find((p: { id: number }) => p.id === id);
        expect(item.valido).toBe(false);
      },
    );

    and(
      /^la previsualización informa (\d+) producto inválido de (\d+)$/,
      (invalidos: string, total: string) => {
        const items = ctx.respuesta.body as { valido: boolean }[];
        expect(items.filter((p) => !p.valido)).toHaveLength(Number(invalidos));
        expect(items).toHaveLength(Number(total));
      },
    );
  });

  test('La previsualización rechaza valores que no producen un cambio válido', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(/^previsualizo (.*) sobre la línea "(.*)"$/, async (ajuste: string, linea: string) => {
      const valor = Number(/(-?\d+)/.exec(ajuste)?.[1]);
      const tipoAjuste = ajuste.includes('margen')
        ? TipoAjustePrecio.MARGEN
        : tipoDeAjusteDelCosto(ajuste);
      await previsualizar({ tipoAjuste, valor, ...alcanceLinea(linea) });
    });

    verificarRechazo(then);
  });

  test('Un ajuste que dejaría un costo en cero o menos rechaza toda la operación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteDelCostoALinea(when);

    then(/^la operación es rechazada$/, () => {
      expect(ctx.respuesta.status).toBeGreaterThanOrEqual(400);
    });
    verificarCostoYPrecio(and);
    verificarCostoYPrecio(and);
  });

  test('Asignar un margen negativo rechaza toda la operación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAsignarMargenALinea(when);
    verificarRechazo(then);
    verificarCostoYPrecio(and);
  });

  test('El ajuste rechaza un alcance mal indicado', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^aplico un ajuste de (-?\d+) por ciento con alcance (.*)$/,
      async (valor: string, alcance: string) => {
        const cuerpo: Record<string, unknown> = {
          tipoAjuste: TipoAjustePrecio.COSTO_PORCENTUAL,
          valor: Number(valor),
          alcance: 'linea',
        };
        if (alcance.includes('inexistente')) {
          cuerpo.lineaId = 999;
        }
        await aplicar(cuerpo);
      },
    );

    verificarRechazo(then);
  });
});
