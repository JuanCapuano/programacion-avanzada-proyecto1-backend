import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';

const feature = loadFeature(
  path.resolve(__dirname, '../features/actualizacion-masiva-precios.feature'),
);

const USUARIO_ID = 9;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;
  /** Precio inicial de cada producto -> id, para poder identificarlos después. */
  let porPrecioInicial: Map<number, number>;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
    porPrecioInicial = new Map();
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  /** Crea un producto cuyo precio final es exactamente el pedido (margen 0). */
  async function altaConPrecio(linea: string, precio: number) {
    ctx.respuesta = await ctx.http.post('/producto').send({
      marcaId: ctx.idMarca('CAROYENSE'),
      lineaId: ctx.idLinea(linea),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo: precio,
      porcentaje: 0,
      presentacionCantidad: ctx.productos.length + 1,
      presentacionUnidad: 'l',
    });
    expect(ctx.respuesta.status).toBe(201);
    porPrecioInicial.set(precio, ctx.ultimoProducto.id);
  }

  function tipoAjuste(tipo: string): 'porcentaje' | 'monto' {
    return tipo.includes('ciento') ? 'porcentaje' : 'monto';
  }

  async function aplicarAjuste(cuerpo: Record<string, unknown>) {
    ctx.respuesta = await ctx.http
      .put('/producto/precios/actualizacion-masiva')
      .send({ usuarioId: USUARIO_ID, ...cuerpo });
  }

  function precioDe(id: number | undefined): number {
    return Number(ctx.productoPorId(id as number)?.precio ?? 0);
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
      /^existe un producto de la línea "(.*)" con precio (\d+)$/,
      async (linea: string, precio: string) =>
        altaConPrecio(linea, Number(precio)),
    );
    and(
      /^existe un producto de la línea "(.*)" con precio (\d+)$/,
      async (linea: string, precio: string) =>
        altaConPrecio(linea, Number(precio)),
    );
    and(
      /^existe un producto de la línea "(.*)" con precio (\d+)$/,
      async (linea: string, precio: string) =>
        altaConPrecio(linea, Number(precio)),
    );
  }

  function pasoAjusteALinea(paso: any) {
    paso(
      /^aplico un (?:ajuste|aumento|descuento) de (-?\d+) (por ciento|pesos) a la línea "(.*)"$/,
      async (valor: string, tipo: string, linea: string) => {
        const signo = /descuento/.test('descuento') ? 1 : 1;
        await aplicarAjuste({
          tipoAjuste: tipoAjuste(tipo),
          valor: Number(valor) * signo,
          alcance: 'linea',
          lineaId: ctx.idLinea(linea),
        });
      },
    );
  }

  function verificarPrecioResultante(paso: any) {
    paso(
      /^el producto de precio (\d+) pasa a valer (\d+)$/,
      (inicial: string, esperado: string) => {
        expect(precioDe(porPrecioInicial.get(Number(inicial)))).toBe(
          Number(esperado),
        );
      },
    );
  }

  // ------------------------------------------------------------ escenarios

  test('Aplicar un ajuste válido por porcentaje o por monto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteALinea(when);

    then(/^la operación se realiza correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(200);
    });
    verificarPrecioResultante(and);
    verificarPrecioResultante(and);
  });

  test('El ajuste por línea no afecta a los productos de otras líneas', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteALinea(when);

    then(
      /^el producto de la línea "(.*)" mantiene su precio (\d+)$/,
      (_linea: string, precio: string) => {
        expect(precioDe(porPrecioInicial.get(Number(precio)))).toBe(
          Number(precio),
        );
      },
    );
    and(
      /^el resultado informa (\d+) productos actualizados$/,
      (cantidad: string) => {
        // La respuesta del ajuste masivo es un mensaje para el front.
        expect(ctx.respuesta.body.mensaje).toContain(`${cantidad} producto`);
      },
    );
  });

  test('Aplicar un ajuste a todo el catálogo', ({ given, and, when, then }) => {
    pasosDeFondo(given, and);

    when(
      /^aplico un ajuste de (-?\d+) (por ciento|pesos) a todo el catálogo$/,
      async (valor: string, tipo: string) => {
        await aplicarAjuste({
          tipoAjuste: tipoAjuste(tipo),
          valor: Number(valor),
          alcance: 'global',
        });
      },
    );

    verificarPrecioResultante(then);
    and(
      /^el producto de la línea "(.*)" pasa a valer (\d+)$/,
      (_linea: string, esperado: string) => {
        expect(precioDe(porPrecioInicial.get(200))).toBe(Number(esperado));
      },
    );
  });

  test('El margen de cada producto queda recalculado después del ajuste', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteALinea(when);

    then(
      /^el margen de cada producto afectado refleja su nuevo precio$/,
      () => {
        for (const precioInicial of [100, 500]) {
          const producto = ctx.productoPorId(
            porPrecioInicial.get(precioInicial) as number,
          );
          const costo = Number(producto?.costo ?? 0);
          const precio = Number(producto?.precio ?? 0);
          const margenEsperado = (precio / costo - 1) * 100;
          expect(Number(producto?.porcentaje)).toBeCloseTo(margenEsperado, 5);
        }
      },
    );
  });

  test('Previsualizar un ajuste muestra el precio actual y el resultante sin modificar nada', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^previsualizo un ajuste de (-?\d+) (por ciento|pesos) sobre la línea "(.*)"$/,
      async (valor: string, tipo: string, linea: string) => {
        ctx.respuesta = await ctx.http
          .post('/producto/precios/actualizacion-masiva/preview')
          .send({
            tipoAjuste: tipoAjuste(tipo),
            valor: Number(valor),
            alcance: 'linea',
            lineaId: ctx.idLinea(linea),
            usuarioId: USUARIO_ID,
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
      /^la previsualización muestra el precio actual y el precio resultante de cada producto$/,
      () => {
        for (const item of ctx.respuesta.body) {
          expect(item.precioActual).toBeDefined();
          expect(item.precioResultante).toBeDefined();
        }
      },
    );
    and(
      /^el producto de precio (\d+) mantiene su precio (\d+)$/,
      (inicial: string, esperado: string) => {
        expect(precioDe(porPrecioInicial.get(Number(inicial)))).toBe(
          Number(esperado),
        );
      },
    );
  });

  test('Un ajuste que dejaría algún precio en cero o negativo rechaza toda la operación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoAjusteALinea(when);

    then(/^la operación es rechazada$/, () => {
      expect(ctx.respuesta.status).toBeGreaterThanOrEqual(400);
    });
    and(
      /^ningún producto de la línea "(.*)" cambió su precio$/,
      () => {
        expect(precioDe(porPrecioInicial.get(100))).toBe(100);
        expect(precioDe(porPrecioInicial.get(500))).toBe(500);
      },
    );
  });

  test('El ajuste rechaza parámetros inválidos', ({
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
          tipoAjuste: 'porcentaje',
          valor: Number(valor),
          alcance: 'linea',
        };
        if (alcance.includes('ACEITES')) {
          cuerpo.lineaId = ctx.idLinea('ACEITES');
        } else if (alcance.includes('inexistente')) {
          cuerpo.lineaId = 999;
        }
        await aplicarAjuste(cuerpo);
      },
    );

    then(/^la operación es rechazada con el estado (\d+)$/, (estado: string) => {
      expect(ctx.respuesta.status).toBe(Number(estado));
    });
  });
});
