import * as path from 'path';
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(
  path.resolve(__dirname, '../features/superlinea.feature'),
);

/**
 * CR-003 (SuperLínea): la funcionalidad no está integrada en develop, así que
 * todos los escenarios se registran como pendientes. Quedan documentados y
 * listos para implementarse cuando se mergee la rama feature/CR-003.
 */
defineFeature(feature, (test) => {
  const pendiente = () => {
    // Sin implementación: el escenario está saltado.
  };

  function fondo(given: any, and: any) {
    given(/^existe la superlínea "(.*)"$/, pendiente);
    and(/^existe la línea "(.*)" de la superlínea "(.*)"$/, pendiente);
  }

  test.skip('Dar de alta una superlínea', ({ given, and, when, then }) => {
    fondo(given, and);
    when(/^doy de alta la superlínea "(.*)"$/, pendiente);
    then(/^la superlínea se guarda correctamente$/, pendiente);
    and(
      /^la superlínea "(.*)" queda disponible para asignar a una línea$/,
      pendiente,
    );
  });

  test.skip('Renombrar una superlínea conserva sus líneas asociadas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    when(
      /^modifico la superlínea "(.*)" con la denominación "(.*)"$/,
      pendiente,
    );
    then(
      /^la línea "(.*)" sigue perteneciendo a la superlínea "(.*)"$/,
      pendiente,
    );
  });

  test.skip('Reasignar una línea a otra superlínea', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    given(/^existe la superlínea "(.*)"$/, pendiente);
    when(/^asigno la línea "(.*)" a la superlínea "(.*)"$/, pendiente);
    then(
      /^la línea "(.*)" pertenece únicamente a la superlínea "(.*)"$/,
      pendiente,
    );
  });

  test.skip('El listado de precios se agrupa por superlínea y línea', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    given(/^existe la marca "(.*)"$/, pendiente);
    and(/^existe un producto de la marca "(.*)" y línea "(.*)"$/, pendiente);
    when(/^consulto el listado de precios agrupado$/, pendiente);
    then(
      /^los productos aparecen agrupados primero por superlínea y dentro de ella por línea$/,
      pendiente,
    );
    and(
      /^cada producto muestra denominación, presentación, costo, margen y precio$/,
      pendiente,
    );
  });

  test.skip('El alta de la superlínea rechaza denominaciones inválidas o repetidas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    when(/^doy de alta la superlínea con el valor (.*)$/, pendiente);
    then(/^la operación es rechazada con el estado (\d+)$/, pendiente);
  });

  test.skip('La superlínea es obligatoria al dar de alta una línea', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    when(/^doy de alta la línea "(.*)" sin superlínea$/, pendiente);
    then(/^la operación es rechazada con el estado (\d+)$/, pendiente);
  });

  test.skip('No se puede eliminar una superlínea con líneas asignadas', ({
    given,
    and,
    when,
    then,
  }) => {
    fondo(given, and);
    when(/^elimino la superlínea "(.*)"$/, pendiente);
    then(/^la operación es rechazada con el estado (\d+)$/, pendiente);
    and(/^la superlínea "(.*)" sigue existiendo$/, pendiente);
  });
});
