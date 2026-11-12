import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ETAPA_MATRICULA,
  ID_SIN_COINCIDENCIA,
  aplicarPlanFechaAQuery,
  columnasRefLeads,
  fusionarLeadsPorCardId,
  idsPrimeraEntradaEnRango,
  nombresFaseDeMatricula,
  ordenarLeadsPorCampo,
  planFechaGestion,
  ramasDePlan,
} from './matriculaHistorial.js';

function mockQuery() {
  const calls = [];
  const q = {
    calls,
    eq(...args) { calls.push(['eq', args]); return q; },
    in(...args) { calls.push(['in', args]); return q; },
    neq(...args) { calls.push(['neq', args]); return q; },
    gte(...args) { calls.push(['gte', args]); return q; },
    lte(...args) { calls.push(['lte', args]); return q; },
  };
  return q;
}

test('nombres de fase que mapean a Matrícula, más el nombre de la etapa', () => {
  const names = nombresFaseDeMatricula(
    [
      { fase_id_pipefy: '1', nombre_fase: '¡Nueva matrícula!' },
      { fase_id_pipefy: '2', nombre_fase: 'Pitch' },
      { fase_id_pipefy: '3', nombre_fase: 'Matrícula caída' },
    ],
    [
      { fase_id_pipefy: '1', etapa_funnel_agrupada: 'Matrícula' },
      { fase_id_pipefy: '2', etapa_funnel_agrupada: 'Pitch' },
      { fase_id_pipefy: '3', etapa_funnel_agrupada: 'Matrícula caída' },
    ],
  );
  assert.ok(names.includes('¡Nueva matrícula!'));
  assert.ok(names.includes(ETAPA_MATRICULA));
  assert.ok(!names.includes('Pitch'));
  assert.ok(!names.includes('Matrícula caída'));
});

test('un lead con dos filas en el periodo cuenta una vez', () => {
  assert.deepEqual(
    idsPrimeraEntradaEnRango(
      [{ lead_id: 'a' }, { lead_id: 'a' }, { lead_id: 'b' }],
      [],
    ),
    ['a', 'b'],
  );
});

test('excluye quien ya había entrado a Matrícula antes del periodo', () => {
  assert.deepEqual(
    idsPrimeraEntradaEnRango(
      [{ lead_id: 'a' }, { lead_id: 'b' }],
      [{ lead_id: 'a' }],
    ),
    ['b'],
  );
});

test('Creación no usa historial', () => {
  const p = planFechaGestion({
    dateFilterField: 'created_at',
    fechaInicio: 'a',
    fechaFin: 'b',
    activeEtapas: [],
  });
  assert.equal(p.kind, 'campo');
  assert.equal(p.field, 'created_at');
});

test('Actualización sin etapas es mixto: Matrícula por historial, el resto por updated_at', () => {
  const p = planFechaGestion({
    dateFilterField: 'updated_at',
    fechaInicio: 'a',
    fechaFin: 'b',
    activeEtapas: [],
  });
  assert.equal(p.kind, 'mixto');
  assert.deepEqual(ramasDePlan(p), ['otras', 'matricula']);
});

test('Actualización con Matrícula y otra etapa es mixto', () => {
  const p = planFechaGestion({
    dateFilterField: 'updated_at',
    fechaInicio: 'a',
    fechaFin: 'b',
    activeEtapas: ['Pitch', 'Matrícula'],
  });
  assert.equal(p.kind, 'mixto');
});

test('Actualización solo Matrícula no filtra por updated_at', () => {
  const p = planFechaGestion({
    dateFilterField: 'updated_at',
    fechaInicio: 'a',
    fechaFin: 'b',
    activeEtapas: ['Matrícula'],
  });
  assert.equal(p.kind, 'solo_matricula');
  const q = mockQuery();
  aplicarPlanFechaAQuery(q, p, { matriculaIds: ['c1'] });
  assert.deepEqual(q.calls, [
    ['eq', ['etapa_funnel', ETAPA_MATRICULA]],
    ['in', ['card_id', ['c1']]],
  ]);
});

test('Actualización sin Matrícula sigue en updated_at', () => {
  const p = planFechaGestion({
    dateFilterField: 'updated_at',
    fechaInicio: 'ini',
    fechaFin: 'fin',
    activeEtapas: ['Pitch'],
  });
  assert.equal(p.kind, 'campo');
  assert.equal(p.field, 'updated_at');
});

test('rama otras excluye Matrícula y usa updated_at', () => {
  const p = planFechaGestion({
    dateFilterField: 'updated_at',
    fechaInicio: 'ini',
    fechaFin: 'fin',
    activeEtapas: [],
  });
  const q = mockQuery();
  aplicarPlanFechaAQuery(q, p, { rama: 'otras' });
  assert.deepEqual(q.calls, [
    ['neq', ['etapa_funnel', ETAPA_MATRICULA]],
    ['gte', ['updated_at', 'ini']],
    ['lte', ['updated_at', 'fin']],
  ]);
});

test('sin IDs de matrícula no dispara un in() vacío', () => {
  const p = { kind: 'solo_matricula' };
  const q = mockQuery();
  aplicarPlanFechaAQuery(q, p, { matriculaIds: [] });
  assert.deepEqual(q.calls[1], ['in', ['card_id', [ID_SIN_COINCIDENCIA]]]);
});

test('fusiona por card_id y ordena con nulos primero', () => {
  assert.deepEqual(
    fusionarLeadsPorCardId([
      { card_id: '1', updated_at: 'b' },
      { card_id: '1', updated_at: 'z' },
      { card_id: '2', updated_at: 'a' },
    ]).map((r) => r.card_id),
    ['1', '2'],
  );
  const orden = ordenarLeadsPorCampo(
    [
      { card_id: 'b', updated_at: '2026-02-01' },
      { card_id: 'n', updated_at: null },
      { card_id: 'a', updated_at: '2026-01-01' },
    ],
    { field: 'updated_at', ascending: true },
  ).map((r) => r.card_id);
  assert.deepEqual(orden, ['n', 'a', 'b']);
});

test('columnasRefLeads no duplica card_id', () => {
  assert.equal(columnasRefLeads('card_id'), 'card_id');
  assert.equal(columnasRefLeads('updated_at'), 'card_id, updated_at');
});
