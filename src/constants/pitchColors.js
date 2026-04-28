// =============================================================================
// Convenciones de color y estados visuales del calendario "Mis Pitch".
//
// Cada estado tiene:
//   - id:         clave estable (snake_case)
//   - label:      cómo se muestra al usuario (chips de leyenda/filtro)
//   - cardActive: clases Tailwind para tarjetas FUTURAS (pitch que aún no
//                 ha llegado, o resultado nuevo)
//   - cardPast:   clases Tailwind para tarjetas PASADAS (atenuadas)
//   - chip:       clases Tailwind para el chip de leyenda/filtro
//   - chipText:   color de texto sobre el chip
//
// Reglas de matching contra una fila de `vw_pitches_calendario`:
//   - matchOrigen:        coincide si row.origen === valor
//   - matchPitchResult:   coincide si row.resultado_pitch_result === valor
//   - matchRescheduled:   coincide si row.resultado_rescheduled === valor
//                         (solo se evalúa si pitch_result está vacío)
//
// El helper `getPitchState(row)` aplica la jerarquía:
//   1) origen 'agendado'              → estado "agendado"
//   2) resultado_pitch_result no nulo → match por pitch_result
//   3) resultado_rescheduled no nulo  → match por rescheduled
//   4) si nada coincide               → null (estado "sin clasificar")
// =============================================================================

export const PITCH_STATES = [
  {
    id: 'agendado',
    label: 'Agendado',
    matchOrigen: 'agendado',
    cardActive:  'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
    cardPast:    'bg-slate-200 text-slate-600 border-slate-400 hover:bg-slate-300',
    chip:        'bg-blue-500',
    chipText:    'text-white',
  },
  {
    id: 'matricula',
    label: 'Matrícula',
    matchPitchResult: 'Matrícula',
    cardActive:  'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600',
    cardPast:    'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
    chip:        'bg-emerald-500',
    chipText:    'text-white',
  },
  {
    id: 'posible_matricula',
    label: 'Posible matrícula',
    matchPitchResult: 'Posible matrícula',
    cardActive:  'bg-emerald-300 text-emerald-900 border-emerald-400 hover:bg-emerald-400',
    cardPast:    'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    chip:        'bg-emerald-300',
    chipText:    'text-emerald-900',
  },
  {
    id: 'pendiente_pago',
    label: 'Pendiente de pago',
    matchPitchResult: 'Pendiente de pago',
    cardActive:  'bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-500',
    cardPast:    'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
    chip:        'bg-amber-400',
    chipText:    'text-amber-900',
  },
  {
    id: 'interes_futuro',
    label: 'Interés futuro',
    matchPitchResult: 'Interés futuro',
    cardActive:  'bg-sky-400 text-white border-sky-500 hover:bg-sky-500',
    cardPast:    'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200',
    chip:        'bg-sky-400',
    chipText:    'text-white',
  },
  {
    id: 'no_matricula',
    label: 'No matrícula',
    matchPitchResult: 'No matrícula',
    cardActive:  'bg-rose-500 text-white border-rose-600 hover:bg-rose-600',
    cardPast:    'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
    chip:        'bg-rose-500',
    chipText:    'text-white',
  },
  {
    id: 'reprobado',
    label: 'Reprobado',
    matchPitchResult: 'Reprobado',
    cardActive:  'bg-slate-500 text-white border-slate-600 hover:bg-slate-600',
    cardPast:    'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
    chip:        'bg-slate-500',
    chipText:    'text-white',
  },
  {
    id: 'reprogramado',
    label: 'Reprogramado',
    matchRescheduled: 'Si',
    cardActive:  'bg-orange-400 text-white border-orange-500 hover:bg-orange-500',
    cardPast:    'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
    chip:        'bg-orange-400',
    chipText:    'text-white',
  },
  {
    id: 'sin_reprogramar',
    label: 'Sin reprogramar',
    matchRescheduled: 'No',
    cardActive:  'bg-rose-700 text-white border-rose-800 hover:bg-rose-800',
    cardPast:    'bg-rose-200 text-rose-800 border-rose-300 hover:bg-rose-300',
    chip:        'bg-rose-700',
    chipText:    'text-white',
  },
];

const STATE_FALLBACK = {
  id: 'sin_clasificar',
  label: 'Sin clasificar',
  cardActive: 'bg-slate-400 text-white border-slate-500 hover:bg-slate-500',
  cardPast:   'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200',
  chip:       'bg-slate-400',
  chipText:   'text-white',
};

/**
 * Determina el estado visual de una fila de vw_pitches_calendario.
 * Devuelve siempre un objeto (nunca null) — usa STATE_FALLBACK como respaldo.
 */
export function getPitchState(row) {
  if (!row) return STATE_FALLBACK;

  if (row.origen === 'agendado') {
    return PITCH_STATES.find(s => s.matchOrigen === 'agendado') || STATE_FALLBACK;
  }

  const pr = row.resultado_pitch_result;
  if (pr) {
    return PITCH_STATES.find(s => s.matchPitchResult === pr) || STATE_FALLBACK;
  }

  const rs = row.resultado_rescheduled;
  if (rs === 'Si') return PITCH_STATES.find(s => s.id === 'reprogramado') || STATE_FALLBACK;
  if (rs === 'No') return PITCH_STATES.find(s => s.id === 'sin_reprogramar') || STATE_FALLBACK;

  return STATE_FALLBACK;
}

/**
 * Devuelve las clases Tailwind para una tarjeta del calendario.
 * `isPast`: true si el pitch ya pasó (mostrar versión atenuada).
 */
export function getPitchCardClasses(row, isPast) {
  const state = getPitchState(row);
  return isPast ? state.cardPast : state.cardActive;
}
