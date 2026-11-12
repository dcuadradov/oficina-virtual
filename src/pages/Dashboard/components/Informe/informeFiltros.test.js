import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addOneDay,
  applyLeadFilters,
  etiquetaMes,
  etiquetaRangoComercial,
  facetasCruzadas,
  indexMonthConfigs,
  parseInformeDates,
  rangoDeMes,
  rangoTodosLosMeses,
  rowMatchesInformeDims,
  SIN_DATO,
} from './informeFiltros.js';

function mockQuery() {
  const calls = [];
  const q = {
    calls,
    in(column, values) { calls.push(['in', column, values]); return q; },
    eq(column, value) { calls.push(['eq', column, value]); return q; },
    gte(column, value) { calls.push(['gte', column, value]); return q; },
    lte(column, value) { calls.push(['lte', column, value]); return q; },
    or(filters) { calls.push(['or', filters]); return q; },
  };
  return q;
}

test('addOneDay pasa de mes si hace falta', () => {
  assert.equal(addOneDay('2026-11-30'), '2026-12-01');
  assert.equal(addOneDay('2026-11-04'), '2026-11-05');
});

test('rangoDeMes usa la config comercial de Gestión', () => {
  const rango = rangoDeMes(
    { '2026-11': { fecha_inicio: '2026-11-04', fecha_fin: '2026-12-01' } },
    '2026-11',
  );
  assert.equal(rango.fechaInicio, '2026-11-04 05:00:00+00');
  assert.equal(rango.fechaFin, '2026-12-02 05:00:00+00');
  assert.equal(rango.startDateLocal, '2026-11-04');
  assert.equal(rango.endDateLocal, '2026-12-01');
});

test('octubre 2026 usa el rango comercial 29 sep – 2 nov, no el mes calendario', () => {
  const rango = rangoDeMes(
    { '2026-10': { fecha_inicio: '2026-09-29', fecha_fin: '2026-11-02' } },
    '2026-10',
  );
  assert.equal(rango.fechaInicio, '2026-09-29 05:00:00+00');
  assert.equal(rango.fechaFin, '2026-11-03 05:00:00+00');
  assert.equal(rango.startDateLocal, '2026-09-29');
  assert.equal(rango.endDateLocal, '2026-11-02');
  assert.equal(etiquetaRangoComercial(rango), '29 sep 2026 – 2 nov 2026');
  assert.equal(etiquetaMes('2026-10'), 'Octubre 2026');
});

test('indexMonthConfigs entiende mes fecha y timestamps de Postgres', () => {
  const map = indexMonthConfigs([
    {
      mes: '2026-10-01',
      fecha_inicio: '2026-09-29T00:00:00+00:00',
      fecha_fin: '2026-11-02T00:00:00+00:00',
    },
  ]);
  const rango = rangoDeMes(map, '2026-10');
  assert.equal(rango.startDateLocal, '2026-09-29');
  assert.equal(rango.endDateLocal, '2026-11-02');
  assert.equal(rango.fechaInicio, '2026-09-29 05:00:00+00');
});

test('parseInformeDates prioriza día, luego periodo, luego mes', () => {
  const monthConfigs = { '2026-11': { fecha_inicio: '2026-11-04', fecha_fin: '2026-12-01' } };
  const porDia = parseInformeDates({
    selectedDia: '2026-11-04',
    selectedPeriodo: '2026-11-04_2026-11-10',
    selectedMes: '2026-11',
    monthConfigs,
  });
  assert.equal(porDia.startDateLocal, '2026-11-04');
  assert.equal(porDia.endDateLocal, '2026-11-04');

  const porPeriodo = parseInformeDates({
    selectedPeriodo: '2026-11-04_2026-11-10',
    selectedMes: '2026-11',
    monthConfigs,
  });
  assert.equal(porPeriodo.startDateLocal, '2026-11-04');
  assert.equal(porPeriodo.endDateLocal, '2026-11-10');
  assert.equal(porPeriodo.fechaFin, '2026-11-11 05:00:00+00');

  const porMes = parseInformeDates({ selectedMes: '2026-11', monthConfigs });
  assert.equal(porMes.startDateLocal, '2026-11-04');
});

test('rangoTodosLosMeses arranca en noviembre 2025 y no usa el mes del Informe', () => {
  const rango = rangoTodosLosMeses(new Date('2026-11-05T18:00:00.000Z'));
  assert.equal(rango.fechaInicio, '2025-11-01 05:00:00+00');
  assert.equal(rango.startYm, '2025-11');
  assert.equal(rango.endYm, '2026-11');
  assert.equal(rango.fechaFin, '2026-11-06 05:00:00+00');
});

test('applyLeadFilters concatena país, comercial, ocupación, tags, fuente, género y edad', () => {
  const q = mockQuery();
  applyLeadFilters(q, {
    fechaInicio: '2026-06-01 05:00:00+00',
    fechaFin: '2026-07-01 05:00:00+00',
    selectedPais: ['Colombia'],
    selectedComercial: 'ana@mdenglish.us',
    selectedOcupacion: ['Residente', 'Especialista'],
    selectedLabel: ['Top'],
    selectedFuente: ['Facebook'],
    selectedSexo: ['Femenino'],
    selectedEdad: ['25-34'],
  });
  assert.deepEqual(q.calls, [
    ['gte', 'created_at', '2026-06-01 05:00:00+00'],
    ['lte', 'created_at', '2026-07-01 05:00:00+00'],
    ['in', 'pais', ['Colombia']],
    ['eq', 'comercial_email', 'ana@mdenglish.us'],
    ['in', 'ocupacion', ['Residente', 'Especialista']],
    ['in', 'label', ['Top']],
    ['in', 'fuente_dato', ['Facebook']],
    ['in', 'sexo', ['Femenino']],
    ['in', 'edad', ['25-34']],
  ]);
});

test('applyLeadFilters no aplica listas vacías', () => {
  const q = mockQuery();
  applyLeadFilters(q, {
    selectedPais: [],
    selectedOcupacion: [],
    selectedLabel: [],
    selectedFuente: [],
    selectedSexo: [],
    selectedEdad: [],
  });
  assert.deepEqual(q.calls, []);
});

test('applyLeadFilters incluye nulos cuando se marca Sin dato', () => {
  const q = mockQuery();
  applyLeadFilters(q, {
    selectedSexo: [SIN_DATO, 'Femenino'],
  });
  assert.deepEqual(q.calls, [
    ['or', 'sexo.in.("Femenino"),sexo.is.null,sexo.eq.'],
  ]);
});

test('facetasCruzadas recorta opciones con los otros filtros y conserva lo ya marcado', () => {
  const rows = [
    { pais: 'Colombia', ocupacion: 'Residente', label: 'Top', fuente_dato: 'Facebook', sexo: 'Femenino', edad: '25-34' },
    { pais: 'Colombia', ocupacion: 'Estudiante', label: 'Low', fuente_dato: 'Instagram', sexo: 'Masculino', edad: '18-24' },
    { pais: 'México', ocupacion: 'Residente', label: 'Top', fuente_dato: 'Facebook', sexo: 'Femenino', edad: '25-34' },
  ];
  const selections = {
    pais: ['Colombia'],
    ocupacion: ['Residente'],
    label: [],
    fuente_dato: [],
    sexo: [],
    edad: [],
  };
  assert.deepEqual(facetasCruzadas(rows, selections, 'ocupacion'), [
    { value: 'Estudiante', count: 1 },
    { value: 'Residente', count: 1 },
  ]);
  assert.deepEqual(facetasCruzadas(rows, selections, 'label'), [
    { value: 'Top', count: 1 },
  ]);
  assert.deepEqual(facetasCruzadas(rows, selections, 'fuente_dato'), [
    { value: 'Facebook', count: 1 },
  ]);
  assert.equal(rowMatchesInformeDims(rows[0], selections), true);
  assert.equal(rowMatchesInformeDims(rows[1], selections), false);
});

test('applyLeadFilters incluye nulos de fuente_dato cuando se marca Sin fuente', () => {
  const q = mockQuery();
  applyLeadFilters(q, {
    selectedFuente: [SIN_DATO, 'Facebook'],
  });
  assert.deepEqual(q.calls, [
    ['or', 'fuente_dato.in.("Facebook"),fuente_dato.is.null,fuente_dato.eq.'],
  ]);
});
