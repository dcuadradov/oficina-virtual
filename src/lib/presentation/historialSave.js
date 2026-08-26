import { supabase } from '../../supabaseClient'
import {
  isPresentationDataDirty,
  normalizePresentationData,
  upsertPresentationData,
} from './presentationData'

export const LEAD_EDIT_FIELDS = ['nombre', 'ocupacion', 'edad', 'nivel_ingles']

export const AGE_OPTIONS_FALLBACK = ['20-30', '30-40', '40-50', '50-60', 'Más de 60']

export function normalizeLeadDraft(lead) {
  const out = {}
  for (const key of LEAD_EDIT_FIELDS) {
    out[key] = lead?.[key] != null && lead[key] !== '' ? String(lead[key]) : ''
  }
  return out
}

export function isLeadDraftDirty(current, saved) {
  const a = normalizeLeadDraft(current)
  const b = normalizeLeadDraft(saved)
  return LEAD_EDIT_FIELDS.some((k) => (a[k] || '') !== (b[k] || ''))
}

export function isHistorialDirty({ formData, savedData, leadDraft, savedLead }) {
  return (
    isPresentationDataDirty(formData, savedData) ||
    isLeadDraftDirty(leadDraft, savedLead)
  )
}

/**
 * Persiste campos de presentación + actualiza el lead si cambió.
 * Si hay Antecedentes, motivacion = "Otro" y motivacion_detalle = ese texto.
 * Si Antecedentes está vacío, no se tocan esos dos campos.
 */
export async function saveHistorialChanges({
  cardId,
  formData,
  leadDraft,
  savedData,
  savedLead,
}) {
  let nextForm = normalizePresentationData(savedData)
  let nextLead = normalizeLeadDraft(savedLead)

  const formDirty = isPresentationDataDirty(formData, savedData)
  const leadDirty = isLeadDraftDirty(leadDraft, savedLead)
  const antecedentes = String(formData?.antecedentes ?? '').trim()

  if (formDirty) {
    const saved = await upsertPresentationData(cardId, formData)
    nextForm = normalizePresentationData(saved)
  }

  if (leadDirty || antecedentes) {
    const payload = {}
    if (leadDirty) {
      for (const key of LEAD_EDIT_FIELDS) {
        const v = leadDraft?.[key]
        payload[key] = v == null || v === '' ? null : String(v)
      }
    }
    if (antecedentes) {
      payload.motivacion = 'Otro'
      payload.motivacion_detalle = antecedentes
    }

    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('card_id', String(cardId))
      .select('card_id, nombre, ocupacion, edad, nivel_ingles')
      .single()
    if (error) throw error
    nextLead = normalizeLeadDraft(data)
  }

  return { formData: nextForm, lead: nextLead }
}

/**
 * Opciones de "Rango de edad" desde fields_formulario_creacion_leads.
 * Formato OV: "Opción A (1) | Opción B (2)" — ver CrearLeadModal.parseOpciones.
 */
export async function loadAgeOptions(fallback = []) {
  try {
    const { data, error } = await supabase
      .from('fields_formulario_creacion_leads')
      .select('opciones')
      .eq('nombre', 'Rango de edad')
      .maybeSingle()
    if (error || !data?.opciones) return fallback

    const opts = String(data.opciones)
      .split('|')
      .map((raw) => {
        const opt = raw.trim()
        if (!opt) return null
        const matchGrupo = opt.match(/^(.+?)\s*\((.+?)-(\d+)\)$/)
        if (matchGrupo) return matchGrupo[1].trim()
        const match = opt.match(/^(.+?)\s*\((\d+)\)$/)
        if (match) return match[1].trim()
        return opt
      })
      .filter(Boolean)

    return opts.length ? opts : fallback
  } catch {
    return fallback
  }
}
