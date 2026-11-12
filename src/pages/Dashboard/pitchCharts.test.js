import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bucketsDeVista, leadsUnicosDeFilas, sinSalto } from './pitchCharts.js';

test('leads únicos se recortan por card_id y se ordenan por nombre', () => {
  const lista = leadsUnicosDeFilas([
    { card_id: '2', nombre: 'Zoe Pérez' },
    { card_id: '1', nombre: 'Ana Díaz' },
    { card_id: '2', nombre: 'Zoe Pérez' },
    { card_id: '3', nombre: 'Bruno Soto' },
    { card_id: '4', nombre: '  ' },
  ]);
  assert.deepEqual(lista.map((l) => l.nombre), ['4', 'Ana Díaz', 'Bruno Soto', 'Zoe Pérez']);
  assert.equal(lista.find((l) => l.card_id === '4').nombre, '4');
});

test('sin filas no hay leads', () => {
  assert.deepEqual(leadsUnicosDeFilas([]), []);
  assert.deepEqual(leadsUnicosDeFilas(null), []);
});

test('el modo día parte el rango en bloques de 2 horas', () => {
  const start = new Date(2026, 10, 11);
  const buckets = bucketsDeVista('day', start, start);
  assert.equal(buckets.length, 12);
  assert.equal(buckets[0].label, '12am');
  assert.equal(buckets[6].label, '12pm');
  assert.equal(buckets[0].test({ hour: 0 }), true);
  assert.equal(buckets[0].test({ hour: 2 }), false);
});

test('el modo periodo pone un bucket por día', () => {
  const start = new Date(2026, 10, 10);
  const end = new Date(2026, 10, 16);
  const buckets = bucketsDeVista('period', start, end);
  assert.equal(buckets.length, 7);
  assert.match(buckets[0].label, /MAR 10/);
  assert.equal(buckets[1].test({ dateLocal: new Date(2026, 10, 11) }), true);
  assert.equal(buckets[1].test({ dateLocal: new Date(2026, 10, 12) }), false);
});

test('el modo mes agrupa de a dos días', () => {
  const start = new Date(2026, 3, 1);
  const end = new Date(2026, 3, 30);
  const buckets = bucketsDeVista('month', start, end);
  assert.equal(buckets[0].label, '1');
  assert.equal(buckets[0].test({ dateLocal: new Date(2026, 3, 1) }), true);
  assert.equal(buckets[0].test({ dateLocal: new Date(2026, 3, 2) }), true);
  assert.equal(buckets[0].test({ dateLocal: new Date(2026, 3, 3) }), false);
});

test('sin rango no hay buckets', () => {
  assert.deepEqual(bucketsDeVista('day', null, null), []);
});

test('sinSalto cancela el default para que el clic no mueva el scroll', () => {
  let cancelled = false;
  sinSalto({ preventDefault() { cancelled = true; } });
  assert.equal(cancelled, true);
});
