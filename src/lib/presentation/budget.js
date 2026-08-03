import { supabase } from '../../supabaseClient'

export const BUDGET_OPTION_COUNT = 4

export const BUDGET_FIELDS = [
  'inversion_regular',
  'bono',
  'inversion_final_hoy',
  'beneficio_exclusivo',
  'valor_vinculacion',
  'inversion_final',
  'equivalente_a',
  'comentarios',
  'modalidad_selected',
]

export const BUDGET_OPTION_FIELDS = [
  'plan',
  'inscripcion',
  'meses',
  'cuota_mensual',
  'valor_aproximado',
  'selected',
]

export function emptyBudget() {
  return {
    inversion_regular: '',
    bono: '',
    inversion_final_hoy: '',
    beneficio_exclusivo: '',
    valor_vinculacion: '',
    inversion_final: '',
    equivalente_a: '',
    comentarios: '',
    modalidad_selected: false,
  }
}

export function emptyBudgetOption() {
  return {
    plan: '',
    inscripcion: '',
    meses: '',
    cuota_mensual: '',
    valor_aproximado: '',
    selected: false,
  }
}

export function emptyBudgetOptions(n = BUDGET_OPTION_COUNT) {
  return Array.from({ length: n }, () => emptyBudgetOption())
}

function toMoney(v) {
  if (v == null || v === '') return null
  const raw = String(v).trim()
  const normalized =
    /\.\d{3}(\.|$)/.test(raw) || raw.includes(',')
      ? raw.replace(/\./g, '').replace(/,/g, '.')
      : raw.replace(/,/g, '')
  const n = typeof v === 'number' ? v : Number(normalized)
  return Number.isFinite(n) ? n : null
}

function toInt(v) {
  if (v == null || v === '') return null
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

export function moneyStr(v) {
  if (v == null || v === '') return ''
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return String(v)
  return String(n)
}

/** Inversión final hoy = inversión regular − bono. */
export function computeInversionFinalHoy(inversionRegular, bono) {
  const reg = toMoney(inversionRegular)
  if (reg == null) return ''
  const b = toMoney(bono) ?? 0
  return moneyStr(Math.round((reg - b) * 100) / 100)
}

export function normalizeBudget(row) {
  const out = emptyBudget()
  if (!row) return out
  for (const key of BUDGET_FIELDS) {
    if (key === 'modalidad_selected') {
      out.modalidad_selected = Boolean(row.modalidad_selected)
      continue
    }
    if (row[key] == null || row[key] === '') out[key] = ''
    else out[key] = String(row[key])
  }
  return out
}

function optionFieldsFromRow(r) {
  return {
    plan: r?.plan != null ? String(r.plan) : '',
    inscripcion: r?.inscripcion != null ? String(r.inscripcion) : '',
    meses: r?.meses != null ? String(r.meses) : '',
    cuota_mensual: r?.cuota_mensual != null ? String(r.cuota_mensual) : '',
    valor_aproximado: r?.valor_aproximado != null ? String(r.valor_aproximado) : '',
    selected: Boolean(r?.selected),
  }
}

/**
 * Normaliza filas de DB (con sort_order) o el array en memoria (por índice 0..3).
 * Sin esto, el dirty del slide 33 nunca detectaba cambios en alternativas.
 */
export function normalizeBudgetOptions(rows) {
  const opts = emptyBudgetOptions(BUDGET_OPTION_COUNT)
  if (!Array.isArray(rows)) return opts

  const hasSortOrder = rows.some((r) => r != null && r.sort_order != null && r.sort_order !== '')
  if (hasSortOrder) {
    for (const r of rows) {
      if (!r) continue
      const idx = Number(r.sort_order) - 1
      if (!Number.isFinite(idx) || idx < 0 || idx >= BUDGET_OPTION_COUNT) continue
      opts[idx] = optionFieldsFromRow(r)
    }
    return opts
  }

  for (let i = 0; i < Math.min(rows.length, BUDGET_OPTION_COUNT); i++) {
    if (!rows[i]) continue
    opts[i] = optionFieldsFromRow(rows[i])
  }
  return opts
}

export function isBudgetDirty(current, saved, opts = {}) {
  const a = normalizeBudget(current)
  const b = normalizeBudget(saved)
  const keys =
    opts.budgetFields === 'comentarios'
      ? ['comentarios', 'modalidad_selected']
      : BUDGET_FIELDS
  return keys.some((k) => {
    if (k === 'modalidad_selected') return Boolean(a[k]) !== Boolean(b[k])
    return (a[k] || '') !== (b[k] || '')
  })
}

export function isBudgetOptionsDirty(current, saved) {
  const a = normalizeBudgetOptions(current)
  const b = normalizeBudgetOptions(saved)
  for (let i = 0; i < BUDGET_OPTION_COUNT; i++) {
    for (const key of BUDGET_OPTION_FIELDS) {
      if (key === 'selected') {
        if (Boolean(a[i][key]) !== Boolean(b[i][key])) return true
        continue
      }
      if ((a[i][key] || '') !== (b[i][key] || '')) return true
    }
  }
  return false
}

/** Dirty del plan: presupuesto + alternativas (incluye fila extra aunque no haya tabla). */
export function isPlanDraftDirty(
  budget,
  savedBudget,
  options,
  savedOptions,
  { budgetFields = 'full' } = {},
) {
  return (
    isBudgetDirty(budget, savedBudget, { budgetFields }) ||
    isBudgetOptionsDirty(options, savedOptions)
  )
}

/** Nombre del plan elegido (modalidad Elite/Platinum o fila selected). */
export function resolveSelectedPlanName(budget, options, { twoPersons = false } = {}) {
  if (budget?.modalidad_selected) return twoPersons ? 'Platinum' : 'Elite'
  const row = (options || []).find((o) => o?.selected && String(o.plan || '').trim())
  return row ? String(row.plan).trim() : null
}

export async function getBudgetDraft(cardId) {
  const { data, error } = await supabase
    .from('lead_presentation_budget')
    .select('*')
    .eq('card_id', String(cardId))
    .is('run_id', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getBudgetOptionsDraft(cardId) {
  const { data, error } = await supabase
    .from('lead_presentation_budget_options')
    .select('*')
    .eq('card_id', String(cardId))
    .is('run_id', null)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getBudgetByRun(runId) {
  const { data, error } = await supabase
    .from('lead_presentation_budget')
    .select('*')
    .eq('run_id', runId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getBudgetOptionsByRun(runId) {
  const { data, error } = await supabase
    .from('lead_presentation_budget_options')
    .select('*')
    .eq('run_id', runId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

const PAYMENT_LINK_WEBHOOK_URL = 'https://api.mdenglish.us/webhook/link_de_pago'
const CONTRACT_WEBHOOK_URL = 'https://api.mdenglish.us/webhook/envio_contrato'

async function notifyPlanWebhook(url, { cardId, plan }, label) {
  const payload = {
    card_id: String(cardId),
    plan: String(plan),
  }
  const endpoint = new URL(url)
  endpoint.searchParams.set('card_id', payload.card_id)
  endpoint.searchParams.set('plan', payload.plan)

  const response = await fetch(endpoint.toString(), { method: 'GET' })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Webhook ${label} falló (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    )
  }
  return payload
}

/** Notifica el plan elegido para generar link de pago (GET: card_id, plan). */
export async function notifyPaymentLink({ cardId, plan }) {
  return notifyPlanWebhook(PAYMENT_LINK_WEBHOOK_URL, { cardId, plan }, 'link de pago')
}

/** Notifica el plan elegido para envío de contrato (GET: card_id, plan). */
export async function notifyContract({ cardId, plan }) {
  return notifyPlanWebhook(CONTRACT_WEBHOOK_URL, { cardId, plan }, 'envio de contrato')
}

/**
 * Upsert draft de presupuesto + hasta 4 opciones.
 * @param {object} [opts]
 * @param {'full'|'comentarios'} [opts.budgetFields]
 * @param {boolean} [opts.twoPersons]
 * @param {boolean} [opts.notifySelection] - enviar webhook si hay plan elegido
 */
export async function upsertBudgetDraft(cardId, budget, options = [], opts = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const commentsOnly = opts.budgetFields === 'comentarios'

  const payload = commentsOnly
    ? {
        card_id: String(cardId),
        run_id: null,
        inversion_regular: null,
        bono: null,
        inversion_final_hoy: null,
        beneficio_exclusivo: null,
        valor_vinculacion: null,
        inversion_final: null,
        equivalente_a: null,
        comentarios: budget.comentarios?.trim() ? String(budget.comentarios) : null,
        modalidad_selected: Boolean(budget.modalidad_selected),
        updated_at: new Date().toISOString(),
      }
    : {
        card_id: String(cardId),
        run_id: null,
        inversion_regular: toMoney(budget.inversion_regular),
        bono: toMoney(budget.bono),
        inversion_final_hoy: toMoney(budget.inversion_final_hoy),
        beneficio_exclusivo: toMoney(budget.beneficio_exclusivo),
        valor_vinculacion: toMoney(budget.valor_vinculacion),
        inversion_final: toMoney(budget.inversion_final),
        equivalente_a: budget.equivalente_a?.trim() ? String(budget.equivalente_a) : null,
        comentarios: budget.comentarios?.trim() ? String(budget.comentarios) : null,
        modalidad_selected: Boolean(budget.modalidad_selected),
        updated_at: new Date().toISOString(),
      }
  if (user?.email) payload.updated_by = user.email

  const existing = await getBudgetDraft(cardId)
  let budgetRow
  if (existing?.id) {
    const { data, error } = await supabase
      .from('lead_presentation_budget')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    budgetRow = data
  } else {
    const { data, error } = await supabase
      .from('lead_presentation_budget')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    budgetRow = data
  }

  await supabase
    .from('lead_presentation_budget_options')
    .delete()
    .eq('card_id', String(cardId))
    .is('run_id', null)

  const optionRows = []
  const normalized = normalizeBudgetOptions(options)
  for (let i = 0; i < BUDGET_OPTION_COUNT; i++) {
    const o = normalized[i]
    const empty =
      !o.plan &&
      !o.inscripcion &&
      !o.meses &&
      !o.cuota_mensual &&
      !o.valor_aproximado
    if (empty) continue
    optionRows.push({
      card_id: String(cardId),
      run_id: null,
      budget_id: budgetRow.id,
      sort_order: i + 1,
      plan: o.plan || null,
      inscripcion: toMoney(o.inscripcion),
      meses: toInt(o.meses),
      cuota_mensual: o.cuota_mensual?.trim() ? String(o.cuota_mensual).trim() : null,
      valor_aproximado: o.valor_aproximado || null,
      selected: Boolean(o.selected),
    })
  }

  if (optionRows.length) {
    const { error } = await supabase.from('lead_presentation_budget_options').insert(optionRows)
    if (error) throw error
  }

  const savedOptions = await getBudgetOptionsDraft(cardId)
  return {
    budget: normalizeBudget(budgetRow),
    options: normalizeBudgetOptions(savedOptions),
  }
}
