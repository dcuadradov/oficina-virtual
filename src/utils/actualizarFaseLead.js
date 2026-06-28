import { supabase } from '../supabaseClient';

const WEBHOOK_ACTUALIZAR_FASE =
  'https://api.mdenglish.us/webhook/actualizar_fase_desde_el_portal';

/**
 * Resuelve fase_destino (nombre Pipefy o etapa funnel) → campos de leads.
 */
export async function resolverFaseDestino(faseDestino) {
  const destino = btrim(faseDestino);
  if (!destino) return null;

  const { data: stepperByName } = await supabase
    .from('config_stepper')
    .select('fase_id_pipefy, nombre_fase')
    .eq('nombre_fase', destino)
    .limit(1)
    .maybeSingle();

  let faseId = stepperByName?.fase_id_pipefy
    ? String(stepperByName.fase_id_pipefy)
    : null;

  if (!faseId) {
    const { data: fasesByEtapa } = await supabase
      .from('config_fases')
      .select('fase_id_pipefy')
      .eq('etapa_funnel_agrupada', destino)
      .order('orden_funnel', { ascending: true })
      .limit(1);
    faseId = fasesByEtapa?.[0]?.fase_id_pipefy
      ? String(fasesByEtapa[0].fase_id_pipefy)
      : null;
  }

  if (!faseId) {
    return {
      fase_id_pipefy: null,
      fase_nombre_pipefy: destino,
      etapa_funnel: destino,
    };
  }

  const [{ data: stepper }, { data: configFase }] = await Promise.all([
    supabase
      .from('config_stepper')
      .select('nombre_fase')
      .eq('fase_id_pipefy', faseId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('config_fases')
      .select('etapa_funnel_agrupada')
      .eq('fase_id_pipefy', faseId)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    fase_id_pipefy: faseId,
    fase_nombre_pipefy: stepper?.nombre_fase || destino,
    etapa_funnel: configFase?.etapa_funnel_agrupada || destino,
  };
}

function btrim(value) {
  return String(value ?? '').trim();
}

async function actualizarFaseEnDb(cardId, campos) {
  const payload = {};
  if (campos.fase_id_pipefy) payload.fase_id_pipefy = campos.fase_id_pipefy;
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
  const resolved = faseResuelta || (await resolverFaseDestino(faseDestino));

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
