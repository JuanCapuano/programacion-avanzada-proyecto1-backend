import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ContextoProducto } from '../support/contexto-producto';
import { UnidadMedida } from 'src/modules/gestion-productos/producto/domain/enums/unidad-medida.enum';

const feature = loadFeature(
  path.resolve(__dirname, '../features/producto-denominacion.feature'),
);

const USUARIO_ID = 9;
const COSTO_POR_DEFECTO = 1000;

defineFeature(feature, (test) => {
  let ctx: ContextoProducto;
  let previsualizacion: string;
  let idProductoRenombrado: number;

  beforeEach(async () => {
    ctx = new ContextoProducto();
    await ctx.iniciar();
    previsualizacion = '';
  });

  afterEach(async () => {
    await ctx.cerrar();
  });

  // ------------------------------------------------------------------
  // Acciones contra la API (lo único que conoce rutas y cuerpos HTTP)
  // ------------------------------------------------------------------

  async function altaDeProducto(
    marca: string,
    linea: string,
    cantidad: number,
    unidad: string,
    denominacion?: string,
  ) {
    const cuerpo: Record<string, unknown> = {
      marcaId: marca === 'INEXISTENTE' ? 999 : ctx.idMarca(marca),
      lineaId: ctx.idLinea(linea),
      alicuotaIva: 21,
      utilizaStockMinimo: false,
      utilizaPack: false,
      usuarioCreatedId: USUARIO_ID,
      costo: COSTO_POR_DEFECTO,
      presentacionCantidad: cantidad,
      presentacionUnidad: unidad as UnidadMedida,
    };
    if (denominacion !== undefined) {
      cuerpo.denominacion = denominacion;
    }
    ctx.respuesta = await ctx.http.post('/producto').send(cuerpo);
  }

  async function previsualizar(
    marcaId: number,
    lineaId: number,
    cantidad: number,
    unidad: string,
  ) {
    ctx.respuesta = await ctx.http.get(
      `/producto/denominacion/previsualizar?marcaId=${marcaId}&lineaId=${lineaId}` +
        `&presentacionCantidad=${cantidad}&presentacionUnidad=${unidad}`,
    );
    previsualizacion = ctx.respuesta.body?.denominacion;
  }

  async function renombrar(id: number, denominacion: unknown) {
    ctx.respuesta = await ctx.http
      .put(`/producto/${id}`)
      .send({ denominacion, usuarioUpdatedId: USUARIO_ID });
  }

  async function restaurar(id: number) {
    ctx.respuesta = await ctx.http.patch(
      `/producto/${id}/restaurar-denominacion?usuarioId=${USUARIO_ID}`,
    );
  }

  /** Traduce los valores escritos en las tablas Examples a datos reales. */
  function valorDeTabla(valor: string): string {
    if (valor === 'vacío') return '';
    if (valor === 'solo espacios') return '   ';
    if (valor === '250 caracteres') return 'a'.repeat(250);
    return valor;
  }

  // ------------------------------------------------------------------
  // Pasos reutilizables
  // ------------------------------------------------------------------

  function pasosDeFondo(given: any, and: any) {
    given(/^existe la marca "(.*)"$/, (nombre: string) =>
      ctx.darDeAltaMarca(nombre),
    );
    and(/^existe la marca "(.*)"$/, (nombre: string) =>
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
        expect(ctx.respuesta.status).toBe(201);
      },
    );
  }

  function pasoRenombrarComo(paso: any) {
    paso(/^renombro el producto como "(.*)"$/, async (nombre: string) => {
      idProductoRenombrado = ctx.ultimoProducto.id;
      await renombrar(idProductoRenombrado, nombre);
      expect(ctx.respuesta.status).toBe(200);
    });
  }

  function pasoCambiarMarca(paso: any) {
    paso(
      /^cambio la marca del producto a "(.*)" y reenvío su denominación actual$/,
      async (marca: string) => {
        const producto = ctx.ultimoProducto;
        ctx.respuesta = await ctx.http.put(`/producto/${producto.id}`).send({
          marcaId: ctx.idMarca(marca),
          denominacion: producto.denominacion,
          usuarioUpdatedId: USUARIO_ID,
        });
      },
    );
  }

  function pasoRestaurar(paso: any) {
    paso(/^restauro la denominación automática del producto$/, async () => {
      await restaurar(ctx.ultimoProducto.id);
    });
  }

  function verificarDenominacion(paso: any) {
    paso(/^la denominación del producto es "(.*)"$/, (esperada: string) => {
      expect(ctx.ultimoProducto.denominacion).toBe(esperada);
    });
  }

  function verificarOrigen(paso: any) {
    paso(/^el origen de la denominación es "(.*)"$/, (esperado: string) => {
      expect(ctx.ultimoProducto.origenDenominacion).toBe(esperado);
    });
  }

  function verificarGuardado(paso: any) {
    paso(/^el producto se guarda correctamente$/, () => {
      expect(ctx.respuesta.status).toBe(201);
    });
  }

  function verificarRechazo(paso: any) {
    paso(
      /^la operación es rechazada con el estado (\d+)$/,
      (estado: string) => {
        expect(ctx.respuesta.status).toBe(Number(estado));
      },
    );
  }

  // ------------------------------------------------------------------
  // Escenarios
  // ------------------------------------------------------------------

  test('La denominación se genera a partir de marca, línea y presentación', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, Number(cantidad), unidad);
      },
    );

    verificarGuardado(then);
    verificarDenominacion(and);
    verificarOrigen(and);
  });

  test('La denominación se puede previsualizar antes de guardar', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^previsualizo la denominación de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await previsualizar(
          ctx.idMarca(marca),
          ctx.idLinea(linea),
          Number(cantidad),
          unidad,
        );
      },
    );

    then(/^la denominación previsualizada es "(.*)"$/, (esperada: string) => {
      expect(ctx.respuesta.status).toBe(200);
      expect(previsualizacion).toBe(esperada);
    });
    and(/^no se guarda ningún producto$/, () => {
      expect(ctx.productos).toHaveLength(0);
    });
  });

  test('La previsualización se actualiza al cambiar un componente', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    const previsualizarPaso = async (
      marca: string,
      linea: string,
      cantidad: string,
      unidad: string,
    ) => {
      await previsualizar(
        ctx.idMarca(marca),
        ctx.idLinea(linea),
        Number(cantidad),
        unidad,
      );
    };

    given(
      /^previsualizo la denominación de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      previsualizarPaso,
    );
    when(
      /^previsualizo la denominación de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      previsualizarPaso,
    );
    then(/^la denominación previsualizada es "(.*)"$/, (esperada: string) => {
      expect(previsualizacion).toBe(esperada);
    });
  });

  test('La denominación previsualizada es la que después se guarda', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    given(
      /^previsualizo la denominación de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await previsualizar(
          ctx.idMarca(marca),
          ctx.idLinea(linea),
          Number(cantidad),
          unidad,
        );
      },
    );
    when(
      /^doy de alta un producto de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (marca: string, linea: string, cantidad: string, unidad: string) => {
        await altaDeProducto(marca, linea, Number(cantidad), unidad);
      },
    );
    then(/^la denominación del producto es igual a la previsualizada$/, () => {
      expect(ctx.ultimoProducto.denominacion).toBe(previsualizacion);
    });
  });

  test('El usuario puede escribir su propia denominación al dar de alta', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^doy de alta un producto llamado "(.*)" de la marca "(.*)", línea "(.*)" y presentación (.*) "(.*)"$/,
      async (
        denominacion: string,
        marca: string,
        linea: string,
        cantidad: string,
        unidad: string,
      ) => {
        await altaDeProducto(
          marca,
          linea,
          Number(cantidad),
          unidad,
          denominacion,
        );
      },
    );

    verificarGuardado(then);
    verificarDenominacion(and);
    verificarOrigen(and);
  });

  test('Cambiar la marca regenera una denominación automática', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoCambiarMarca(when);
    verificarDenominacion(then);
    verificarOrigen(and);
  });

  test('La denominación manual no se sobrescribe y puede restaurarse', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoRenombrarComo(and);
    verificarOrigen(then);
    pasoCambiarMarca(when);
    verificarDenominacion(then);
    pasoRestaurar(when);
    verificarDenominacion(then);
    verificarOrigen(and);
  });

  test('La consulta del producto informa si su denominación es automática o manual', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoRenombrarComo(and);

    when(/^consulto el producto por su identificador$/, async () => {
      ctx.respuesta = await ctx.http.get(`/producto/${ctx.ultimoProducto.id}`);
    });
    then(
      /^la respuesta indica el origen de la denominación "(.*)"$/,
      (esperado: string) => {
        expect(ctx.respuesta.status).toBe(200);
        expect(ctx.respuesta.body.origenDenominacion).toBe(esperado);
      },
    );
  });

  test('La denominación editada no puede quedar vacía ni superar los 200 caracteres', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);

    when(/^renombro el producto con el valor (.*)$/, async (valor: string) => {
      await renombrar(ctx.ultimoProducto.id, valorDeTabla(valor));
    });

    verificarRechazo(then);
    verificarDenominacion(and);
  });

  test('No pueden existir dos productos con la misma denominación', ({
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
        await altaDeProducto(marca, linea, Number(cantidad), unidad);
      },
    );

    verificarRechazo(then);
  });

  test('No se puede restaurar una denominación que ya usa otro producto', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);
    pasoProductoAutomatico(given);
    pasoRenombrarComo(and);
    pasoProductoAutomatico(and);

    when(
      /^restauro la denominación automática del producto renombrado$/,
      async () => {
        await restaurar(idProductoRenombrado);
      },
    );

    verificarRechazo(then);
    and(
      /^la denominación del producto renombrado sigue siendo "(.*)"$/,
      (esperada: string) => {
        const renombrado = ctx.productos.find(
          (p) => p.id === idProductoRenombrado,
        );
        expect(renombrado?.denominacion).toBe(esperada);
      },
    );
  });

  test('No se puede previsualizar con una marca inexistente', ({
    given,
    and,
    when,
    then,
  }) => {
    pasosDeFondo(given, and);

    when(
      /^previsualizo la denominación de una marca inexistente, línea "(.*)" y presentación (.*) "(.*)"$/,
      async (linea: string, cantidad: string, unidad: string) => {
        await previsualizar(999, ctx.idLinea(linea), Number(cantidad), unidad);
      },
    );

    verificarRechazo(then);
  });
});
