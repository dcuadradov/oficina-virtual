import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify, uniqueSlug } from './slug.js';

test('slugify quita tildes y compacta guiones', () => {
  assert.equal(slugify('Artículos científicos'), 'articulos-cientificos');
  assert.equal(slugify('  Médicos en el exterior  '), 'medicos-en-el-exterior');
});

test('slugify vacío queda vacío para que uniqueSlug ponga el fallback', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify('***'), '');
});

test('uniqueSlug no choca con slugs ya usados', () => {
  const existing = new Set(['telemedicina', 'telemedicina-2']);
  assert.equal(uniqueSlug('Telemedicina', existing), 'telemedicina-3');
  assert.equal(uniqueSlug('Congresos médicos', existing), 'congresos-medicos');
  assert.equal(uniqueSlug('', existing), 'articulo');
});
