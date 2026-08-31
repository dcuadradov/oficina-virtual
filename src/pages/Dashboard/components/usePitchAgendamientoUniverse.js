import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;

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
 * Universo del tab Agendamiento: pitches_resultados del periodo, unidos con
 * el lead (comercial, tag y dimensiones). El pool se acota SOLO por periodo
 * para que los filtros facetados se calculen aguas arriba, igual que Análisis.
 *
 * Devuelve filas: { id, card_id, comercial_email, label, ocupacion, sexo,
 * edad, ciudad, pais, cierre_pitch, parsed }.
 */
export function usePitchAgendamientoUniverse({ enabled, rangeStart, rangeEnd, esSetter = false, userEmail = null }) {
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
        const lo = addDays(rangeStart, -1); lo.setHours(0, 0, 0, 0);
        const hi = addDays(rangeEnd, 2); hi.setHours(0, 0, 0, 0);

        const { data: prData, error: prErr } = await supabase
          .from('pitches_resultados')
          .select('id, card_id, cierre_pitch, fecha_pitch')
          .gte('fecha_pitch', isoDay(lo))
          .lt('fecha_pitch', isoDay(hi));
        if (prErr) throw prErr;
        if (cancelled) return;

        const pitches = prData || [];
        const cardIds = [...new Set(pitches.map(p => p.card_id))];
        const leadMap = {};
        if (cardIds.length > 0) {
          let leadsQuery = supabase
            .from('leads')
            .select('card_id, comercial_email, label, ocupacion, sexo, edad, ciudad, pais')
            .in('card_id', cardIds);
          if (esSetter && userEmail) leadsQuery = leadsQuery.eq('setter_email', userEmail);
          const { data: leadsData, error: leadsErr } = await leadsQuery;
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
            id: p.id,
            card_id: p.card_id,
            comercial_email: lead.comercial_email,
            label: lead.label,
            ocupacion: lead.ocupacion,
            sexo: lead.sexo,
            edad: lead.edad,
            ciudad: lead.ciudad,
            pais: lead.pais,
            cierre_pitch: p.cierre_pitch,
            parsed,
          });
        }
        setRows(built);
      } catch (e) {
        console.error('[Agendamiento] Error cargando universo:', e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rangeStart?.getTime(), rangeEnd?.getTime(), esSetter, userEmail]);

  return { rows, loading };
}
