/**
 * Fecha de Matrícula en Gestión (Actualización) y en el KPI Reales de Mis Pitch.
 *
 * No usa leads.updated_at: un comentario o un cambio de tag movía la matrícula
 * de periodo. La fecha es historial.created_at de la primera vez que el lead
 * entró a una fase cuya etapa agrupada es Matrícula. El lead cuenta si hoy
 * sigue en etapa_funnel = Matrícula.
 *
 * Creación (created_at del lead) y el resto de etapas no pasan por aquí.
 */

export const ETAPA_MATRICULA = 'Matrícula';
export const ID_SIN_COINCIDENCIA = '__no_match__';

export function nombresFaseDeMatricula(stepperRows, fasesRows) {
  const faseIdToEtapa = new Map();
  (fasesRows || []).forEach((f) => {
    if (f?.fase_id_pipefy) faseIdToEtapa.set(f.fase_id_pipefy, f.etapa_funnel_agrupada);
  });
  const names = new Set([ETAPA_MATRICULA]);
  (stepperRows || []).forEach((s) => {
    if (!s?.nombre_fase) return;
    if (faseIdToEtapa.get(s.fase_id_pipefy) === ETAPA_MATRICULA) {
      names.add(s.nombre_fase);
    }
  });
  return [...names];
}

export function idsPrimeraEntradaEnRango(historialEnRango, historialAnterior) {
  const ids = [];
  const seen = new Set();
  const anteriores = new Set(
    (historialAnterior || []).map((h) => h?.lead_id).filter(Boolean),
  );
  (historialEnRango || []).forEach((h) => {
    const id = h?.lead_id;
    if (!id || seen.has(id) || anteriores.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

export function planFechaGestion({
  dateFilterField,
  fechaInicio,
  fechaFin,
  activeEtapas = [],
}) {
  if (!fechaInicio || !fechaFin) return { kind: 'none' };
  if (dateFilterField !== 'updated_at') {
    return { kind: 'campo', field: dateFilterField, fechaInicio, fechaFin };
  }
  const etapas = activeEtapas || [];
  const incluyeMatricula = etapas.length === 0 || etapas.includes(ETAPA_MATRICULA);
  const incluyeOtras = etapas.length === 0 || etapas.some((e) => e !== ETAPA_MATRICULA);
  if (!incluyeMatricula) {
    return { kind: 'campo', field: 'updated_at', fechaInicio, fechaFin };
  }
  if (!incluyeOtras) {
    return { kind: 'solo_matricula', fechaInicio, fechaFin };
  }
  return { kind: 'mixto', fechaInicio, fechaFin };
}

export function ramasDePlan(plan) {
  return plan?.kind === 'mixto' ? ['otras', 'matricula'] : ['unica'];
}

export function aplicarPlanFechaAQuery(q, plan, { matriculaIds = [], rama = 'unica' } = {}) {
  if (!plan || plan.kind === 'none') return q;
  if (plan.kind === 'campo') {
    return q.gte(plan.field, plan.fechaInicio).lte(plan.field, plan.fechaFin);
  }
  const ids = matriculaIds.length > 0 ? matriculaIds : [ID_SIN_COINCIDENCIA];
  if (plan.kind === 'solo_matricula' || rama === 'matricula') {
    return q.eq('etapa_funnel', ETAPA_MATRICULA).in('card_id', ids);
  }
  if (rama === 'otras') {
    return q
      .neq('etapa_funnel', ETAPA_MATRICULA)
      .gte('updated_at', plan.fechaInicio)
      .lte('updated_at', plan.fechaFin);
  }
  return q;
}

export function fusionarLeadsPorCardId(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    if (row?.card_id && !map.has(row.card_id)) map.set(row.card_id, row);
  });
  return [...map.values()];
}

export function ordenarLeadsPorCampo(rows, { field, ascending } = {}) {
  return [...(rows || [])].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    const aNull = av == null;
    const bNull = bv == null;
    if (aNull || bNull) {
      if (aNull && bNull) return 0;
      return aNull ? -1 : 1;
    }
    if (av < bv) return ascending ? -1 : 1;
    if (av > bv) return ascending ? 1 : -1;
    return 0;
  });
}

export function columnasRefLeads(field) {
  if (!field || field === 'card_id') return 'card_id';
  return `card_id, ${field}`;
}
