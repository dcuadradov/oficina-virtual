import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contarPaises, filtrarPaises, formatoConteoLeads, opcionesPais } from './paisFilter.js';

test('contarPaises junta páginas, ignora vacíos y ordena por cantidad', () => {
  const pages = [
    [{ pais: 'Colombia' }, { pais: 'México' }, { pais: null }, { pais: '' }],
    [{ pais: 'Colombia' }, { pais: 'Perú' }, { pais: 'Colombia' }, null],
  ];
  assert.deepEqual(contarPaises(pages), [
    { pais: 'Colombia', count: 3 },
    { pais: 'México', count: 1 },
    { pais: 'Perú', count: 1 },
  ]);
});

test('opcionesPais conserva un país marcado aunque el resto de filtros lo deje en cero', () => {
  assert.deepEqual(
    opcionesPais([{ pais: 'México', count: 4 }], ['Chile']),
    [
      { pais: 'México', count: 4 },
      { pais: 'Chile', count: 0 },
    ],
  );
});

test('filtrarPaises ignora mayúsculas y tildes', () => {
  const paises = [
    { pais: 'México', count: 10 },
    { pais: 'Perú', count: 2 },
    { pais: 'Panamá', count: 1 },
  ];
  assert.deepEqual(filtrarPaises(paises, 'peru'), [{ pais: 'Perú', count: 2 }]);
  assert.deepEqual(filtrarPaises(paises, '  MEX '), [{ pais: 'México', count: 10 }]);
  assert.deepEqual(filtrarPaises(paises, 'argentina'), []);
});

test('formatoConteoLeads usa separador de miles', () => {
  assert.equal(formatoConteoLeads(1591), '1.591');
  assert.equal(formatoConteoLeads(0), '0');
});
