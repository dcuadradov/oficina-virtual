import { supabase } from '../supabaseClient';

const WEBHOOK_ACTUALIZAR_FASE =
  'https://api.mdenglish.us/webhook/actualizar_fase_desde_el_portal';

/** Cache en memoria de config_fases + config_stepper (carga una vez por sesión). */
let configCache = null;
let configCachePromise = null;

async function getConfigCache() {
  if (configCache) return configCache;
  if (!configCachePromise) {
    configCachePromise = Promise.all([
      supabase
        .from('config_fases')
        .select('fase_id_pipefy, etapa_funnel_agrupada, orden_funnel'),
      supabase
        .from('config_stepper')
        .select('fase_id_pipefy, nombre_fase'),
    ]).then(([fasesRes, stepperRes]) => {
      const fasesById = new Map();
      const fasesByEtapa = new Map();

      for (const f of fasesRes.data || []) {
        if (!f.fase_id_pipefy) continue;
        const id = String(f.fase_id_pipefy);
        fasesById.set(id, f);
        const etapa = f.etapa_funnel_agrupada;
        if (!etapa) continue;
        if (!fasesByEtapa.has(etapa)) fasesByEtapa.set(etapa, []);
        fasesByEtapa.get(etapa).push(f);
      }

      for (const lista of fasesByEtapa.values()) {
        lista.sort((a, b) => (a.orden_funnel ?? 99) - (b.orden_funnel ?? 99));
      }

      const stepperById = new Map();
      const stepperByName = new Map();
      for (const s of stepperRes.data || []) {
        if (!s.fase_id_pipefy) continue;
        const id = String(s.fase_id_pipefy);
        stepperById.set(id, s);
        if (s.nombre_fase) stepperByName.set(s.nombre_fase, s);
      }

      configCache = { fasesById, fasesByEtapa, stepperById, stepperByName };
      return configCache;
    });
  }
  return configCachePromise;
}

/**
 * Resuelve fase_destino (nombre Pipefy o etapa funnel) → campos de leads.
 * fase_id_pipefy solo se devuelve si existe en config_fases (FK de leads).
 */
export async function resolverFaseDestino(faseDestino) {
  const destino = btrim(faseDestino);
  if (!destino) return null;

  const { fasesById, fasesByEtapa, stepperByName, stepperById } =
    await getConfigCache();

  const stepperByNameMatch = stepperByName.get(destino);
  if (stepperByNameMatch?.fase_id_pipefy) {
    const faseId = String(stepperByNameMatch.fase_id_pipefy);
    const configFase = fasesById.get(faseId);
    if (configFase) {
      return {
        fase_id_pipefy: faseId,
        fase_nombre_pipefy: stepperByNameMatch.nombre_fase,
        etapa_funnel: configFase.etapa_funnel_agrupada || destino,
      };
    }
  }

  const fasesEtapa = fasesByEtapa.get(destino);
  if (fasesEtapa?.[0]?.fase_id_pipefy) {
    const faseId = String(fasesEtapa[0].fase_id_pipefy);
    const nombreFase = stepperById.get(faseId)?.nombre_fase;
    return {
      fase_id_pipefy: faseId,
      fase_nombre_pipefy: nombreFase || destino,
      etapa_funnel: fasesEtapa[0].etapa_funnel_agrupada || destino,
    };
  }

  return {
    fase_id_pipefy: null,
    fase_nombre_pipefy: destino,
    etapa_funnel: destino,
  };
}

function btrim(value) {
  return String(value ?? '').trim();
}

async function actualizarFaseEnDb(cardId, campos) {
  const payload = {};
  if (campos.fase_id_pipefy) payload.fase_id_pipefy = String(campos.fase_id_pipefy);
  if (campos.fase_nombre_pipefy) payload.fase_nombre_pipefy = campos.fase_nombre_pipefy;
  if (campos.etapa_funnel) payload.etapa_funnel = campos.etapa_funnel;

  if (Object.keys(payload).length === 0) {
    throw new Error('No se pudo resolver la fase destino');
  }

  const { error } = await supabase
    .from('leads')
    .update(payload)
    .eq('card_id', cardId);

  if (error) throw error;
}

async function llamarWebhookFase(cardId, faseDestino, telefono) {
  const body = {
    card_id: cardId,
    fase_destino: faseDestino,
  };
  const tel = btrim(telefono);
  if (tel) body.telefono = tel;

  const response = await fetch(WEBHOOK_ACTUALIZAR_FASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Error en webhook');
}

/**
 * Actualiza leads en Supabase y mueve la fase en Pipefy vía n8n.
 * Si el webhook falla, revierte la fila del lead al estado anterior.
 */
export async function actualizarFaseDesdePortal(
  cardId,
  faseDestino,
  { faseResuelta = null, faseAnterior = null, telefono = null } = {}
) {
  let resolved = faseResuelta;
  if (!resolved) {
    resolved = await resolverFaseDestino(faseDestino);
  } else if (resolved.fase_id_pipefy) {
    const { fasesById } = await getConfigCache();
    const faseId = String(resolved.fase_id_pipefy);
    const configFase = fasesById.get(faseId);
    if (!configFase) {
      resolved = { ...resolved, fase_id_pipefy: null };
    } else if (!resolved.etapa_funnel) {
      resolved = {
        ...resolved,
        etapa_funnel: configFase.etapa_funnel_agrupada || resolved.etapa_funnel,
      };
    }
  }

  await actualizarFaseEnDb(cardId, resolved);

  try {
    await llamarWebhookFase(cardId, faseDestino, telefono);
  } catch (err) {
    if (faseAnterior) {
      await actualizarFaseEnDb(cardId, faseAnterior).catch(() => {});
    }
    throw err;
  }

  return resolved;
}
