import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OPCIONES_LLAMADA,
  OPCIONES_MENSAJE,
  camposCanal,
  tieneSiglaCanal,
} from './canalSiglas.js';

test('las opciones de llamada y mensaje son las siglas acordadas, con punto', () => {
  assert.deepEqual(OPCIONES_LLAMADA, ['LNC.', 'LC.', 'LA.']);
  assert.deepEqual(OPCIONES_MENSAJE, ['MC.', 'MNC.', 'MA.']);
});

test('hay que elegir llamada, mensaje o las dos', () => {
  assert.equal(tieneSiglaCanal(null, null), false);
  assert.equal(tieneSiglaCanal('', ''), false);
  assert.equal(tieneSiglaCanal('LNC.', null), true);
  assert.equal(tieneSiglaCanal(null, 'MC.'), true);
  assert.equal(tieneSiglaCanal('LC.', 'MNC.'), true);
});

test('el payload deja null lo que no se eligió', () => {
  assert.deepEqual(camposCanal('LNC.', null), { llamada: 'LNC.', mensaje: null });
  assert.deepEqual(camposCanal(null, 'MA.'), { llamada: null, mensaje: 'MA.' });
  assert.deepEqual(camposCanal('LA.', 'MC.'), { llamada: 'LA.', mensaje: 'MC.' });
  assert.deepEqual(camposCanal('', ''), { llamada: null, mensaje: null });
});
