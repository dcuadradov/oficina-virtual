import { supabase } from '../supabaseClient';

const WEBHOOK_ACTUALIZAR_FASE =
  'https://api.mdenglish.us/webhook/actualizar_fase_desde_el_portal';

async function buscarEnConfigFases(faseId) {
  const { data } = await supabase
    .from('config_fases')
    .select('fase_id_pipefy, etapa_funnel_agrupada')
    .eq('fase_id_pipefy', faseId)
    .limit(1)
    .maybeSingle();
  return data;
}

async function buscarNombreFase(faseId) {
  const { data } = await supabase
    .from('config_stepper')
    .select('nombre_fase')
    .eq('fase_id_pipefy', faseId)
    .limit(1)
    .maybeSingle();
  return data?.nombre_fase || null;
}

/**
 * Resuelve fase_destino (nombre Pipefy o etapa funnel) → campos de leads.
 * fase_id_pipefy solo se devuelve si existe en config_fases (FK de leads).
 */
export async function resolverFaseDestino(faseDestino) {
  const destino = btrim(faseDestino);
  if (!destino) return null;

  // 1. Nombre Pipefy en config_stepper → validar en config_fases.
  const { data: stepperByName } = await supabase
    .from('config_stepper')
    .select('fase_id_pipefy, nombre_fase')
    .eq('nombre_fase', destino)
    .limit(1)
    .maybeSingle();

  if (stepperByName?.fase_id_pipefy) {
    const faseId = String(stepperByName.fase_id_pipefy);
    const configFase = await buscarEnConfigFases(faseId);
    if (configFase) {
      return {
        fase_id_pipefy: faseId,
        fase_nombre_pipefy: stepperByName.nombre_fase,
        etapa_funnel: configFase.etapa_funnel_agrupada || destino,
      };
    }
  }

  // 2. Etapa funnel agrupada (lo que muestra el dropdown del portal).
  const { data: fasesByEtapa } = await supabase
    .from('config_fases')
    .select('fase_id_pipefy, etapa_funnel_agrupada')
    .eq('etapa_funnel_agrupada', destino)
    .order('orden_funnel', { ascending: true })
    .limit(1);

  if (fasesByEtapa?.[0]?.fase_id_pipefy) {
    const faseId = String(fasesByEtapa[0].fase_id_pipefy);
    const nombreFase = await buscarNombreFase(faseId);
    return {
      fase_id_pipefy: faseId,
      fase_nombre_pipefy: nombreFase || destino,
      etapa_funnel: fasesByEtapa[0].etapa_funnel_agrupada || destino,
    };
  }

  // 3. Sin fase_id válido en config_fases → no tocar fase_id_pipefy (evita FK).
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

  if (campos.fase_id_pipefy) {
    const configFase = await buscarEnConfigFases(String(campos.fase_id_pipefy));
    if (configFase) {
      payload.fase_id_pipefy = String(campos.fase_id_pipefy);
    }
  }
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
