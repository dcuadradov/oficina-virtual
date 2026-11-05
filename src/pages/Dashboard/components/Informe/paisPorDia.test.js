import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  agregarPorPaisYDia,
  agregarPorPaisYMes,
  buildMonthList,
  buildPaisChartRows,
  buildPaisCompareMonthRows,
  COMPARE_PCT_KEY,
  OVERLAY_LEADS_KEY,
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
  assert.equal(byName.Colombia.baselineCount, 300);
  assert.equal(byName.México.baselineCount, 200);
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

test('buildMonthList arma el eje Nov 25 → Ene 26', () => {
  const months = buildMonthList('2025-11', '2026-01');
  assert.deepEqual(months.map((m) => m.dayLabel), ['Nov 25', 'Dic 25', 'Ene 26']);
  assert.deepEqual(months.map((m) => m.dateKey), ['2025-11', '2025-12', '2026-01']);
});

test('buildMonthList deja máximo 12 meses, los más recientes', () => {
  const novANov = buildMonthList('2025-11', '2026-11');
  assert.equal(novANov.length, 12);
  assert.equal(novANov[0].dateKey, '2025-12');
  assert.equal(novANov[11].dateKey, '2026-11');

  const novADic = buildMonthList('2025-11', '2026-12');
  assert.equal(novADic.length, 12);
  assert.equal(novADic[0].dateKey, '2026-01');
  assert.equal(novADic[11].dateKey, '2026-12');
});

test('agregarPorPaisYMes agrupa por mes y la lista es el acumulado', () => {
  const agg = agregarPorPaisYMes([
    { pais: 'Colombia', created_at: '2025-11-10T12:00:00.000Z' },
    { pais: 'Colombia', created_at: '2026-01-02T12:00:00.000Z' },
    { pais: 'México', created_at: '2025-11-10T12:00:00.000Z' },
  ], 'created_at');
  assert.equal(agg.total, 3);
  assert.equal(agg.totalsByPais.Colombia, 2);
  assert.equal(agg.byDayByPais['2025-11'].Colombia, 1);
  assert.equal(agg.byDayByPais['2026-01'].Colombia, 1);
});

test('con un país en foco el gráfico deja su métrica y los leads de ese país', () => {
  const rows = buildPaisChartRows({
    days: [{ dateKey: '2026-06-01', dayLabel: '01', dayFull: '01/06' }],
    byDayByPais: { '2026-06-01': { Colombia: 2, México: 5 } },
    overlayByDayByPais: { '2026-06-01': { Colombia: 10, México: 20 } },
    selectedPais: 'Colombia',
    topPaises: [{ pais: 'México' }, { pais: 'Colombia' }],
  });
  assert.equal(rows[0].Colombia, 2);
  assert.equal(rows[0][OVERLAY_LEADS_KEY], 10);
  assert.equal(rows[0].México, undefined);
});

test('mes a mes el % es matrículas sobre leads de ese mes, no la cantidad', () => {
  const rows = buildPaisCompareMonthRows({
    days: [
      { dateKey: '2026-02', dayLabel: 'Feb 26', dayFull: 'Febrero 2026' },
      { dateKey: '2026-03', dayLabel: 'Mar 26', dayFull: 'Marzo 2026' },
      { dateKey: '2026-04', dayLabel: 'Abr 26', dayFull: 'Abril 2026' },
      { dateKey: '2026-05', dayLabel: 'May 26', dayFull: 'Mayo 2026' },
    ],
    byDayByPais: {
      '2026-02': { Colombia: 80 },
      '2026-03': { Colombia: 20 },
      '2026-04': { Colombia: 40 },
      '2026-05': { Colombia: 5 },
    },
    overlayByDayByPais: {
      '2026-02': { Colombia: 800 },
      '2026-03': { Colombia: 400 },
      '2026-04': { Colombia: 400 },
      '2026-05': { Colombia: 0 },
    },
    selectedPais: 'Colombia',
  });
  assert.equal(rows[0][OVERLAY_LEADS_KEY], 800);
  assert.equal(rows[0].Colombia, 80);
  assert.equal(rows[0][COMPARE_PCT_KEY], 10);
  assert.equal(rows[1][COMPARE_PCT_KEY], 5);
  assert.equal(rows[2][COMPARE_PCT_KEY], 10);
  assert.equal(rows[3][COMPARE_PCT_KEY], null);
});

test('sin país en foco el gráfico sigue mostrando el top y otros', () => {
  const rows = buildPaisChartRows({
    days: [{ dateKey: '2026-06-01', dayLabel: '01', dayFull: '01/06' }],
    byDayByPais: { '2026-06-01': { Colombia: 2, México: 5, Perú: 1 } },
    topPaises: [{ pais: 'México' }, { pais: 'Colombia' }],
    otrosPaises: [{ pais: 'Perú' }],
  });
  assert.equal(rows[0].México, 5);
  assert.equal(rows[0].Colombia, 2);
  assert.equal(rows[0].Otros, 1);
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
