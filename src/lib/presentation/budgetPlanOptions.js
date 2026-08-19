import { supabase } from '../../supabaseClient'
import { moneyStr } from './budget'

/** Parsea "15%" / "20%" / "N/A" → fracción 0–1 o null. */
export function parseDiscountRate(descuento) {
  if (descuento == null || descuento === '') return null
  const s = String(descuento).trim().toUpperCase()
  if (s === 'N/A' || s === 'NA') return null
  const n = Number(s.replace('%', '').replace(',', '.').trim())
  if (!Number.isFinite(n)) return null
  return n / 100
}

export function formatDiscountLabel(descuento) {
  const rate = parseDiscountRate(descuento)
  if (rate == null) return 'N/A'
  return `${Math.round(rate * 100)}%`
}

/**
 * Modalidad contado: el % (Elite 15% / Platinum 20%) se aplica sobre
 * "Inversión final hoy".
 * - beneficio = final_hoy × descuento
 * - en lugar de invertir = final_hoy
 * - inversión final = final_hoy − beneficio
 */
export function computeModalidadFromPlan(plan, inversionFinalHoy) {
  if (!plan) {
    return {
      beneficio_exclusivo: '',
      valor_vinculacion: '',
      inversion_final: '',
      descuentoLabel: '15%',
      planNombre: '',
    }
  }
  const base = Number(String(inversionFinalHoy ?? '').replace(/,/g, '').trim())
  const rate = parseDiscountRate(plan.descuento) ?? 0
  if (!Number.isFinite(base)) {
    return {
      beneficio_exclusivo: '',
      valor_vinculacion: '',
      inversion_final: '',
      descuentoLabel: formatDiscountLabel(plan.descuento),
      planNombre: plan.plan_nombre || '',
    }
  }
  const beneficio = Math.round(base * rate * 100) / 100
  const final = Math.round((base - beneficio) * 100) / 100
  return {
    beneficio_exclusivo: moneyStr(beneficio),
    valor_vinculacion: moneyStr(base),
    inversion_final: moneyStr(final),
    descuentoLabel: formatDiscountLabel(plan.descuento),
    planNombre: plan.plan_nombre || '',
  }
}

function planNameKey(plan) {
  return String(plan?.plan_nombre || '').trim().toLowerCase()
}

/** Elite (contado, 1 mes): cuota mensual se muestra como "No aplica". */
export function isCuotaNoAplica(planOrNumero) {
  if (planOrNumero && typeof planOrNumero === 'object') {
    if (planNameKey(planOrNumero) === 'elite') return true
    return Number(planOrNumero.plan_numero) === 1
  }
  const n = Number(planOrNumero)
  return Number.isFinite(n) && n === 1
}

/**
 * Fila de alternativas a partir de un plan del catálogo.
 * Columna "Inscripción": Elite → inscripcion; resto → cuota_mensual.
 */
export function optionFieldsFromPlan(plan) {
  if (!plan) return null
  const noCuota = isCuotaNoAplica(plan)
  return {
    plan: plan.plan_nombre || '',
    inscripcion: noCuota ? moneyStr(plan.inscripcion) : moneyStr(plan.cuota_mensual),
    meses: plan.meses != null ? String(plan.meses) : '',
    cuota_mensual: noCuota ? 'No aplica' : moneyStr(plan.cuota_mensual),
    // valor_aproximado lo deja el comercial
  }
}

export async function listBudgetPlanOptions() {
  const { data, error } = await supabase
    .from('lead_presentation_budget_plan_options')
    .select('*')
    .order('plan_numero', { ascending: true })
  if (error) throw error
  return data || []
}

export function findPlanByNumero(plans, numero) {
  const n = Number(String(numero).trim())
  if (!Number.isFinite(n)) return null
  return (plans || []).find((p) => Number(p.plan_numero) === n) || null
}

export function findPlanByUsuarios(plans, usuarios) {
  const list = plans || []
  const wantPlatinum = Number(usuarios) === 2
  const name = wantPlatinum ? 'platinum' : 'elite'
  const byName = list.find((p) => planNameKey(p) === name)
  if (byName) return byName
  // Staging seed: Elite = 1, Platinum = 2 (en prod son 100 / 101)
  const fallbackNumero = wantPlatinum ? 2 : 1
  return list.find((p) => Number(p.plan_numero) === fallbackNumero) || null
}
