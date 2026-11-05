export const SIN_PAIS = 'Sin país';

export const ETAPAS_SIN_CONTACTO = ['Sin contacto'];

export const ETAPAS_GESTIONANDO = [
  'Gestionando',
  'Pendiente de agenda',
  'Listo para agendar',
  'Agendado',
  'Interés futuro',
  'Reprogramar',
  'Posible matrícula',
  'Pago pendiente',
];

export const ETAPAS_MATRICULA = ['Matrícula'];

export const ETAPAS_DESCARTADO = [
  'Descartado',
  'No se matriculó',
  'Matrícula caída',
  'Dejó de contestar',
  'MINDTAP',
  'Datos de contacto errados',
];

export const LINE_COLORS = ['#1717AF', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];
export const COLOR_OTROS = '#94A3B8';
export const TOP_N = 5;

export function paisKey(pais) {
  if (pais == null || String(pais).trim() === '') return SIN_PAIS;
  return String(pais).trim();
}

export function buildDayList(startDateLocal, endDateLocal) {
  const days = [];
  if (!startDateLocal || !endDateLocal) return days;
  const [ys, ms, ds] = startDateLocal.split('-').map(Number);
  const [ye, me, de] = endDateLocal.split('-').map(Number);
  const cur = new Date(Date.UTC(ys, ms - 1, ds));
  const end = new Date(Date.UTC(ye, me - 1, de));
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    days.push({
      dateKey: `${y}-${m}-${d}`,
      dayLabel: `${d}`,
      dayFull: `${d}/${m}`,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export function dateKeyUtcMinus5(tsString) {
  if (!tsString) return null;
  const d = new Date(tsString);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function funnelPct(count, baselineCount) {
  if (!baselineCount) return null;
  return (count / baselineCount) * 100;
}

export function filtrarPorEtapas(rows, etapas) {
  const set = new Set(etapas);
  return (rows || []).filter((row) => set.has(row.etapa_funnel));
}

export function agregarPorPaisYDia(rows, dateField) {
  const totalsByPais = {};
  const byDayByPais = {};
  let total = 0;
  for (const row of rows || []) {
    const key = paisKey(row.pais);
    totalsByPais[key] = (totalsByPais[key] || 0) + 1;
    total += 1;
    const dKey = dateKeyUtcMinus5(row[dateField]);
    if (!dKey) continue;
    if (!byDayByPais[dKey]) byDayByPais[dKey] = {};
    byDayByPais[dKey][key] = (byDayByPais[dKey][key] || 0) + 1;
  }
  return { totalsByPais, byDayByPais, total };
}

export function sortedPaises({
  totalsByPais = {},
  total = 0,
  baselineByPais = null,
  pctMode = 'share',
} = {}) {
  return Object.entries(totalsByPais)
    .map(([pais, count]) => {
      const sharePct = total ? (count / total) * 100 : 0;
      const conversionPct = pctMode === 'funnel'
        ? funnelPct(count, baselineByPais?.[pais] || 0)
        : sharePct;
      return {
        pais,
        count,
        sharePct,
        pct: conversionPct,
      };
    })
    .sort((a, b) => b.count - a.count);
}
