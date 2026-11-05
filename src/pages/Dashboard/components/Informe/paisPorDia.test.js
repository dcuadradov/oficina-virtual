import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  agregarPorPaisYDia,
  ETAPAS_DESCARTADO,
  ETAPAS_GESTIONANDO,
  ETAPAS_MATRICULA,
  filtrarPorEtapas,
  funnelPct,
  paisKey,
  sortedPaises,
} from './paisPorDia.js';

test('funnelPct es sobre el país de la etapa anterior', () => {
  assert.equal(funnelPct(150, 300), 50);
  assert.equal(funnelPct(75, 150), 50);
  assert.equal(funnelPct(0, 300), 0);
  assert.equal(funnelPct(10, 0), null);
});

test('filtrarPorEtapas junta las etapas de gestión intermedia', () => {
  const rows = [
    { pais: 'Colombia', etapa_funnel: 'Sin contacto' },
    { pais: 'Colombia', etapa_funnel: 'Gestionando' },
    { pais: 'México', etapa_funnel: 'Agendado' },
    { pais: 'Perú', etapa_funnel: 'Pitch' },
    { pais: 'Chile', etapa_funnel: 'Pago pendiente' },
    { pais: 'Argentina', etapa_funnel: 'Matrícula' },
  ];
  assert.deepEqual(
    filtrarPorEtapas(rows, ETAPAS_GESTIONANDO).map((r) => r.pais),
    ['Colombia', 'México', 'Chile'],
  );
  assert.ok(!ETAPAS_GESTIONANDO.includes('Pitch'));
  assert.ok(!ETAPAS_GESTIONANDO.includes('Matrícula'));
  assert.ok(!ETAPAS_GESTIONANDO.includes('Sin contacto'));
});

test('Descartados junta Descartado con las etapas de salida', () => {
  const rows = [
    { pais: 'Colombia', etapa_funnel: 'Descartado' },
    { pais: 'México', etapa_funnel: 'Matrícula caída' },
    { pais: 'Perú', etapa_funnel: 'MINDTAP' },
    { pais: 'Chile', etapa_funnel: 'Matrícula' },
  ];
  assert.deepEqual(
    filtrarPorEtapas(rows, ETAPAS_DESCARTADO).map((r) => r.pais),
    ['Colombia', 'México', 'Perú'],
  );
  assert.deepEqual(
    filtrarPorEtapas(rows, ETAPAS_MATRICULA).map((r) => r.pais),
    ['Chile'],
  );
});

test('sortedPaises en modo share reparte el 100% entre países', () => {
  const sorted = sortedPaises({
    totalsByPais: { Colombia: 300, México: 700 },
    total: 1000,
    pctMode: 'share',
  });
  assert.equal(sorted[0].pais, 'México');
  assert.equal(sorted[0].pct, 70);
  assert.equal(sorted[1].pct, 30);
});

test('sortedPaises en modo funnel usa el baseline del país, no el total de la etapa', () => {
  const sorted = sortedPaises({
    totalsByPais: { Colombia: 150, México: 50 },
    total: 200,
    baselineByPais: { Colombia: 300, México: 200 },
    pctMode: 'funnel',
  });
  const byName = Object.fromEntries(sorted.map((p) => [p.pais, p]));
  assert.equal(byName.Colombia.pct, 50);
  assert.equal(byName.México.pct, 25);
  assert.equal(byName.Colombia.sharePct, 75);
});

test('Descartados se calcula sobre leads, no sobre la etapa previa del funnel', () => {
  const leads = { Colombia: 300, México: 100 };
  const descartados = sortedPaises({
    totalsByPais: { Colombia: 30, México: 40 },
    total: 70,
    baselineByPais: leads,
    pctMode: 'funnel',
  });
  const byName = Object.fromEntries(descartados.map((p) => [p.pais, p]));
  assert.equal(byName.Colombia.pct, 10);
  assert.equal(byName.México.pct, 40);
});

test('Gestionando, Pitch y Matrícula calculan el % sobre Leads por país', () => {
  const leads = { Colombia: 300 };
  const gest = sortedPaises({
    totalsByPais: { Colombia: 75 },
    total: 75,
    baselineByPais: leads,
    pctMode: 'funnel',
  });
  const pitch = sortedPaises({
    totalsByPais: { Colombia: 37 },
    total: 37,
    baselineByPais: leads,
    pctMode: 'funnel',
  });
  const matricula = sortedPaises({
    totalsByPais: { Colombia: 13 },
    total: 13,
    baselineByPais: leads,
    pctMode: 'funnel',
  });
  assert.equal(gest[0].pct, 25);
  assert.equal(Math.round(pitch[0].pct * 10) / 10, 12.3);
  assert.equal(Math.round(matricula[0].pct * 10) / 10, 4.3);
});

test('agregarPorPaisYDia agrupa vacíos como Sin país', () => {
  const agg = agregarPorPaisYDia([
    { pais: 'Colombia', created_at: '2026-06-02T12:00:00.000Z' },
    { pais: null, created_at: '2026-06-02T12:00:00.000Z' },
    { pais: '  ', created_at: '2026-06-02T12:00:00.000Z' },
  ], 'created_at');
  assert.equal(agg.total, 3);
  assert.equal(agg.totalsByPais.Colombia, 1);
  assert.equal(agg.totalsByPais['Sin país'], 2);
  assert.equal(paisKey(null), 'Sin país');
});
