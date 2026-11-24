import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filtrarCategoriasSeguimiento,
  ordenarCategoriasSeguimiento,
} from './categoriaFilter.js';

const CATS = [
  { id: 2, categoria: 'No contestó', categoria_padre: 'Gestión' },
  { id: 1, categoria: 'Agendó pitch', categoria_padre: 'Pitch' },
  { id: 3, categoria: 'Número errado', categoria_padre: 'Gestión' },
];

test('ordenarCategoriasSeguimiento pone padre y luego el nombre', () => {
  assert.deepEqual(
    ordenarCategoriasSeguimiento(CATS).map((c) => c.categoria),
    ['No contestó', 'Número errado', 'Agendó pitch'],
  );
});

test('filtrarCategoriasSeguimiento ignora mayúsculas y tildes', () => {
  assert.deepEqual(
    filtrarCategoriasSeguimiento(CATS, '  NUMERO ').map((c) => c.categoria),
    ['Número errado'],
  );
  assert.deepEqual(
    filtrarCategoriasSeguimiento(CATS, 'agendo').map((c) => c.categoria),
    ['Agendó pitch'],
  );
});

test('filtrarCategoriasSeguimiento también busca por la categoría padre', () => {
  assert.deepEqual(
    filtrarCategoriasSeguimiento(CATS, 'pitch').map((c) => c.categoria),
    ['Agendó pitch'],
  );
});

test('sin texto devuelve todas ordenadas; sin coincidencia, vacío', () => {
  assert.equal(filtrarCategoriasSeguimiento(CATS, '').length, 3);
  assert.deepEqual(filtrarCategoriasSeguimiento(CATS, 'xyz'), []);
});
