import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OPCIONES_LLAMADA,
  OPCIONES_MENSAJE,
  SIGLA_LLAMADA_DEFAULT,
  SIGLA_MENSAJE_DEFAULT,
  camposCanal,
  enriquecerComentarioConCanal,
  encontrarRecordatorioDeComentario,
  origenEsRecordatorio,
  prefijoDetalleCanal,
  textoDetalleConCanal,
  tieneSiglaCanal,
} from './canalSiglas.js';

test('las opciones de llamada y mensaje son las siglas acordadas, con punto', () => {
  assert.deepEqual(OPCIONES_LLAMADA, ['LNC.', 'LC.', 'LA.', 'LNE.']);
  assert.deepEqual(OPCIONES_MENSAJE, ['MC.', 'MNC.', 'MA.', 'MNE.']);
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

test('el detalle concatena el prefijo con el texto de comentarios o de recordatorios', () => {
  assert.equal(
    textoDetalleConCanal('Llamar al doctor en horas de la tarde', 'LNC.', 'MNC.'),
    '(MNC. - LNC.) Llamar al doctor en horas de la tarde'
  );
  assert.equal(textoDetalleConCanal('Sin observación', null, null), 'Sin observación');
  assert.equal(textoDetalleConCanal(null, 'LNC.', 'MNC.'), '(MNC. - LNC.)');
  assert.equal(textoDetalleConCanal('   ', 'LC.', null), '(LC.)');
});

test('la tabla usa el mismo detalle que el sidebar, con categoría delante', () => {
  const detalle = textoDetalleConCanal('Vamos a ver si funcionó', 'LNC.', 'MNC.');
  assert.equal(detalle, '(MNC. - LNC.) Vamos a ver si funcionó');
  assert.equal(`Otro • ${detalle}`, 'Otro • (MNC. - LNC.) Vamos a ver si funcionó');
});

test('el origen Recordatorio se reconoce aunque cambie mayúsculas', () => {
  assert.equal(origenEsRecordatorio('Recordatorio'), true);
  assert.equal(origenEsRecordatorio('recordatorio'), true);
  assert.equal(origenEsRecordatorio('Seguimiento'), false);
});

test('si el comentario no trae siglas, se toman de recordatorios.observacion', () => {
  const comentario = {
    texto: 'Llamar al doctor en horas de la tarde',
    origen: 'Recordatorio',
    created_at: '2026-11-05T15:00:00.000Z',
    llamada: null,
    mensaje: null,
  };
  const rec = {
    observacion: 'Llamar al doctor en horas de la tarde',
    llamada: 'LNC.',
    mensaje: 'MNC.',
    created_at: '2026-11-05T15:00:01.000Z',
  };
  const enriquecido = enriquecerComentarioConCanal(comentario, [rec]);
  assert.equal(encontrarRecordatorioDeComentario(comentario, [rec]), rec);
  assert.equal(enriquecido.llamada, 'LNC.');
  assert.equal(enriquecido.mensaje, 'MNC.');
  assert.equal(
    textoDetalleConCanal(enriquecido.texto, enriquecido.llamada, enriquecido.mensaje),
    '(MNC. - LNC.) Llamar al doctor en horas de la tarde'
  );
});

test('si el comentario ya tiene siglas, no se pisan con las del recordatorio', () => {
  const comentario = {
    texto: 'Seguimiento propio',
    origen: 'Seguimiento',
    llamada: 'LC.',
    mensaje: 'MC.',
  };
  const rec = {
    observacion: 'Seguimiento propio',
    llamada: 'LA.',
    mensaje: 'MA.',
    created_at: '2026-11-05T15:00:00.000Z',
  };
  assert.deepEqual(enriquecerComentarioConCanal(comentario, [rec]), comentario);
});

test('un seguimiento viejo no hereda siglas de un recordatorio con el mismo texto', () => {
  const comentario = {
    texto: 'Llamar mañana',
    origen: 'Seguimiento',
    created_at: '2026-10-01T12:00:00.000Z',
    llamada: null,
    mensaje: null,
  };
  const rec = {
    observacion: 'Llamar mañana',
    llamada: 'LNC.',
    mensaje: 'MNC.',
    created_at: '2026-11-05T15:00:00.000Z',
  };
  assert.equal(encontrarRecordatorioDeComentario(comentario, [rec]), null);
  assert.deepEqual(enriquecerComentarioConCanal(comentario, [rec]), comentario);
});
