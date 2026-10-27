import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectPaises, filtrarPaises } from './paisFilter.js';

test('collectPaises junta páginas, descarta vacíos y no repite', () => {
  const pages = [
    [{ pais: 'Colombia' }, { pais: 'México' }, { pais: null }, { pais: '' }],
    [{ pais: 'Colombia' }, { pais: 'Perú' }, null],
  ];
  assert.deepEqual(collectPaises(pages), ['Colombia', 'México', 'Perú']);
});

test('collectPaises ordena con las tildes del español', () => {
  assert.deepEqual(
    collectPaises([[{ pais: 'Perú' }, { pais: 'Panamá' }, { pais: 'Chile' }]]),
    ['Chile', 'Panamá', 'Perú'],
  );
});

test('filtrarPaises ignora mayúsculas y tildes', () => {
  const paises = ['México', 'Perú', 'Panamá'];
  assert.deepEqual(filtrarPaises(paises, 'peru'), ['Perú']);
  assert.deepEqual(filtrarPaises(paises, '  MEX '), ['México']);
  assert.deepEqual(filtrarPaises(paises, 'pana'), ['Panamá']);
});

test('filtrarPaises sin texto devuelve la lista completa y sin coincidencias queda vacía', () => {
  const paises = ['Chile', 'Colombia'];
  assert.deepEqual(filtrarPaises(paises, '   '), paises);
  assert.deepEqual(filtrarPaises(paises, 'argentina'), []);
});
