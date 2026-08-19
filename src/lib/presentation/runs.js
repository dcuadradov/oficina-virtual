import { supabase } from '../../supabaseClient'

/**
 * Lista runs de un lead (más reciente primero).
 */
export async function listPresentationRuns(cardId) {
  const { data, error } = await supabase
    .from('lead_presentation_runs')
    .select('id, card_id, version, created_at, created_by, lead_snapshot')
    .eq('card_id', String(cardId))
    .order('version', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtiene un run concreto (público o autenticado).
 */
export async function getPresentationRun(cardId, version) {
  const { data, error } = await supabase
    .from('lead_presentation_runs')
    .select('*')
    .eq('card_id', String(cardId))
    .eq('version', Number(version))
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Crea una nueva versión a partir del path/form actuales.
 */
export async function createPresentationRun({
  cardId,
  path,
  formData = {},
  leadSnapshot = {},
}) {
  const { data: latest, error: latestError } = await supabase
    .from('lead_presentation_runs')
    .select('version')
    .eq('card_id', String(cardId))
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw latestError

  const version = (latest?.version ?? 0) + 1

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const payload = {
    card_id: String(cardId),
    version,
    path,
    form_data: formData,
    lead_snapshot: leadSnapshot,
    created_by: user?.email ?? null,
  }

  const { data, error } = await supabase
    .from('lead_presentation_runs')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export function resultUrl(cardId, version) {
  return `/result/${version}/${cardId}`
}

export function propuestaUrl(cardId, version) {
  return `/propuesta/${version}/${cardId}`
}

/** Fragmento público tras `/result/` o `/propuesta/` → `1/1297586102`. */
export function resultPath(cardId, version) {
  return `${version}/${cardId}`
}

const PRESENTATION_WEBHOOK_URL =
  'https://api.mdenglish.us/webhook/envio_presentacion_personalizada'

/**
 * Notifica al webhook al Generar.
 * `result` = presentación guardada en OV.
 * `propuesta` = landing comercial que se envía al lead.
 */
export async function notifyPresentationGenerated({ cardId, version }) {
  const path = resultPath(cardId, version)
  const payload = {
    card_id: String(cardId),
    result: path,
    propuesta: path,
  }

  const response = await fetch(PRESENTATION_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Webhook presentación falló (${response.status})`)
  }

  return payload
}
