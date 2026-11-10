import {
  enriquecerComentarioConCanal,
  encontrarRecordatorioDeComentario,
  tieneSiglaCanal,
} from '../../canalSiglas.js';

export const CANAL_LLAMADA = 'llamada';
export const CANAL_MENSAJE = 'mensaje';

export const RESULTADO_LNC = 'LNC.';
export const RESULTADO_LC = 'LC.';
export const RESULTADO_LA = 'LA.';
export const RESULTADO_MNC = 'MNC.';
export const RESULTADO_MC = 'MC.';
export const RESULTADO_MA = 'MA.';

export const PRIORIDAD_RESULTADO = {
  [RESULTADO_LNC]: 1,
  [RESULTADO_LC]: 2,
  [RESULTADO_LA]: 3,
  [RESULTADO_MNC]: 1,
  [RESULTADO_MC]: 2,
  [RESULTADO_MA]: 3,
};

export const HORAS_HEATMAP = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
export const DIAS_SEMANA = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 7, label: 'Dom' },
];

export function prioridadResultado(sigla) {
  return PRIORIDAD_RESULTADO[sigla] || 0;
}

export function canalDeResultado(sigla) {
  if (sigla === RESULTADO_LNC || sigla === RESULTADO_LC || sigla === RESULTADO_LA) return CANAL_LLAMADA;
  if (sigla === RESULTADO_MNC || sigla === RESULTADO_MC || sigla === RESULTADO_MA) return CANAL_MENSAJE;
  return null;
}

export function partirSeguimiento({ llamada, mensaje } = {}) {
  const intentos = [];
  if (llamada) intentos.push({ canal: CANAL_LLAMADA, resultado: llamada });
  if (mensaje) intentos.push({ canal: CANAL_MENSAJE, resultado: mensaje });
  return intentos;
}

export function esContestacion(resultado) {
  return resultado === RESULTADO_LC
    || resultado === RESULTADO_LA
    || resultado === RESULTADO_MC
    || resultado === RESULTADO_MA;
}

export function esEfectiva(resultado) {
  return resultado === RESULTADO_LA || resultado === RESULTADO_MA;
}

export function esNoContesto(resultado) {
  return resultado === RESULTADO_LNC || resultado === RESULTADO_MNC;
}

export function resultadoDelDia(intentos = []) {
  if (!Array.isArray(intentos) || intentos.length === 0) return null;
  return intentos.reduce((best, item) => {
    if (!item?.resultado) return best;
    if (!best) return item;
    const pItem = prioridadResultado(item.resultado);
    const pBest = prioridadResultado(best.resultado);
    if (pItem > pBest) return item;
    return best;
  }, null);
}

export function diariosDesdeIntentos(intentos = []) {
  const grupos = new Map();
  for (const intento of intentos) {
    if (!intento?.lead_id || !intento?.canal || !intento?.resultado || !intento?.fecha) continue;
    const key = `${intento.fecha}|${intento.lead_id}|${intento.canal}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(intento);
  }
  return [...grupos.values()].map((items) => {
    const ganador = resultadoDelDia(items);
    const seguimientos = new Set(items.map((item) => item.seguimiento_id).filter(Boolean));
    return {
      fecha: ganador.fecha,
      lead_id: ganador.lead_id,
      canal: ganador.canal,
      resultado: ganador.resultado,
      autor_email: ganador.autor_email,
      intentos: items.length,
      seguimientos: seguimientos.size,
    };
  });
}

export function consolidarPorPersonaCanal(diarios = []) {
  const map = new Map();
  for (const row of diarios) {
    if (!row?.lead_id || !row?.canal) continue;
    const key = `${row.lead_id}|${row.canal}`;
    const prev = map.get(key);
    if (!prev || prioridadResultado(row.resultado) > prioridadResultado(prev.resultado)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}

export function conteoCanal(diarios = [], canal) {
  const consolidado = consolidarPorPersonaCanal(diarios).filter((row) => row.canal === canal);
  const total = consolidado.length;
  const noContestaron = consolidado.filter((row) => esNoContesto(row.resultado)).length;
  const contestaronSolo = consolidado.filter((row) => (
    row.resultado === RESULTADO_LC || row.resultado === RESULTADO_MC
  )).length;
  const efectivas = consolidado.filter((row) => esEfectiva(row.resultado)).length;
  const contestaronIncluye = contestaronSolo + efectivas;
  return {
    canal,
    personas: total,
    noContestaron,
    contestaronSolo,
    efectivas,
    contestaronIncluye,
    pctNo: total ? (noContestaron / total) * 100 : 0,
    pctContestoSolo: total ? (contestaronSolo / total) * 100 : 0,
    pctEfectivas: total ? (efectivas / total) * 100 : 0,
    pctContestaron: total ? (contestaronIncluye / total) * 100 : 0,
  };
}

export function kpisContacto(diarios = [], intentos = []) {
  const people = new Set(diarios.map((row) => row.lead_id).filter(Boolean));
  const peopleLlamada = new Set(
    diarios.filter((row) => row.canal === CANAL_LLAMADA).map((row) => row.lead_id),
  );
  const peopleMensaje = new Set(
    diarios.filter((row) => row.canal === CANAL_MENSAJE).map((row) => row.lead_id),
  );
  const consolidado = consolidarPorPersonaCanal(diarios);
  const contestaron = new Set(
    consolidado.filter((row) => esContestacion(row.resultado)).map((row) => row.lead_id),
  );
  const efectivas = new Set(
    consolidado.filter((row) => esEfectiva(row.resultado)).map((row) => row.lead_id),
  );
  const agendaronLlamada = new Set(
    consolidado.filter((row) => row.canal === CANAL_LLAMADA && esEfectiva(row.resultado)).map((row) => row.lead_id),
  );
  const agendaronMensaje = new Set(
    consolidado.filter((row) => row.canal === CANAL_MENSAJE && esEfectiva(row.resultado)).map((row) => row.lead_id),
  );
  const seguimientos = new Set(intentos.map((item) => item.seguimiento_id).filter(Boolean));
  const personas = people.size;
  return {
    personas,
    personasLlamada: peopleLlamada.size,
    personasMensaje: peopleMensaje.size,
    contestaron: contestaron.size,
    pctContestacion: personas ? (contestaron.size / personas) * 100 : 0,
    efectivas: efectivas.size,
    pctEfectividad: personas ? (efectivas.size / personas) * 100 : 0,
    agendamientos: efectivas.size,
    agendaronLlamada: agendaronLlamada.size,
    agendaronMensaje: agendaronMensaje.size,
    seguimientos: seguimientos.size,
    seguimientosPorPersona: personas ? seguimientos.size / personas : 0,
  };
}

export function intensidadPorPersonaDia(intentos = []) {
  const grupos = new Map();
  for (const intento of intentos) {
    if (!intento?.lead_id || !intento?.fecha) continue;
    const key = `${intento.fecha}|${intento.lead_id}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        fecha: intento.fecha,
        lead_id: intento.lead_id,
        seguimientos: new Set(),
        contestó: false,
        efectiva: false,
      });
    }
    const grupo = grupos.get(key);
    if (intento.seguimiento_id) grupo.seguimientos.add(intento.seguimiento_id);
    if (esContestacion(intento.resultado)) grupo.contestó = true;
    if (esEfectiva(intento.resultado)) grupo.efectiva = true;
  }
  return [...grupos.values()].map((grupo) => ({
    fecha: grupo.fecha,
    lead_id: grupo.lead_id,
    seguimientos: grupo.seguimientos.size,
    contestó: grupo.contestó,
    efectiva: grupo.efectiva,
  }));
}

export function cubetasIntensidad(intentos = []) {
  const vacio = { personasDia: 0, contestaron: 0, pctContestacion: 0 };
  const cubetas = {
    1: { ...vacio, id: '1', label: '1 seguimiento' },
    2: { ...vacio, id: '2', label: '2 seguimientos' },
    '3+': { ...vacio, id: '3+', label: '3 o más' },
  };
  for (const row of intensidadPorPersonaDia(intentos)) {
    const key = row.seguimientos >= 3 ? '3+' : String(Math.max(row.seguimientos, 1));
    if (!cubetas[key]) continue;
    cubetas[key].personasDia += 1;
    if (row.contestó) cubetas[key].contestaron += 1;
  }
  for (const cubeta of Object.values(cubetas)) {
    cubeta.pctContestacion = cubeta.personasDia
      ? (cubeta.contestaron / cubeta.personasDia) * 100
      : 0;
  }
  return [cubetas['1'], cubetas['2'], cubetas['3+']];
}

function horaHeatmap(hora) {
  const n = Number(hora);
  if (!Number.isFinite(n)) return HORAS_HEATMAP[0];
  if (n < HORAS_HEATMAP[0]) return HORAS_HEATMAP[0];
  if (n > HORAS_HEATMAP[HORAS_HEATMAP.length - 1]) return HORAS_HEATMAP[HORAS_HEATMAP.length - 1];
  return n;
}

export function filtraIntentosHeatmap(intentos = [], { pestana = 'contestaron', canal = 'ambos' } = {}) {
  return intentos.filter((item) => {
    if (canal !== 'ambos' && item.canal !== canal) return false;
    if (pestana === 'agendaron') return esEfectiva(item.resultado);
    if (pestana === 'no_contestaron') return esNoContesto(item.resultado);
    return esContestacion(item.resultado);
  });
}

export function celdasHeatmap(intentos = [], opts = {}) {
  const filtrados = filtraIntentosHeatmap(intentos, opts);
  const map = new Map();
  for (const item of filtrados) {
    const hora = horaHeatmap(item.hora);
    const dia = Number(item.dia_semana) || 1;
    const key = `${dia}|${hora}`;
    if (!map.has(key)) {
      map.set(key, { dia, hora, intentos: 0, personas: new Set() });
    }
    const cell = map.get(key);
    cell.intentos += 1;
    if (item.lead_id) cell.personas.add(item.lead_id);
  }
  return HORAS_HEATMAP.flatMap((hora) => DIAS_SEMANA.map((dia) => {
    const cell = map.get(`${dia.id}|${hora}`);
    return {
      dia: dia.id,
      hora,
      intentos: cell?.intentos || 0,
      personas: cell ? cell.personas.size : 0,
      leadIds: cell ? [...cell.personas] : [],
    };
  }));
}

export function rankingComerciales(intentos = [], comerciales = []) {
  const byAutor = new Map();
  const nombreDe = (email) => {
    const hit = comerciales.find((c) => c.email === email);
    return hit?.nombre || email?.split('@')[0] || email || 'Sin autor';
  };
  for (const intento of intentos) {
    const email = intento.autor_email;
    if (!email) continue;
    if (!byAutor.has(email)) byAutor.set(email, []);
    byAutor.get(email).push(intento);
  }
  const rows = [...byAutor.entries()].map(([email, items]) => {
    const diariosAutor = diariosDesdeIntentos(items);
    const kpis = kpisContacto(diariosAutor, items);
    return {
      email,
      nombre: nombreDe(email),
      ...kpis,
    };
  });
  rows.sort((a, b) => b.personas - a.personas || b.pctContestacion - a.pctContestacion);
  return rows;
}

export function pct(n) {
  if (n == null || Number.isNaN(n)) return '0%';
  return `${n.toFixed(n >= 10 || n === 0 ? 0 : 1)}%`;
}

export const COHORTE_TODOS = 'todos';
export const COHORTE_NUEVOS = 'nuevos';
export const COHORTE_GESTION = 'gestion';

export const COHORTE_OPCIONES = [
  { id: COHORTE_TODOS, label: 'Todos' },
  { id: COHORTE_NUEVOS, label: 'Nuevos' },
  { id: COHORTE_GESTION, label: 'En gestión' },
];

export const HORA_SLA_DESDE = 9;
export const HORA_SLA_HASTA = 21;
const TZ_COLOMBIA = 'America/Bogota';

export function partesColombia(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: Number(get('hour')),
    minuto: Number(get('minute')),
  };
}

export function fechaCreacionColombia(createdAt) {
  return partesColombia(createdAt)?.fecha || null;
}

export function creadoEnHorarioSla(createdAt) {
  const partes = partesColombia(createdAt);
  if (!partes) return false;
  const minutes = partes.hora * 60 + partes.minuto;
  return minutes >= HORA_SLA_DESDE * 60 && minutes <= HORA_SLA_HASTA * 60;
}

export function cohorteDelLead(createdAt, startDateLocal, endDateLocal) {
  const fecha = fechaCreacionColombia(createdAt);
  if (!fecha || !startDateLocal || !endDateLocal) return COHORTE_GESTION;
  if (fecha >= startDateLocal && fecha <= endDateLocal) return COHORTE_NUEVOS;
  return COHORTE_GESTION;
}

export function filtraIntentosPorCohorte(
  intentos = [],
  leadMap = {},
  cohorte = COHORTE_TODOS,
  startDateLocal,
  endDateLocal,
) {
  if (cohorte === COHORTE_TODOS) return intentos;
  return intentos.filter((intento) => {
    const lead = leadMap[intento.lead_id];
    return cohorteDelLead(lead?.created_at, startDateLocal, endDateLocal) === cohorte;
  });
}

function recordatorioParaComentario(comentario, recordatorios = []) {
  const cercano = encontrarRecordatorioDeComentario(comentario, recordatorios);
  if (cercano) return cercano;
  const texto = String(comentario.texto || '').trim();
  const t = new Date(comentario.created_at).getTime();
  if (!texto || Number.isNaN(t)) return null;
  const candidatos = recordatorios.filter((r) => {
    if (String(r.lead_id) !== String(comentario.lead_id)) return false;
    if (String(r.observacion || '').trim() !== texto) return false;
    if (!tieneSiglaCanal(r.llamada, r.mensaje)) return false;
    const rt = new Date(r.created_at).getTime();
    if (Number.isNaN(rt)) return false;
    return rt <= t + 60_000;
  });
  if (!candidatos.length) return null;
  return candidatos.reduce((best, r) => {
    const d = Math.abs(new Date(r.created_at).getTime() - t);
    const dBest = Math.abs(new Date(best.created_at).getTime() - t);
    return d < dBest ? r : best;
  });
}

function heredarSiglasDeRecordatorio(comentario, recordatorios = []) {
  const ya = enriquecerComentarioConCanal(comentario, recordatorios);
  if (tieneSiglaCanal(ya.llamada, ya.mensaje)) return ya;
  const rec = recordatorioParaComentario(comentario, recordatorios);
  if (!rec || !tieneSiglaCanal(rec.llamada, rec.mensaje)) return ya;
  return {
    ...comentario,
    llamada: rec.llamada || comentario.llamada || null,
    mensaje: rec.mensaje || comentario.mensaje || null,
  };
}

export function intentosDesdeSeguimientos(comentarios = [], recordatorios = []) {
  const recs = recordatorios || [];
  const usados = new Set();
  const intentos = [];

  const pushPartes = ({ created_at, lead_id, seguimiento_id, autor_email, llamada, mensaje }) => {
    const partes = partesColombia(created_at);
    if (!partes || !lead_id) return;
    for (const p of partirSeguimiento({ llamada, mensaje })) {
      if (prioridadResultado(p.resultado) <= 0) continue;
      intentos.push({
        fecha: partes.fecha,
        hora: partes.hora,
        lead_id: String(lead_id),
        seguimiento_id: String(seguimiento_id),
        canal: p.canal,
        resultado: p.resultado,
        autor_email,
        intentado_at: created_at,
      });
    }
  };

  for (const crudo of comentarios) {
    const c = heredarSiglasDeRecordatorio(crudo, recs);
    const rec = recordatorioParaComentario(c, recs);
    if (rec?.id != null) usados.add(String(rec.id));
    if (!tieneSiglaCanal(c.llamada, c.mensaje)) continue;
    pushPartes({
      created_at: c.created_at,
      lead_id: c.lead_id,
      seguimiento_id: c.id,
      autor_email: c.autor_email,
      llamada: c.llamada,
      mensaje: c.mensaje,
    });
  }

  for (const r of recs) {
    if (r?.id != null && usados.has(String(r.id))) continue;
    if (!tieneSiglaCanal(r.llamada, r.mensaje)) continue;
    pushPartes({
      created_at: r.created_at,
      lead_id: r.lead_id,
      seguimiento_id: r.id,
      autor_email: r.creado_por || r.autor_email,
      llamada: r.llamada,
      mensaje: r.mensaje,
    });
  }
  return intentos;
}

export function instanteIntento(intento) {
  if (intento?.intentado_at) {
    const t = new Date(intento.intentado_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (!intento?.fecha || intento.hora == null || intento.hora === '') return null;
  const hora = String(Math.min(23, Math.max(0, Number(intento.hora)))).padStart(2, '0');
  const t = Date.parse(`${intento.fecha}T${hora}:00:00-05:00`);
  return Number.isNaN(t) ? null : t;
}

export function detallePrimerContacto(intentos = [], leadMap = {}, { canal = null, horarioSla = false } = {}) {
  const byLead = new Map();
  for (const intento of intentos) {
    if (!intento?.lead_id) continue;
    if (canal && intento.canal !== canal) continue;
    const t = instanteIntento(intento);
    if (t == null) continue;
    if (!byLead.has(intento.lead_id)) byLead.set(intento.lead_id, []);
    byLead.get(intento.lead_id).push({ t, intento });
  }
  const filas = [];
  for (const [leadId, items] of byLead) {
    const createdAt = leadMap[leadId]?.created_at;
    if (!createdAt) continue;
    if (horarioSla && !creadoEnHorarioSla(createdAt)) continue;
    const createdTs = new Date(createdAt).getTime();
    if (Number.isNaN(createdTs)) continue;
    const despues = items
      .filter((item) => item.t >= createdTs)
      .sort((a, b) => a.t - b.t);
    const ganador = despues[0];
    if (!ganador) continue;
    filas.push({
      lead_id: leadId,
      createdAt,
      primerAt: ganador.intento.intentado_at || new Date(ganador.t).toISOString(),
      autor_email: ganador.intento.autor_email,
      resultado: ganador.intento.resultado,
      duracionMs: ganador.t - createdTs,
    });
  }
  filas.sort((a, b) => b.duracionMs - a.duracionMs);
  return filas;
}

export function detalleSlaContacto(intentos = [], leadMap = {}) {
  return detallePrimerContacto(intentos, leadMap, { horarioSla: true });
}

export function slaContacto(intentos = [], leadMap = {}) {
  const filas = detalleSlaContacto(intentos, leadMap);
  return {
    avgMs: filas.length
      ? filas.reduce((sum, row) => sum + row.duracionMs, 0) / filas.length
      : null,
    personasSla: filas.length,
    personasEnHorario: filas.length,
    filas,
  };
}

export function formatoHoraColombia(iso) {
  const partes = partesColombia(iso);
  if (!partes) return '—';
  const [, month, day] = partes.fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const hh = String(partes.hora).padStart(2, '0');
  const mm = String(partes.minuto).padStart(2, '0');
  return `${Number(day)} ${meses[Number(month) - 1]} ${hh}:${mm}`;
}

export function formatoDuracion(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  const minutes = Math.max(0, ms) / 60000;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) {
    return hours >= 10 || hours === Math.round(hours)
      ? `${Math.round(hours)} h`
      : `${hours.toFixed(1)} h`;
  }
  const days = hours / 24;
  return days >= 10 || days === Math.round(days)
    ? `${Math.round(days)} días`
    : `${days.toFixed(1)} días`;
}
