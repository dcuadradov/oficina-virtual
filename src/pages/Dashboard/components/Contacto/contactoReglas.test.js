import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CANAL_LLAMADA,
  CANAL_MENSAJE,
  COHORTE_GESTION,
  COHORTE_NUEVOS,
  COHORTE_TODOS,
  celdasHeatmap,
  cohorteDelLead,
  conteoCanal,
  creadoEnHorarioSla,
  cubetasIntensidad,
  detalleSlaContacto,
  diariosDesdeIntentos,
  filtraIntentosPorCohorte,
  formatoDuracion,
  formatoHoraColombia,
  kpisContacto,
  partirSeguimiento,
  rankingComerciales,
  resultadoDelDia,
  slaContacto,
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

test('9:00 y 21:00 Colombia entran al SLA; 2:00 y 21:01 no', () => {
  assert.equal(creadoEnHorarioSla('2026-11-08T14:00:00.000Z'), true); // 9:00
  assert.equal(creadoEnHorarioSla('2026-11-09T02:00:00.000Z'), true); // 21:00 del 8
  assert.equal(creadoEnHorarioSla('2026-11-08T07:00:00.000Z'), false); // 2:00
  assert.equal(creadoEnHorarioSla('2026-11-09T02:01:00.000Z'), false); // 21:01
});

test('nuevos son los creados en el rango; el resto es en gestión', () => {
  assert.equal(cohorteDelLead('2026-11-08T15:00:00.000Z', '2026-11-08', '2026-11-08'), COHORTE_NUEVOS);
  assert.equal(cohorteDelLead('2026-11-07T15:00:00.000Z', '2026-11-08', '2026-11-08'), COHORTE_GESTION);
  assert.equal(cohorteDelLead('2026-11-08T15:00:00.000Z', '2026-11-01', '2026-11-30'), COHORTE_NUEVOS);
});

test('el filtro de cohorte parte las personas contactadas', () => {
  const intentos = [
    { fecha: '2026-11-08', lead_id: 'nuevo', seguimiento_id: '1', canal: CANAL_LLAMADA, resultado: 'LC.', hora: 10 },
    { fecha: '2026-11-08', lead_id: 'viejo', seguimiento_id: '2', canal: CANAL_LLAMADA, resultado: 'LNC.', hora: 11 },
  ];
  const leadMap = {
    nuevo: { created_at: '2026-11-08T15:00:00.000Z' },
    viejo: { created_at: '2026-11-01T15:00:00.000Z' },
  };
  const nuevos = filtraIntentosPorCohorte(intentos, leadMap, COHORTE_NUEVOS, '2026-11-08', '2026-11-08');
  const gestion = filtraIntentosPorCohorte(intentos, leadMap, COHORTE_GESTION, '2026-11-08', '2026-11-08');
  const todos = filtraIntentosPorCohorte(intentos, leadMap, COHORTE_TODOS, '2026-11-08', '2026-11-08');
  assert.deepEqual(nuevos.map((i) => i.lead_id), ['nuevo']);
  assert.deepEqual(gestion.map((i) => i.lead_id), ['viejo']);
  assert.equal(todos.length, 2);
});

test('SLA ignora las 2 am y promedia el resto', () => {
  const intentos = [
    {
      lead_id: 'madrugada', fecha: '2026-11-08', hora: 9, canal: CANAL_LLAMADA, resultado: 'LNC.',
      intentado_at: '2026-11-08T14:30:00.000Z',
    },
    {
      lead_id: 'manana', fecha: '2026-11-08', hora: 11, canal: CANAL_LLAMADA, resultado: 'LC.',
      intentado_at: '2026-11-08T16:00:00.000Z',
    },
  ];
  const leadMap = {
    madrugada: { created_at: '2026-11-08T07:00:00.000Z' }, // 2:00 Colombia
    manana: { created_at: '2026-11-08T15:00:00.000Z' }, // 10:00 Colombia, contacto 11:00
  };
  const sla = slaContacto(intentos, leadMap);
  assert.equal(sla.personasEnHorario, 1);
  assert.equal(sla.personasSla, 1);
  assert.equal(sla.avgMs, 60 * 60 * 1000);
  assert.equal(formatoDuracion(sla.avgMs), '1 h');
  const detalle = detalleSlaContacto(intentos, leadMap);
  assert.equal(detalle.length, 1);
  assert.equal(detalle[0].lead_id, 'manana');
  assert.equal(detalle[0].duracionMs, 60 * 60 * 1000);
  assert.equal(formatoHoraColombia(detalle[0].createdAt), '8 nov 10:00');
  assert.equal(formatoHoraColombia(detalle[0].primerAt), '8 nov 11:00');
});

test('creación 19:21 y seguimiento 19:40 no se redondean a 0 min', () => {
  const created = '2026-11-10T00:21:00.000Z';
  const intentos = [{
    lead_id: 'x', fecha: '2026-11-09', hora: 19, canal: CANAL_LLAMADA, resultado: 'LNC.',
    intentado_at: '2026-11-10T00:40:00.000Z',
  }];
  const detalle = detalleSlaContacto(intentos, { x: { created_at: created } });
  assert.equal(formatoHoraColombia(detalle[0].createdAt), '9 nov 19:21');
  assert.equal(formatoHoraColombia(detalle[0].primerAt), '9 nov 19:40');
  assert.equal(detalle[0].duracionMs, 19 * 60 * 1000);
});

test('la hora en punto anterior a la creación no cuenta como 0 min', () => {
  const created = '2026-11-10T00:21:00.000Z';
  const intentos = [{
    lead_id: 'x', fecha: '2026-11-09', hora: 19, canal: CANAL_LLAMADA, resultado: 'LNC.',
  }];
  const detalle = detalleSlaContacto(intentos, { x: { created_at: created } });
  assert.equal(detalle.length, 0);
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
