const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Ejecutar con la API local iniciada: node --test test/cr004.integration.cjs
// Los fixtures se eliminan al finalizar, incluso si una prueba falla.
test('CR-004: búsquedas de catálogo contra API y MySQL locales', async (t) => {
  assert.ok(['localhost', '127.0.0.1'].includes(process.env.DB_HOST));
  assert.equal(process.env.DB_DATABASE, 'proyecto_cr004', 'Usar exclusivamente la base local de pruebas');
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE });
  const ids = { producto: [], linea: [], super_linea: [], marca: [] };
  const prefijo = `CR004-${Date.now()}`;
  const insertar = async (tabla, valores) => {
    const [r] = await db.query(`INSERT INTO ${tabla} SET ?`, valores);
    ids[tabla].push(r.insertId); return r.insertId;
  };
  try {
    const marca = await insertar('marca', { denominacion: prefijo });
    const bebidas = await insertar('super_linea', { denominacion: `${prefijo} Bebidas` });
    const alimentos = await insertar('super_linea', { denominacion: `${prefijo} Alimentos` });
    const gaseosas = await insertar('linea', { denominacion: `${prefijo} Gaseosas`, super_linea_id: bebidas });
    const jugos = await insertar('linea', { denominacion: `${prefijo} Jugos`, super_linea_id: bebidas });
    const dulces = await insertar('linea', { denominacion: `${prefijo} Dulces`, super_linea_id: alimentos });
    const producto = (nombre, linea, extra = {}) => insertar('producto', {
      denominacion: `${prefijo} ${nombre}`, linea_id: linea, marca_id: marca, ...extra,
    });
    const coca = await producto('Coca Cola', gaseosas);
    const sprite = await producto('Sprite', gaseosas);
    const jugo = await producto('Jugo naranja 100%', jugos);
    const dulce = await producto('Coca dulce', dulces);
    const sinLinea = await producto('Sin línea', null);
    await producto('Coca eliminada', gaseosas, { deletedAt: new Date() });
    const login = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mail: 'administrador@gmail.com', contrasena: '12345678', empresaId: 1 }),
    });
    assert.equal(login.status, 201);
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const consultar = async (params = {}, endpoint = 'search-catalogo') => {
      const r = await fetch(`http://127.0.0.1:3000/api/producto/${endpoint}?${new URLSearchParams(params)}`, { headers });
      assert.equal(r.status, 200); return r.json();
    };
    const comprobar = async (params, esperados) => {
      const r = await consultar(params);
      assert.equal(r.total, esperados.length);
      assert.deepEqual(r.data.map(p => p.id).sort((a,b)=>a-b), esperados.sort((a,b)=>a-b));
    };
    await t.test('denominación parcial, mayúsculas y espacios', () => comprobar({ denominacion: `  ${prefijo.toLowerCase()} COCA  ` }, [coca, dulce]));
    await t.test('línea parcial', () => comprobar({ linea: ` ${prefijo.toLowerCase()} gAs ` }, [coca, sprite]));
    await t.test('superlínea parcial', () => comprobar({ superLinea: ` ${prefijo.toLowerCase()} beB ` }, [coca, sprite, jugo]));
    await t.test('AND entre los tres filtros', () => comprobar({ denominacion: 'coca', linea: `${prefijo} gas`, superLinea: 'beb' }, [coca]));
    await t.test('combinación incompatible', () => comprobar({ linea: `${prefijo} gas`, superLinea: 'alimentos' }, []));
    await t.test('campos blancos se ignoran y se incluyen productos sin línea', () => comprobar({ denominacion: prefijo, linea: '   ', superLinea: '  ' }, [coca, sprite, jugo, dulce, sinLinea]));
    await t.test('comodines literales', () => comprobar({ denominacion: '%', superLinea: `${prefijo} beb` }, [jugo]));
    await t.test('paginación mantiene total y no repite productos', async () => {
      const a = await consultar({ denominacion: prefijo, take: 2, skip: 0 });
      const b = await consultar({ denominacion: prefijo, take: 2, skip: 2 });
      assert.equal(a.total, 5); assert.equal(b.total, 5);
      assert.equal(new Set([...a.data, ...b.data].map(p=>p.id)).size, 4);
    });
    await t.test('campo único encuentra denominación o línea o superlínea', async () => {
      await comprobar({ texto: `  ${prefijo.toLowerCase()} COCA  ` }, [coca, dulce]);
      await comprobar({ texto: `${prefijo} gas` }, [coca, sprite]);
      await comprobar({ texto: `${prefijo} beb` }, [coca, sprite, jugo]);
      await comprobar({ texto: `${prefijo} inexistente` }, []);
    });
    await t.test('checkboxes limitan los campos del texto y conservan OR', async () => {
      const ninguno = { buscarDenominacion: false, buscarLinea: false, buscarSuperLinea: false };
      await comprobar({ ...ninguno, buscarDenominacion: true, texto: `${prefijo} Coca` }, [coca, dulce]);
      await comprobar({ ...ninguno, buscarLinea: true, texto: `${prefijo} Coca` }, []);
      await comprobar({ ...ninguno, buscarLinea: true, texto: `${prefijo} Gas` }, [coca, sprite]);
      await comprobar({ ...ninguno, buscarSuperLinea: true, texto: `${prefijo} Gas` }, []);
      await comprobar({ ...ninguno, buscarSuperLinea: true, texto: `${prefijo} Beb` }, [coca, sprite, jugo]);
      await comprobar({ ...ninguno, buscarDenominacion: true, texto: `${prefijo} Beb` }, []);
      await comprobar({ ...ninguno, buscarLinea: true, buscarSuperLinea: true, texto: `${prefijo} Beb` }, [coca, sprite, jugo]);
      await comprobar({ ...ninguno, texto: prefijo }, []);
      const primera = await consultar({ ...ninguno, buscarSuperLinea: true, texto: `${prefijo} Beb`, take: 1, skip: 0 });
      const segunda = await consultar({ ...ninguno, buscarSuperLinea: true, texto: `${prefijo} Beb`, take: 1, skip: 1 });
      assert.equal(primera.total, 3);
      assert.equal(segunda.total, 3);
      assert.notEqual(primera.data[0].id, segunda.data[0].id);
    });
    await t.test('checkbox inválido se rechaza', async () => {
      const r = await fetch('http://127.0.0.1:3000/api/producto/search-catalogo?buscarLinea=abc', { headers });
      assert.equal(r.status, 400);
    });
    await t.test('paginación inválida se rechaza', async () => {
      const r = await fetch('http://127.0.0.1:3000/api/producto/search-catalogo?skip=-1&take=101', { headers });
      assert.equal(r.status, 400);
    });
    await t.test('sin autenticación se rechaza', async () => {
      const r = await fetch('http://127.0.0.1:3000/api/producto/search-catalogo');
      assert.equal(r.status, 401);
    });
    await t.test('la consulta existente mantiene su contrato', async () => {
      const r = await consultar({ denominacion: prefijo, lineaId: gaseosas }, 'search-by');
      assert.deepEqual(r.data.map(p=>p.id).sort((a,b)=>a-b), [coca,sprite].sort((a,b)=>a-b));
    });
  } finally {
    for (const tabla of ['producto', 'linea', 'super_linea', 'marca']) {
      if (ids[tabla].length) await db.query(`DELETE FROM ${tabla} WHERE id IN (?)`, [ids[tabla]]);
    }
    await db.end();
  }
});
