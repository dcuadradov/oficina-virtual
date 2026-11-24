import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ETAPAS_DESCARTADO } from './paisPorDia.js';
import {
  CATEGORIA_NO_ES_MEDICO,
  SIN_CATEGORIA,
  aplicarEvento,
  categoriaLimpia,
  contarMotivos,
  esMasReciente,
  etiquetaMotivo,
  filtrarPorUltimaCategoria,
  ultimaCategoriaDeLead,
  ultimosDesdeEventos,
} from './ultimoSeguimiento.js';

test('categoria vacía o null es Sin categoría', () => {
  assert.equal(categoriaLimpia(null), SIN_CATEGORIA);
  assert.equal(categoriaLimpia('  '), SIN_CATEGORIA);
  assert.equal(categoriaLimpia('No es médico'), 'No es médico');
});

test('el más reciente gana por created_at; a empate gana el que tiene categoría', () => {
  assert.equal(
    esMasReciente(
      { created_at: '2026-11-02T10:00:00Z', categoria: 'A' },
      { created_at: '2026-11-01T10:00:00Z', categoria: 'B' },
    ),
    true,
  );
  assert.equal(
    esMasReciente(
      { created_at: '2026-11-01T10:00:00Z', categoria: 'A' },
      { created_at: '2026-11-02T10:00:00Z', categoria: 'B' },
    ),
    false,
  );
  assert.equal(
    esMasReciente(
      { created_at: '2026-11-02T10:00:00Z', categoria: 'A' },
      { created_at: '2026-11-02T10:00:00Z', categoria: '' },
    ),
    true,
  );
  assert.equal(
    esMasReciente(
      { created_at: '2026-11-02T10:00:00Z', categoria: '' },
      { created_at: '2026-11-02T10:00:00Z', categoria: 'B' },
    ),
    false,
  );
});

test('último seguimiento cruza comentarios y recordatorios por fecha', () => {
  const map = ultimosDesdeEventos(
    [
      { lead_id: 'a', categoria: 'Interesado', created_at: '2026-11-01T08:00:00Z' },
      { lead_id: 'b', categoria: 'No volvió a contestar', created_at: '2026-11-03T12:00:00Z' },
    ],
    [
      { lead_id: 'a', categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-02T09:00:00Z' },
      { lead_id: 'b', categoria: 'Otro', created_at: '2026-11-03T11:00:00Z' },
    ],
  );
  assert.equal(map.a.categoria, CATEGORIA_NO_ES_MEDICO);
  assert.equal(map.b.categoria, 'No volvió a contestar');
});

test('aplicarEvento ignora filas sin lead o sin fecha', () => {
  const map = {};
  aplicarEvento(map, { lead_id: null, categoria: 'X', created_at: '2026-11-01T00:00:00Z' });
  aplicarEvento(map, { lead_id: 'a', categoria: 'X', created_at: null });
  assert.deepEqual(map, {});
});

test('lead sin seguimientos entra a Sin categoría y el pie suma 100% de descartados', () => {
  const leads = [
    { card_id: '1', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '2', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '3', pais: 'México', etapa_funnel: 'No se matriculó' },
    { card_id: '4', pais: 'Perú', etapa_funnel: 'Matrícula' },
  ];
  const ultimos = ultimosDesdeEventos(
    [{ lead_id: '1', categoria: 'No volvió a contestar', created_at: '2026-11-01T00:00:00Z' }],
    [{ lead_id: '3', categoria: '  ', created_at: '2026-11-02T00:00:00Z' }],
  );
  const { rows, total } = contarMotivos({ leads, ultimos, etapas: ETAPAS_DESCARTADO });
  assert.equal(total, 3);
  const byCat = Object.fromEntries(rows.map((r) => [r.categoria, r]));
  assert.equal(byCat['No volvió a contestar'].count, 1);
  assert.equal(byCat[SIN_CATEGORIA].count, 2);
  const sumaPct = rows.reduce((acc, r) => acc + r.pct, 0);
  assert.equal(Math.round(sumaPct), 100);
});

test('el % de cada motivo es sobre los descartados del filtro de país, no sobre todos los leads', () => {
  const leads = [
    { card_id: '1', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '2', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '3', pais: 'México', etapa_funnel: 'Descartado' },
    { card_id: '4', pais: 'Colombia', etapa_funnel: 'Matrícula' },
  ];
  const ultimos = {
    1: { categoria: 'No volvió a contestar', created_at: '2026-11-01T00:00:00Z' },
    2: { categoria: 'No volvió a contestar', created_at: '2026-11-01T00:00:00Z' },
    3: { categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-01T00:00:00Z' },
  };
  const { rows, total } = contarMotivos({
    leads,
    ultimos,
    etapas: ETAPAS_DESCARTADO,
    paises: ['Colombia'],
  });
  assert.equal(total, 2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].categoria, 'No volvió a contestar');
  assert.equal(rows[0].pct, 100);
});

test('un lead no se cuenta dos veces aunque venga duplicado', () => {
  const leads = [
    { card_id: '1', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '1', pais: 'Colombia', etapa_funnel: 'Descartado' },
  ];
  const { total } = contarMotivos({
    leads,
    ultimos: { 1: { categoria: 'Otro', created_at: '2026-11-01T00:00:00Z' } },
  });
  assert.equal(total, 1);
});

test('No son médicos solo toma el último seguimiento exactamente No es médico', () => {
  const leads = [
    { card_id: '1', pais: 'Colombia', etapa_funnel: 'Descartado' },
    { card_id: '2', pais: 'México', etapa_funnel: 'Gestionando' },
    { card_id: '3', pais: 'Perú', etapa_funnel: 'Sin contacto' },
  ];
  const ultimos = ultimosDesdeEventos(
    [
      { lead_id: '1', categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-01T00:00:00Z' },
      { lead_id: '2', categoria: 'Interesado', created_at: '2026-11-03T00:00:00Z' },
      { lead_id: '3', categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-01T00:00:00Z' },
    ],
    [
      { lead_id: '1', categoria: 'Otro', created_at: '2026-11-02T00:00:00Z' },
      { lead_id: '2', categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-02T00:00:00Z' },
    ],
  );
  const filtrados = filtrarPorUltimaCategoria(leads, ultimos, CATEGORIA_NO_ES_MEDICO);
  assert.deepEqual(filtrados.map((l) => l.card_id), ['3']);
  assert.equal(ultimaCategoriaDeLead(ultimos, '1'), 'Otro');
  assert.equal(ultimaCategoriaDeLead(ultimos, '2'), 'Interesado');
});

test('etiqueta de motivo sale nombre (conteo %)', () => {
  assert.equal(
    etiquetaMotivo({ categoria: 'No volvió a contestar', count: 33, pct: 45.4 }),
    'No volvió a contestar (33 45%)',
  );
});

test('card_id numérico y lead_id texto se cruzan', () => {
  const map = ultimosDesdeEventos(
    [{ lead_id: '99', categoria: 'Otro', created_at: '2026-11-01T00:00:00Z' }],
    [{ lead_id: 88, categoria: CATEGORIA_NO_ES_MEDICO, created_at: '2026-11-02T00:00:00Z' }],
  );
  assert.equal(ultimaCategoriaDeLead(map, 99), 'Otro');
  assert.equal(ultimaCategoriaDeLead(map, '88'), CATEGORIA_NO_ES_MEDICO);
  const filtrados = filtrarPorUltimaCategoria(
    [{ card_id: 88, pais: 'Colombia' }],
    map,
    CATEGORIA_NO_ES_MEDICO,
  );
  assert.deepEqual(filtrados.map((l) => l.card_id), [88]);
});
