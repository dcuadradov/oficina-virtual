import {
  aplicarPlanFechaAQuery,
  idsPrimeraEntradaEnRango,
  nombresFaseDeMatricula,
  planFechaGestion,
  ramasDePlan,
} from './matriculaHistorial';

export {
  ETAPA_MATRICULA,
  ID_SIN_COINCIDENCIA,
  aplicarPlanFechaAQuery,
  columnasRefLeads,
  fusionarLeadsPorCardId,
  ordenarLeadsPorCampo,
  planFechaGestion,
  ramasDePlan,
} from './matriculaHistorial';

export const HISTORIAL_PAGE_SIZE = 1000;
export const LEAD_IN_CHUNK = 200;

let nombresPromise = null;
const inflightIds = new Map();

export function fetchNombresFaseMatricula(client) {
  if (!nombresPromise) {
    nombresPromise = (async () => {
      const [stepperRes, fasesRes] = await Promise.all([
        client.from('config_stepper').select('fase_id_pipefy, nombre_fase'),
        client.from('config_fases').select('fase_id_pipefy, etapa_funnel_agrupada'),
      ]);
      if (stepperRes.error) throw stepperRes.error;
      if (fasesRes.error) throw fasesRes.error;
      return nombresFaseDeMatricula(stepperRes.data, fasesRes.data);
    })().catch((err) => {
      nombresPromise = null;
      throw err;
    });
  }
  return nombresPromise;
}

async function paginar(ejecutarRango, pageSize = HISTORIAL_PAGE_SIZE) {
  const acc = [];
  let from = 0;
  while (true) {
    const { data, error } = await ejecutarRango(from, from + pageSize - 1);
    if (error) throw error;
    acc.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return acc;
}

async function cargarIdsPrimeraMatricula(client, { fechaInicio, fechaFin, exclusiveEnd }) {
  const nombres = await fetchNombresFaseMatricula(client);
  if (!nombres.length) return [];

  const enRango = await paginar((from, to) => {
    let q = client
      .from('historial')
      .select('lead_id')
      .eq('modulo', 'comercial')
      .in('nombre_fase', nombres)
      .gte('created_at', fechaInicio);
    q = exclusiveEnd
      ? q.lt('created_at', fechaFin)
      : q.lte('created_at', fechaFin);
    return q.order('created_at', { ascending: true }).range(from, to);
  });

  const candidatos = [...new Set(enRango.map((h) => h?.lead_id).filter(Boolean))];
  if (candidatos.length === 0) return [];

  const anteriores = [];
  for (let i = 0; i < candidatos.length; i += LEAD_IN_CHUNK) {
    const chunk = candidatos.slice(i, i + LEAD_IN_CHUNK);
    const rows = await paginar((from, to) =>
      client
        .from('historial')
        .select('lead_id')
        .eq('modulo', 'comercial')
        .in('nombre_fase', nombres)
        .in('lead_id', chunk)
        .lt('created_at', fechaInicio)
        .range(from, to),
    );
    anteriores.push(...rows);
  }

  return idsPrimeraEntradaEnRango(
    candidatos.map((lead_id) => ({ lead_id })),
    anteriores,
  );
}

export function fetchIdsPrimeraMatricula(client, opts) {
  const key = `${opts.fechaInicio}|${opts.fechaFin}|${opts.exclusiveEnd ? 'lt' : 'lte'}`;
  if (!inflightIds.has(key)) {
    const p = cargarIdsPrimeraMatricula(client, opts).finally(() => {
      inflightIds.delete(key);
    });
    inflightIds.set(key, p);
  }
  return inflightIds.get(key);
}

export async function resolverFechaGestion(client, {
  dateFilterField,
  fechaInicio,
  fechaFin,
  activeEtapas = [],
}) {
  const plan = planFechaGestion({
    dateFilterField,
    fechaInicio,
    fechaFin,
    activeEtapas,
  });
  let matriculaIds = [];
  if (plan.kind === 'solo_matricula' || plan.kind === 'mixto') {
    matriculaIds = await fetchIdsPrimeraMatricula(client, {
      fechaInicio,
      fechaFin,
      exclusiveEnd: false,
    });
  }
  return { plan, matriculaIds };
}

export async function recolectarFilasLeads(buildQuery, plan, matriculaIds, selectCols, {
  pageSize = HISTORIAL_PAGE_SIZE,
  maxRows = Infinity,
  cancelled,
} = {}) {
  const acc = [];
  let truncated = false;
  for (const rama of ramasDePlan(plan)) {
    if (rama === 'matricula' && matriculaIds.length === 0) continue;
    if (plan.kind === 'solo_matricula' && matriculaIds.length === 0) continue;
    let from = 0;
    while (acc.length < maxRows) {
      if (cancelled?.()) return { rows: acc, truncated, cancelled: true };
      const { data, error } = await buildQuery(selectCols, rama).range(
        from,
        from + pageSize - 1,
      );
      if (error) throw error;
      const batch = data || [];
      const room = maxRows === Infinity ? batch.length : maxRows - acc.length;
      if (batch.length > room) {
        acc.push(...batch.slice(0, room));
        return { rows: acc, truncated: true };
      }
      acc.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }
  return { rows: acc, truncated };
}
