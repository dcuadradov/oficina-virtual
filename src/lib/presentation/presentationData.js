import { supabase } from '../../supabaseClient'

/** Columnas editables de lead_presentation_data (sin metadatos). */
export const PRESENTATION_DATA_FIELDS = [
  'antecedentes',
  'resultado_antecedentes',
  'viabilidad',
  'resultado_viabilidad',
  'autonomia',
  'resultado_autonomia',
  'conducta',
  'resultado_conducta',
  'inquietudes_pendientes',
  'hallazgos_relevantes',
  'confirmacion_diagnostica',
  'contraindicaciones',
  'conducta_propuesta',
  'beneficio',
]

export function emptyPresentationData() {
  return Object.fromEntries(PRESENTATION_DATA_FIELDS.map((k) => [k, '']))
}

export function normalizePresentationData(row) {
  const out = emptyPresentationData()
  if (!row) return out
  for (const key of PRESENTATION_DATA_FIELDS) {
    out[key] = row[key] != null ? String(row[key]) : ''
  }
  return out
}

/** Draft actual (run_id IS NULL) para un lead. */
export async function getPresentationDataDraft(cardId) {
  const { data, error } = await supabase
    .from('lead_presentation_data')
    .select('*')
    .eq('card_id', String(cardId))
    .is('run_id', null)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Datos asociados a un run (resultado público). */
export async function getPresentationDataByRun(runId) {
  const { data, error } = await supabase
    .from('lead_presentation_data')
    .select('*')
    .eq('run_id', runId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Upsert del draft (run_id null). Si no hay fila draft, inserta una nueva.
 */
export async function upsertPresentationData(cardId, fields = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const existing = await getPresentationDataDraft(cardId)
  const payload = {
    card_id: String(cardId),
    run_id: null,
    updated_at: new Date().toISOString(),
  }
  if (user?.email) payload.updated_by = user.email

  for (const key of PRESENTATION_DATA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      const v = fields[key]
      payload[key] = v == null || v === '' ? null : String(v)
    }
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('lead_presentation_data')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('lead_presentation_data')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export function isPresentationDataDirty(current, saved) {
  const a = normalizePresentationData(current)
  const b = normalizePresentationData(saved)
  return PRESENTATION_DATA_FIELDS.some((k) => (a[k] || '') !== (b[k] || ''))
}

/** @deprecated usar getPresentationDataDraft */
export async function getPresentationData(cardId) {
  return getPresentationDataDraft(cardId)
}
