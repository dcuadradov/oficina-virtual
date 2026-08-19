/** Hay un plan marcado: modalidad de contado o una fila selected. */
export function hasSelectedPayment(budget, options = []) {
  if (budget?.modalidad_selected) return true
  return options.some((row) => Boolean(row?.selected))
}

/** Landing de contado (Elite / Platinum) vs. otras opciones. */
export function isContadoPropuesta(budget) {
  return Boolean(budget?.modalidad_selected)
}

export function optionHasContent(row) {
  if (!row) return false
  return Boolean(
    String(row.plan || '').trim() ||
      String(row.inscripcion || '').trim() ||
      String(row.meses || '').trim() ||
      String(row.cuota_mensual || '').trim() ||
      String(row.valor_aproximado || '').trim(),
  )
}

/**
 * 3 alternativas + la 4ª (siempre, si tiene datos).
 * La seleccionada va primero; el resto conserva su orden.
 */
export function orderedFinancingOptions(options = []) {
  const rows = Array.from({ length: 4 }, (_, i) => options[i] || {})
  const withMeta = rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => optionHasContent(row))

  const selected = withMeta.filter(({ row }) => row.selected)
  const rest = withMeta.filter(({ row }) => !row.selected)
  return [...selected, ...rest]
}

export function formatUsdAmount(raw) {
  if (raw == null || raw === '') return ''
  const s = String(raw).trim()
  if (!s) return ''
  if (/[a-záéíóúñ]/i.test(s) && Number.isNaN(Number(s.replace(/[.,]/g, '')))) return s
  const n = typeof raw === 'number' ? raw : Number(String(s).replace(/,/g, ''))
  if (!Number.isFinite(n)) return s
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

/** 15% Elite / 20% Platinum, inferido de los montos guardados. */
export function discountLabelFromBudget(budget) {
  const beneficio = Number(budget?.beneficio_exclusivo)
  const base = Number(budget?.valor_vinculacion || budget?.inversion_final_hoy)
  if (Number.isFinite(beneficio) && Number.isFinite(base) && base > 0 && beneficio / base > 0.17) {
    return '20%'
  }
  return '15%'
}
