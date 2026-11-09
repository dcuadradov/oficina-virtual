import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CANAL_LLAMADA,
  CANAL_MENSAJE,
  celdasHeatmap,
  conteoCanal,
  cubetasIntensidad,
  diariosDesdeIntentos,
  kpisContacto,
  partirSeguimiento,
  rankingComerciales,
  resultadoDelDia,
} from './contactoReglas.js';

test('partirSeguimiento abre un seguimiento en 0, 1 o 2 intentos', () => {
  assert.equal(partirSeguimiento({}).length, 0);
  assert.deepEqual(partirSeguimiento({ llamada: 'LNC.' }), [
    { canal: CANAL_LLAMADA, resultado: 'LNC.' },
  ]);
  assert.equal(partirSeguimiento({ llamada: 'LNC.', mensaje: 'MNC.' }).length, 2);
});

test('tres intentos LNC, LC, LNC ganan contestó, no el último', () => {
  const ganador = resultadoDelDia([
    { resultado: 'LNC.', hora: 9 },
    { resultado: 'LC.', hora: 12 },
    { resultado: 'LNC.', hora: 16 },
  ]);
  assert.equal(ganador.resultado, 'LC.');
});

test('si en vez de contestar agendó, gana efectiva aunque después no contesten', () => {
  const ganador = resultadoDelDia([
    { resultado: 'LNC.' },
    { resultado: 'LA.' },
    { resultado: 'LNC.' },
  ]);
  assert.equal(ganador.resultado, 'LA.');
});

test('3 seguimientos con llamada y mensaje sin respuesta son 1 persona y 6 intentos', () => {
  const intentos = [1, 2, 3].flatMap((n) => [
    {
      fecha: '2026-11-09',
      lead_id: 'lead-1',
      seguimiento_id: `seg-${n}`,
      canal: CANAL_LLAMADA,
      resultado: 'LNC.',
      hora: 9 + n,
      dia_semana: 1,
      autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-09',
      lead_id: 'lead-1',
      seguimiento_id: `seg-${n}`,
      canal: CANAL_MENSAJE,
      resultado: 'MNC.',
      hora: 9 + n,
      dia_semana: 1,
      autor_email: 'ana@mdenglish.us',
    },
  ]);
  const diarios = diariosDesdeIntentos(intentos);
  const kpis = kpisContacto(diarios, intentos);
  assert.equal(kpis.personas, 1);
  assert.equal(kpis.personasLlamada, 1);
  assert.equal(kpis.personasMensaje, 1);
  assert.equal(kpis.contestaron, 0);
  assert.equal(kpis.agendamientos, 0);
  assert.equal(kpis.seguimientos, 3);
  assert.equal(intentos.length, 6);
  assert.equal(diarios.find((d) => d.canal === CANAL_LLAMADA).resultado, 'LNC.');
});

test('agendamientos no suman canales de la misma persona', () => {
  const intentos = [
    {
      fecha: '2026-11-09', lead_id: 'a', seguimiento_id: '1', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 10, dia_semana: 1, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-09', lead_id: 'a', seguimiento_id: '1', canal: CANAL_MENSAJE,
      resultado: 'MA.', hora: 10, dia_semana: 1, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-09', lead_id: 'b', seguimiento_id: '2', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 11, dia_semana: 1, autor_email: 'ana@mdenglish.us',
    },
  ];
  const kpis = kpisContacto(diariosDesdeIntentos(intentos), intentos);
  assert.equal(kpis.agendamientos, 2);
  assert.equal(kpis.agendaronLlamada, 2);
  assert.equal(kpis.agendaronMensaje, 1);
});

test('la barra de llamada suma 100% y contestaron incluye efectivas', () => {
  const intentos = [
    { fecha: '2026-11-09', lead_id: '1', seguimiento_id: 'a', canal: CANAL_LLAMADA, resultado: 'LNC.', hora: 9, dia_semana: 1 },
    { fecha: '2026-11-09', lead_id: '2', seguimiento_id: 'b', canal: CANAL_LLAMADA, resultado: 'LC.', hora: 9, dia_semana: 1 },
    { fecha: '2026-11-09', lead_id: '3', seguimiento_id: 'c', canal: CANAL_LLAMADA, resultado: 'LA.', hora: 9, dia_semana: 1 },
  ];
  const barra = conteoCanal(diariosDesdeIntentos(intentos), CANAL_LLAMADA);
  assert.equal(barra.personas, 3);
  assert.equal(barra.noContestaron, 1);
  assert.equal(barra.contestaronSolo, 1);
  assert.equal(barra.efectivas, 1);
  assert.equal(barra.contestaronIncluye, 2);
  assert.equal(barra.noContestaron + barra.contestaronSolo + barra.efectivas, 3);
});

test('cubetas de intensidad: 3 seguimientos caen en 3 o más', () => {
  const intentos = [1, 2, 3].map((n) => ({
    fecha: '2026-11-09',
    lead_id: 'lead-1',
    seguimiento_id: `seg-${n}`,
    canal: CANAL_LLAMADA,
    resultado: n === 2 ? 'LC.' : 'LNC.',
    hora: 8 + n,
    dia_semana: 1,
  }));
  const cubetas = cubetasIntensidad(intentos);
  assert.equal(cubetas[2].personasDia, 1);
  assert.equal(cubetas[2].contestaron, 1);
  assert.equal(cubetas[0].personasDia, 0);
});

test('heatmap de contestaron por llamada concentra México a las 12 del martes', () => {
  const intentos = [
    {
      fecha: '2026-11-10', lead_id: 'mx-1', seguimiento_id: '1', canal: CANAL_LLAMADA,
      resultado: 'LC.', hora: 12, dia_semana: 2, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-10', lead_id: 'mx-2', seguimiento_id: '2', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 12, dia_semana: 2, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-10', lead_id: 'mx-3', seguimiento_id: '3', canal: CANAL_MENSAJE,
      resultado: 'MC.', hora: 12, dia_semana: 2, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-10', lead_id: 'mx-4', seguimiento_id: '4', canal: CANAL_LLAMADA,
      resultado: 'LNC.', hora: 9, dia_semana: 2, autor_email: 'ana@mdenglish.us',
    },
  ];
  const celdas = celdasHeatmap(intentos, { pestana: 'contestaron', canal: CANAL_LLAMADA });
  const mediodia = celdas.find((c) => c.dia === 2 && c.hora === 12);
  assert.equal(mediodia.intentos, 2);
  assert.equal(mediodia.personas, 2);
  const manana = celdas.find((c) => c.dia === 2 && c.hora === 9);
  assert.equal(manana.intentos, 0);
});

test('el ranking mira quién contactó, no el dueño del lead', () => {
  const intentos = [
    {
      fecha: '2026-11-09', lead_id: 'x', seguimiento_id: '1', canal: CANAL_LLAMADA,
      resultado: 'LC.', hora: 10, dia_semana: 1, autor_email: 'maria@mdenglish.us',
    },
    {
      fecha: '2026-11-09', lead_id: 'y', seguimiento_id: '2', canal: CANAL_LLAMADA,
      resultado: 'LNC.', hora: 11, dia_semana: 1, autor_email: 'pedro@mdenglish.us',
    },
  ];
  const ranking = rankingComerciales(intentos, [
    { email: 'maria@mdenglish.us', nombre: 'María' },
    { email: 'pedro@mdenglish.us', nombre: 'Pedro' },
  ]);
  assert.equal(ranking[0].nombre, 'María');
  assert.equal(ranking[0].personas, 1);
  assert.equal(ranking[0].contestaron, 1);
  assert.equal(ranking[1].nombre, 'Pedro');
  assert.equal(ranking[1].contestaron, 0);
});

test('la misma persona dos días sigue siendo una, y contestó si algún día contestó', () => {
  const intentos = [
    {
      fecha: '2026-11-09', lead_id: 'lead-1', seguimiento_id: 'lun', canal: CANAL_LLAMADA,
      resultado: 'LNC.', hora: 10, dia_semana: 1, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-10', lead_id: 'lead-1', seguimiento_id: 'mar', canal: CANAL_LLAMADA,
      resultado: 'LC.', hora: 10, dia_semana: 2, autor_email: 'ana@mdenglish.us',
    },
  ];
  const kpis = kpisContacto(diariosDesdeIntentos(intentos), intentos);
  assert.equal(kpis.personas, 1);
  assert.equal(kpis.contestaron, 1);
  assert.equal(kpis.seguimientos, 2);
  const cubetas = cubetasIntensidad(intentos);
  assert.equal(cubetas[0].personasDia, 2);
});

test('contestó por llamada y WhatsApp cuenta una sola persona', () => {
  const intentos = [
    {
      fecha: '2026-11-09', lead_id: 'lead-1', seguimiento_id: '1', canal: CANAL_LLAMADA,
      resultado: 'LC.', hora: 10, dia_semana: 1,
    },
    {
      fecha: '2026-11-09', lead_id: 'lead-1', seguimiento_id: '1', canal: CANAL_MENSAJE,
      resultado: 'MC.', hora: 10, dia_semana: 1,
    },
  ];
  const kpis = kpisContacto(diariosDesdeIntentos(intentos), intentos);
  assert.equal(kpis.personas, 1);
  assert.equal(kpis.contestaron, 1);
  assert.equal(kpis.personasLlamada, 1);
  assert.equal(kpis.personasMensaje, 1);
});

test('el filtro de comercial re-rankea solo con los intentos de esa persona', () => {
  const intentos = [
    {
      fecha: '2026-11-09', lead_id: 'lead-1', seguimiento_id: 'ana', canal: CANAL_LLAMADA,
      resultado: 'LNC.', hora: 9, dia_semana: 1, autor_email: 'ana@mdenglish.us',
    },
    {
      fecha: '2026-11-09', lead_id: 'lead-1', seguimiento_id: 'maria', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 12, dia_semana: 1, autor_email: 'maria@mdenglish.us',
    },
  ];
  const deMaria = intentos.filter((item) => item.autor_email === 'maria@mdenglish.us');
  const kpisMaria = kpisContacto(diariosDesdeIntentos(deMaria), deMaria);
  assert.equal(kpisMaria.personas, 1);
  assert.equal(kpisMaria.agendamientos, 1);
  const kpisTodos = kpisContacto(diariosDesdeIntentos(intentos), intentos);
  assert.equal(kpisTodos.agendamientos, 1);
  assert.equal(kpisTodos.personas, 1);
});

test('heatmap agendaron ignora LC y pega horas fuera de 7–21', () => {
  const intentos = [
    {
      fecha: '2026-11-10', lead_id: 'a', seguimiento_id: '1', canal: CANAL_LLAMADA,
      resultado: 'LC.', hora: 12, dia_semana: 2,
    },
    {
      fecha: '2026-11-10', lead_id: 'b', seguimiento_id: '2', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 6, dia_semana: 2,
    },
    {
      fecha: '2026-11-10', lead_id: 'c', seguimiento_id: '3', canal: CANAL_LLAMADA,
      resultado: 'LA.', hora: 23, dia_semana: 2,
    },
  ];
  const agendaron = celdasHeatmap(intentos, { pestana: 'agendaron', canal: CANAL_LLAMADA });
  assert.equal(agendaron.find((c) => c.dia === 2 && c.hora === 12).intentos, 0);
  assert.equal(agendaron.find((c) => c.dia === 2 && c.hora === 7).intentos, 1);
  assert.equal(agendaron.find((c) => c.dia === 2 && c.hora === 21).intentos, 1);
});
