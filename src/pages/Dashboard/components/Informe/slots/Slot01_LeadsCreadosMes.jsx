import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { supabase } from '../../../../../supabaseClient';
import { LEADS_HISTORICOS, MESES_CORTOS, MESES_LARGOS } from '../data/leadsHistoricos';

const COLORS = {
  2024: '#cbd5e1', // slate-300 — referencia más vieja
  2025: '#6366f1', // indigo-500 — año previo
  2026: '#1717AF', // azul de marca — año actual
};

// Construye el rango fechaInicio/fechaFin (UTC-5) para un mes (formato 'YYYY-MM').
// - Si hay config_meses: usa el rango particular (martes a martes).
// - Si no hay config: usa el rango calendario tradicional (día 1 al 1 del mes siguiente).
// Misma lógica que parseDateFilters de Dashboard.jsx para garantizar conteos idénticos.
function buildRango(monthConfigs, mesKey) {
  const config = monthConfigs?.[mesKey];

  if (config?.fecha_inicio) {
    const fechaInicio = `${config.fecha_inicio} 05:00:00+00`;
    let fechaFin;
    if (config.fecha_fin) {
      const [yF, mF, dF] = config.fecha_fin.split('-').map(Number);
      const finMasUno = new Date(yF, mF - 1, dF + 1);
      const fechaFinMasUno = `${finMasUno.getFullYear()}-${String(finMasUno.getMonth() + 1).padStart(2, '0')}-${String(finMasUno.getDate()).padStart(2, '0')}`;
      fechaFin = `${fechaFinMasUno} 05:00:00+00`;
    } else {
      const now = new Date();
      const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const fechaManana = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
      fechaFin = `${fechaManana} 05:00:00+00`;
    }
    return { fechaInicio, fechaFin };
  }

  // Fallback: rango calendario tradicional (mismo bloque que Dashboard.jsx para meses sin config).
  const [year, month] = mesKey.split('-').map(Number);
  const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01 05:00:00+00`;
  const mesSiguiente = new Date(year, month, 1);
  const fechaFin = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01 05:00:00+00`;
  return { fechaInicio, fechaFin };
}

export default function Slot01_LeadsCreadosMes({ selectedMes, monthConfigs }) {
  const [leads2026Dynamic, setLeads2026Dynamic] = useState({}); // { '03': 1200, '04': 980, ... }
  const [loading, setLoading] = useState(false);

  // Mes seleccionado (formato '2026-MM')
  const selectedMonthIdx = useMemo(() => {
    if (!selectedMes) return null;
    const [, mm] = selectedMes.split('-');
    return parseInt(mm, 10) - 1; // 0-based
  }, [selectedMes]);

  // Determina hasta qué mes de 2026 mostrar la línea: el mes seleccionado.
  // Si no hay mes seleccionado, hasta el último mes con datos (hardcoded + dynamic).
  const lastMonth2026 = useMemo(() => {
    if (selectedMonthIdx !== null) return selectedMonthIdx;
    const hardcoded = Object.keys(LEADS_HISTORICOS[2026] || {}).map(k => parseInt(k, 10) - 1);
    const dynamic = Object.keys(leads2026Dynamic).map(k => parseInt(k, 10) - 1);
    const all = [...hardcoded, ...dynamic];
    return all.length ? Math.max(...all) : 1; // default Feb (0-based)
  }, [selectedMonthIdx, leads2026Dynamic]);

  // Cargar de Supabase los meses 2026 que NO estén hardcoded, desde Marzo hasta el mes actual.
  // Usa el rango de config_meses si existe, sino el rango calendario tradicional.
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      const hardcoded2026 = LEADS_HISTORICOS[2026] || {};
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const lastMonthToFetch = currentYear === 2026 ? currentMonth : 12;

      const mesesAConsultar = [];
      for (let m = 3; m <= lastMonthToFetch; m++) {
        const mm = String(m).padStart(2, '0');
        if (hardcoded2026[mm] !== undefined) continue;
        mesesAConsultar.push(`2026-${mm}`);
      }
      if (!mesesAConsultar.length) return;

      setLoading(true);
      try {
        const result = {};
        await Promise.all(mesesAConsultar.map(async (mesKey) => {
          const rango = buildRango(monthConfigs, mesKey);
          const { count, error } = await supabase
            .from('leads')
            .select('card_id', { count: 'exact', head: true })
            .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null')
            .gte('created_at', rango.fechaInicio)
            .lte('created_at', rango.fechaFin);
          if (!error) {
            const [, mm] = mesKey.split('-');
            result[mm] = count || 0;
          }
        }));
        if (!cancelled) setLeads2026Dynamic(prev => ({ ...prev, ...result }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [monthConfigs]);

  // Construye la data para Recharts: 12 puntos (Ene..Dic), cada uno con valores 2024/2025/2026.
  const chartData = useMemo(() => {
    const merged2026 = { ...LEADS_HISTORICOS[2026], ...leads2026Dynamic };
    return MESES_CORTOS.map((label, idx) => {
      const mm = String(idx + 1).padStart(2, '0');
      const v2024 = LEADS_HISTORICOS[2024]?.[mm] ?? null;
      const v2025 = LEADS_HISTORICOS[2025]?.[mm] ?? null;
      let v2026 = merged2026[mm] ?? null;
      // Cortar la línea de 2026 hasta el mes seleccionado (inclusive).
      if (idx > lastMonth2026) v2026 = null;
      return { mes: label, '2024': v2024, '2025': v2025, '2026': v2026 };
    });
  }, [leads2026Dynamic, lastMonth2026]);

  // Cálculo del comparativo: mes seleccionado 2026 vs mismo mes 2025.
  const comparativo = useMemo(() => {
    if (selectedMonthIdx === null) return null;
    const mm = String(selectedMonthIdx + 1).padStart(2, '0');
    const merged2026 = { ...LEADS_HISTORICOS[2026], ...leads2026Dynamic };
    const v2026 = merged2026[mm];
    const v2025 = LEADS_HISTORICOS[2025]?.[mm];
    if (v2026 == null || v2025 == null || v2025 === 0) return { mes: MESES_LARGOS[selectedMonthIdx], v2026, v2025, pct: null };
    const diff = v2026 - v2025;
    const pct = (diff / v2025) * 100;
    return { mes: MESES_LARGOS[selectedMonthIdx], v2026, v2025, pct };
  }, [selectedMonthIdx, leads2026Dynamic]);

  // Formato del eje Y: 1.2k, 2.5k...
  const formatY = (v) => {
    if (v == null) return '';
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return String(v);
  };

  // Tooltip custom
  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.dataKey}:</span>
            <span className="font-semibold text-slate-800 ml-auto">{p.value?.toLocaleString('es-CO') ?? '—'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Leads creados en el mes</h3>
          <p className="text-xs text-slate-500 mt-0.5">Comparativo histórico 2024 · 2025 · 2026</p>
        </div>
        {loading && (
          <span className="text-xs text-slate-400 animate-pulse">Cargando…</span>
        )}
      </div>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={formatY}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }} />
            <Legend
              verticalAlign="top"
              align="right"
              height={28}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: '#475569' }}
            />
            <Line
              type="monotone"
              dataKey="2024"
              stroke={COLORS[2024]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: COLORS[2024] }}
              activeDot={{ r: 5 }}
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-out"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="2025"
              stroke={COLORS[2025]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: COLORS[2025] }}
              activeDot={{ r: 5 }}
              isAnimationActive
              animationDuration={1700}
              animationBegin={150}
              animationEasing="ease-out"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="2026"
              stroke={COLORS[2026]}
              strokeWidth={2.6}
              dot={{ r: 4, strokeWidth: 0, fill: COLORS[2026] }}
              activeDot={{ r: 6 }}
              isAnimationActive
              animationDuration={2000}
              animationBegin={300}
              animationEasing="ease-out"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Texto comparativo */}
      {comparativo && comparativo.pct !== null && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          {comparativo.pct > 0 ? (
            <TrendingUp size={16} className="text-emerald-600" />
          ) : comparativo.pct < 0 ? (
            <TrendingDown size={16} className="text-rose-600" />
          ) : (
            <Minus size={16} className="text-slate-400" />
          )}
          <span>
            Con respecto a <span className="font-semibold text-slate-800">{comparativo.mes}</span> del año pasado, tuvimos{' '}
            <span className={`font-semibold ${comparativo.pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {Math.abs(comparativo.pct).toFixed(1)}% {comparativo.pct >= 0 ? 'más' : 'menos'} leads
            </span>
            {' '}({comparativo.v2026?.toLocaleString('es-CO')} vs {comparativo.v2025?.toLocaleString('es-CO')}).
          </span>
        </div>
      )}
    </div>
  );
}
