import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OPCIONES_LLAMADA,
  OPCIONES_MENSAJE,
  SIGLA_LLAMADA_DEFAULT,
  SIGLA_MENSAJE_DEFAULT,
  camposCanal,
  prefijoDetalleCanal,
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

test('por defecto el mensaje es MNC. y la llamada LNC.', () => {
  assert.equal(SIGLA_MENSAJE_DEFAULT, 'MNC.');
  assert.equal(SIGLA_LLAMADA_DEFAULT, 'LNC.');
  assert.ok(OPCIONES_MENSAJE.includes(SIGLA_MENSAJE_DEFAULT));
  assert.ok(OPCIONES_LLAMADA.includes(SIGLA_LLAMADA_DEFAULT));
});

test('el detalle antepone mensaje y luego llamada entre paréntesis', () => {
  assert.equal(
    prefijoDetalleCanal('LNC.', 'MNC.'),
    '(MNC. - LNC.) '
  );
  assert.equal(
    `${prefijoDetalleCanal('LNC.', 'MNC.')}Llamar al doctor en horas de la tarde`,
    '(MNC. - LNC.) Llamar al doctor en horas de la tarde'
  );
  assert.equal(prefijoDetalleCanal(null, 'MNC.'), '(MNC.) ');
  assert.equal(prefijoDetalleCanal('LC.', null), '(LC.) ');
  assert.equal(prefijoDetalleCanal(null, null), '');
});
