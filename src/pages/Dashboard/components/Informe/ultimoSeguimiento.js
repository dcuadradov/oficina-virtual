import { ETAPAS_DESCARTADO, paisKey } from './paisPorDia.js';

export const SIN_CATEGORIA = 'Sin categoría';
export const CATEGORIA_NO_ES_MEDICO = 'No es médico';

export function leadIdKey(value) {
  if (value == null || value === '') return null;
  return String(value);
}

export function categoriaLimpia(value) {
  const t = value == null ? '' : String(value).trim();
  return t || SIN_CATEGORIA;
}

export function esMasReciente(candidato, actual) {
  if (!actual) return true;
  const a = candidato?.created_at || '';
  const b = actual.created_at || '';
  if (a > b) return true;
  if (a < b) return false;
  const aHas = categoriaLimpia(candidato?.categoria) !== SIN_CATEGORIA;
  const bHas = categoriaLimpia(actual.categoria) !== SIN_CATEGORIA;
  return aHas && !bHas;
}

export function aplicarEvento(map, evento) {
  const id = leadIdKey(evento?.lead_id);
  if (!map || !id || !evento.created_at) return map;
  const prev = map[id];
  if (!esMasReciente(evento, prev)) return map;
  map[id] = {
    categoria: categoriaLimpia(evento.categoria),
    created_at: evento.created_at,
  };
  return map;
}

export function ultimosDesdeEventos(comentarios = [], recordatorios = []) {
  const map = {};
  (comentarios || []).forEach((evento) => aplicarEvento(map, evento));
  (recordatorios || []).forEach((evento) => aplicarEvento(map, evento));
  return map;
}

export function ultimaCategoriaDeLead(ultimos, leadId) {
  const id = leadIdKey(leadId);
  if (!id) return SIN_CATEGORIA;
  return ultimos?.[id]?.categoria || SIN_CATEGORIA;
}

export function filtrarPorUltimaCategoria(leads, ultimos, categoria) {
  return (leads || []).filter((lead) => {
    const id = leadIdKey(lead?.card_id);
    if (!id) return false;
    return ultimos?.[id]?.categoria === categoria;
  });
}

export function etiquetaMotivo({ categoria, count, pct } = {}) {
  const nombre = categoria || SIN_CATEGORIA;
  const n = Number(count) || 0;
  const p = Math.round(Number(pct) || 0);
  return `${nombre} (${n.toLocaleString('es-CO')} ${p}%)`;
}

export function contarMotivos({
  leads = [],
  ultimos = {},
  etapas = ETAPAS_DESCARTADO,
  paises = [],
} = {}) {
  const setEtapas = etapas ? new Set(etapas) : null;
  const foco = (paises || []).filter(Boolean);
  const focoSet = new Set(foco);
  const seen = new Set();
  const counts = {};
  let total = 0;

  for (const lead of leads || []) {
    if (setEtapas && !setEtapas.has(lead.etapa_funnel)) continue;
    if (focoSet.size && !focoSet.has(paisKey(lead.pais))) continue;
    const id = leadIdKey(lead.card_id);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const cat = ultimaCategoriaDeLead(ultimos, lead.card_id);
    counts[cat] = (counts[cat] || 0) + 1;
    total += 1;
  }

  const rows = Object.entries(counts)
    .map(([categoria, count]) => ({
      categoria,
      count,
      pct: total ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' });
    });

  return { rows, total };
}
