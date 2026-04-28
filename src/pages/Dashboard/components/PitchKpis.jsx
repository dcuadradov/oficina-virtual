import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { Loader2, Target, UserCheck } from 'lucide-react';
import { PITCH_STATES } from '../../../constants/pitchColors';

// Presets de selección rápida para el filtro de tags en Mis Pitch.
// Se renderizan como chips arriba del dropdown del filtro.
//   - "todos" = todos los tags disponibles (resuelto en runtime).
//   - "asignados" = tags de leads recién entregados al comercial.
//   - "gestionados" = tags de leads ya en gestión activa.
export const PITCH_TAG_PRESETS = [
  { id: 'todos', label: 'Todos', tags: 'all' },
  {
    id: 'asignados',
    label: 'Asignados',
    tags: [
      'Nuevo (OD)',
      'Nuevo META 1',
      'Nuevo WEB',
      'Revivió',
      'Revivió (Correos ST)',
      'Revivió (Correos)',
      'Revivió (META 1)',
    ],
  },
  {
    id: 'gestionados',
    label: 'Gestionados',
    tags: [
      'Cliente en frío',
      'Nuevo gestionado',
      'Nuevo manual',
      'Referido',
      'Reingresado',
    ],
  },
];

// Valores válidos en pitch_result que indican que el lead asistió al pitch.
const PITCH_RESULT_VALUES = [
  'Matrícula',
  'No matrícula',
  'Pago pendiente',
  'Posible matrícula',
  'Reprobado',
  'Interés futuro',
];

/**
 * Bloque de 10 KPIs (5x2) para "Mis Pitch":
 *   1. Efectividad comercial = pitches del periodo / leads creados con tag válido
 *   2. Asistencia            = asistieron / T2 (T2 = asistieron + no-show)
 *   3-8. % por pitch_result  = cada categoría / # asistieron  (suman 100%)
 *   9-10. % Reprogramado/Sin reprogramar = cada uno / # no-show (suman 100%)
 */
export default function PitchKpis({
  rangeStart,
  rangeEnd,
  selectedComercial,
  userEmail,
  puedeVerTodos = false,
  selectedTags = [],
}) {
  const [pitches, setPitches] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Carga datos en paralelo: pitches del periodo y count de leads válidos.
  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd); end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1); // upper bound exclusivo (local)

        // Mismo formato que parseDateFilters de Dashboard: 05:00:00+00 (Colombia UTC-5)
        const fmtUtc = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day} 05:00:00+00`;
        };
        const fechaInicio = fmtUtc(start);
        const fechaFin = fmtUtc(end);

        // 1) Pitches en el periodo (vista vw_pitches_calendario)
        let pq = supabase.from('vw_pitches_calendario').select('*');
        if (selectedComercial) pq = pq.eq('comercial_email', selectedComercial);
        else if (!puedeVerTodos && userEmail) pq = pq.eq('comercial_email', userEmail);

        // 2) Leads creados en el periodo con label en selectedTags (si aplica).
        // Si selectedTags está vacío, no se restringe por label (= todos).
        let lq = supabase
          .from('leads')
          .select('card_id', { count: 'exact', head: true })
          .gte('created_at', fechaInicio)
          .lt('created_at', fechaFin);
        if (selectedTags.length > 0) lq = lq.in('label', selectedTags);
        if (selectedComercial) lq = lq.eq('comercial_email', selectedComercial);
        else if (!puedeVerTodos && userEmail) lq = lq.eq('comercial_email', userEmail);

        const [pRes, lRes] = await Promise.all([pq, lq]);
        if (cancelled) return;
        if (pRes.error) throw pRes.error;
        if (lRes.error) throw lRes.error;

        // Filtrar pitches por:
        // - rango de fecha (mismo criterio sin TZ que el calendario)
        // - label (tag) IN selectedTags si hay selección; vacío = sin filtro.
        const filtered = (pRes.data || []).filter(p => {
          if (!p.fecha_pitch_calendario) return false;
          const m = p.fecha_pitch_calendario.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (!m) return false;
          const [, y, mo, d] = m;
          const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
          if (dt < start || dt >= end) return false;
          if (selectedTags.length > 0 && !selectedTags.includes(p.label)) return false;
          return true;
        });

        setPitches(filtered);
        setLeadsCount(lRes.count || 0);
      } catch (err) {
        console.error('Error cargando KPIs de Pitch:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rangeStart?.getTime(),
    rangeEnd?.getTime(),
    selectedComercial,
    userEmail,
    puedeVerTodos,
    selectedTags.join('|'),
  ]);

  // T = todos los pitches en el periodo (numerador de Efectividad)
  const T = pitches.length;

  // T2 = universo con resultado definitivo (asistido O no-show declarado)
  const T2pitches = useMemo(() => {
    return pitches.filter(p => {
      const hasResult = p.resultado_pitch_result && PITCH_RESULT_VALUES.includes(p.resultado_pitch_result);
      const noShow = p.resultado_attended === 'No';
      return hasResult || noShow;
    });
  }, [pitches]);
  const T2 = T2pitches.length;

  // Conteos por categoría:
  //   - asistieron / no_show: subuniversos que componen T2
  //   - matricula..interes_futuro: sobre los que asistieron
  //   - reprogramado / sin_reprogramar: sobre los que NO asistieron
  const counts = useMemo(() => {
    const c = {
      asistieron: 0,
      no_show: 0,
      matricula: 0,
      no_matricula: 0,
      pago_pendiente: 0,
      posible_matricula: 0,
      reprobado: 0,
      interes_futuro: 0,
      reprogramado: 0,
      sin_reprogramar: 0,
    };
    for (const p of T2pitches) {
      if (p.resultado_attended === 'No') {
        c.no_show++;
        if (p.resultado_rescheduled === 'Si') c.reprogramado++;
        else c.sin_reprogramar++;
      } else if (p.resultado_pitch_result) {
        c.asistieron++;
        const r = p.resultado_pitch_result;
        if (r === 'Matrícula') c.matricula++;
        else if (r === 'No matrícula') c.no_matricula++;
        else if (r === 'Pago pendiente') c.pago_pendiente++;
        else if (r === 'Posible matrícula') c.posible_matricula++;
        else if (r === 'Reprobado') c.reprobado++;
        else if (r === 'Interés futuro') c.interes_futuro++;
      }
    }
    return c;
  }, [T2pitches]);

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

  // Mapa de PITCH_STATES por id (para reutilizar colores/labels del calendario)
  const stateById = useMemo(() => {
    const m = {};
    PITCH_STATES.forEach(s => { m[s.id] = s; });
    return m;
  }, []);

  const cards = [
    {
      id: 'efectividad',
      title: 'Efectividad comercial',
      value: pct(T, leadsCount),
      sub: `${T} pitches / ${leadsCount} leads`,
      icon: Target,
      tone: 'primary',
    },
    {
      id: 'asistencia',
      title: 'Asistencia',
      value: pct(counts.asistieron, T2),
      sub: `${counts.asistieron} / ${T2}`,
      icon: UserCheck,
      tone: 'primary',
    },
    {
      id: 'matricula',
      title: 'Matrícula',
      value: pct(counts.matricula, counts.asistieron),
      sub: `${counts.matricula} / ${counts.asistieron} asist.`,
      state: stateById.matricula,
    },
    {
      id: 'no_matricula',
      title: 'No matrícula',
      value: pct(counts.no_matricula, counts.asistieron),
      sub: `${counts.no_matricula} / ${counts.asistieron} asist.`,
      state: stateById.no_matricula,
    },
    {
      id: 'pago_pendiente',
      title: 'Pago pendiente',
      value: pct(counts.pago_pendiente, counts.asistieron),
      sub: `${counts.pago_pendiente} / ${counts.asistieron} asist.`,
      state: stateById.pago_pendiente,
    },
    {
      id: 'posible_matricula',
      title: 'Posible matrícula',
      value: pct(counts.posible_matricula, counts.asistieron),
      sub: `${counts.posible_matricula} / ${counts.asistieron} asist.`,
      state: stateById.posible_matricula,
    },
    {
      id: 'reprobado',
      title: 'Reprobado',
      value: pct(counts.reprobado, counts.asistieron),
      sub: `${counts.reprobado} / ${counts.asistieron} asist.`,
      state: stateById.reprobado,
    },
    {
      id: 'interes_futuro',
      title: 'Interés futuro',
      value: pct(counts.interes_futuro, counts.asistieron),
      sub: `${counts.interes_futuro} / ${counts.asistieron} asist.`,
      state: stateById.interes_futuro,
    },
    {
      id: 'reprogramado',
      title: 'Reprogramado',
      value: pct(counts.reprogramado, counts.no_show),
      sub: `${counts.reprogramado} / ${counts.no_show} no asist.`,
      state: stateById.reprogramado,
    },
    {
      id: 'sin_reprogramar',
      title: 'Sin reprogramar',
      value: pct(counts.sin_reprogramar, counts.no_show),
      sub: `${counts.sin_reprogramar} / ${counts.no_show} no asist.`,
      state: stateById.sin_reprogramar,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <KpiCard key={c.id} card={c} loading={loading} highlight={i < 2} />
      ))}
    </div>
  );
}

function KpiCard({ card, loading, highlight }) {
  const hasState = !!card.state;
  const Icon = card.icon;
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md ${
        highlight ? 'border-[#1717AF]/20 ring-1 ring-[#1717AF]/10' : 'border-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 min-h-[20px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
          {card.title}
        </span>
        {hasState && (
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${card.state.chip}`} />
        )}
        {!hasState && Icon && (
          <Icon size={14} className="text-[#1717AF]/70 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        {loading ? (
          <Loader2 size={20} className="text-slate-300 animate-spin" />
        ) : (
          <>
            <span className={`text-2xl font-bold ${highlight ? 'text-[#1717AF]' : 'text-slate-800'}`}>
              {card.value}
            </span>
            <span className="text-sm font-medium text-slate-500">%</span>
          </>
        )}
      </div>
      <div className="text-[11px] text-slate-400 mt-1 truncate">
        {loading ? '\u00a0' : card.sub}
      </div>
    </div>
  );
}
