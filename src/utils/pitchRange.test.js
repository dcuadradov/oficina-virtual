import assert from 'node:assert/strict';
import { test } from 'node:test';
import { periodoComercialActual, resolvePitchRange, toFechaISOLocal } from './pitchRange.js';

test('toFechaISOLocal usa el calendario local, no UTC', () => {
  assert.equal(toFechaISOLocal(new Date(2026, 10, 10)), '2026-11-10');
});

test('el periodo comercial de un jueves es el martes a lunes que lo contiene', () => {
  const p = periodoComercialActual(new Date(2026, 10, 12, 15, 30, 0));
  assert.equal(p.value, '2026-11-10_2026-11-16');
  assert.equal(p.start.getDay(), 2);
  assert.equal(p.end.getDay(), 1);
});

test('sin filtro de fecha, Mis Pitch resuelve el periodo en curso', () => {
  const r = resolvePitchRange({});
  const p = periodoComercialActual();
  assert.equal(r.viewMode, 'period');
  assert.equal(toFechaISOLocal(r.rangeStart), p.value.split('_')[0]);
  assert.equal(toFechaISOLocal(r.rangeEnd), p.value.split('_')[1]);
});
