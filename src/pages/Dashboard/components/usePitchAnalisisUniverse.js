import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

// Configuración de los 3 sub-tabs de Análisis y los valores de pitch_result
// que componen el universo de cada uno.
export const ANALISIS_SUBTABS = [
  {
    id: 'no_matricula',
    label: 'No fueron matrícula',
    results: ['Interés futuro', 'Posible matrícula', 'No matrícula', 'Pago pendiente'],
    levels: ['categoria', 'subcategoria'],
  },
  {
    id: 'reprobados',
    label: 'Reprobados',
    results: ['Reprobado'],
    levels: ['etapa', 'categoria', 'subcategoria'],
  },
  {
    id: 'matricula',
    label: 'Matrícula',
    results: ['Matrícula'],
    levels: [],
  },
];

export const getSubTabConfig = (id) =>
  ANALISIS_SUBTABS.find(t => t.id === id) || ANALISIS_SUBTABS[0];

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;

// Parsea "YYYY-MM-DD HH:MM" sin conversión de zona horaria.
const parseDT = (s) => {
  if (!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return {
    dateLocal: new Date(parseInt(y), parseInt(mo) - 1, parseInt(d)),
    hour: h !== undefined ? parseInt(h) : 0,
    minute: mi !== undefined ? parseInt(mi) : 0,
  };
};

/**
 * Trae el universo de Análisis para el sub-tab activo: filas de
 * pitches_resultados (con el pitch_result del sub-tab) en el rango, unidas con
 * los datos del lead (comercial, tag y dimensiones). El pool se acota SOLO por
 * periodo + sub-tab (no por comercial/tags/dimensiones) para que las opciones
 * de los filtros se calculen de forma facetada aguas arriba.
 *
 * Devuelve filas: { card_id, comercial_email, label, ocupacion, sexo, edad,
 * ciudad, pais, cat, sub, stage, matricula, parsed }.
 */
export function usePitchAnalisisUniverse({ enabled, subTab, rangeStart, rangeEnd }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !rangeStart || !rangeEnd) {
      setRows([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const results = getSubTabConfig(subTab).results;
        if (results.length === 0) { setRows([]); setLoading(false); return; }

        const lo = addDays(rangeStart, -1); lo.setHours(0, 0, 0, 0);
        const hi = addDays(rangeEnd, 2); hi.setHours(0, 0, 0, 0);

        const { data: prData, error: prErr } = await supabase
          .from('pitches_resultados')
          .select('card_id, pitch_result, pitch_stage, motivo_no_matricula, motivo_no_matricula_categoria, motivo_matricula, fecha_pitch')
          .in('pitch_result', results)
          .gte('fecha_pitch', isoDay(lo))
          .lt('fecha_pitch', isoDay(hi));
        if (prErr) throw prErr;
        if (cancelled) return;

        const pitches = prData || [];
        const cardIds = [...new Set(pitches.map(p => p.card_id))];
        const leadMap = {};
        if (cardIds.length > 0) {
          const { data: leadsData, error: leadsErr } = await supabase
            .from('leads')
            .select('card_id, comercial_email, label, ocupacion, sexo, edad, ciudad, pais')
            .in('card_id', cardIds);
          if (leadsErr) throw leadsErr;
          (leadsData || []).forEach(l => { leadMap[l.card_id] = l; });
        }
        if (cancelled) return;

        const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);

        const built = [];
        for (const p of pitches) {
          const lead = leadMap[p.card_id];
          if (!lead) continue;
          const parsed = parseDT(p.fecha_pitch);
          if (!parsed) continue;
          if (parsed.dateLocal < start || parsed.dateLocal > end) continue;
          built.push({
            card_id: p.card_id,
            comercial_email: lead.comercial_email,
            label: lead.label,
            ocupacion: lead.ocupacion,
            sexo: lead.sexo,
            edad: lead.edad,
            ciudad: lead.ciudad,
            pais: lead.pais,
            cat: p.motivo_no_matricula_categoria,
            sub: p.motivo_no_matricula,
            stage: p.pitch_stage,
            matricula: p.motivo_matricula,
            parsed,
          });
        }
        setRows(built);
      } catch (e) {
        console.error('[Análisis] Error cargando universo:', e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subTab, rangeStart?.getTime(), rangeEnd?.getTime()]);

  return { rows, loading };
}
