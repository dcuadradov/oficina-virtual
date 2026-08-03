import { supabase } from '../../supabaseClient'

/**
 * Borra drafts (run_id IS NULL) de las tablas de presentación para un lead.
 * No toca leads ni runs ya generados.
 */
export async function discardPresentationDrafts(cardId) {
  const id = String(cardId)

  // options primero (FK a budget)
  const { error: optErr } = await supabase
    .from('lead_presentation_budget_options')
    .delete()
    .eq('card_id', id)
    .is('run_id', null)
  if (optErr) throw optErr

  const { error: budErr } = await supabase
    .from('lead_presentation_budget')
    .delete()
    .eq('card_id', id)
    .is('run_id', null)
  if (budErr) throw budErr

  const { error: dataErr } = await supabase
    .from('lead_presentation_data')
    .delete()
    .eq('card_id', id)
    .is('run_id', null)
  if (dataErr) throw dataErr
}

/**
 * Asocia todos los drafts del card_id al run recién generado.
 */
export async function associateDraftsToRun(cardId, runId) {
  const id = String(cardId)

  const { error: dataErr } = await supabase
    .from('lead_presentation_data')
    .update({ run_id: runId, updated_at: new Date().toISOString() })
    .eq('card_id', id)
    .is('run_id', null)
  if (dataErr) throw dataErr

  const { error: budErr } = await supabase
    .from('lead_presentation_budget')
    .update({ run_id: runId, updated_at: new Date().toISOString() })
    .eq('card_id', id)
    .is('run_id', null)
  if (budErr) throw budErr

  const { error: optErr } = await supabase
    .from('lead_presentation_budget_options')
    .update({ run_id: runId, updated_at: new Date().toISOString() })
    .eq('card_id', id)
    .is('run_id', null)
  if (optErr) throw optErr
}
