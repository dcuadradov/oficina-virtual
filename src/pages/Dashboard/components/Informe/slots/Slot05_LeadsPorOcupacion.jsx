import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Briefcase } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../../../../supabaseClient';

const LINE_COLORS = ['#1717AF', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];
const COLOR_OTROS = '#94A3B8';
const SIN_OCUPACION = 'Sin ocupación';
const TOP_N = 5;

function buildRango(monthConfigs, mesKey) {
  const config = monthConfigs?.[mesKey];
  if (config?.fecha_inicio) {
    const fechaInicio = `${config.fecha_inicio} 05:00:00+00`;
    let fechaFin;
    let endDateLocal;
    if (config.fecha_fin) {
      const [yF, mF, dF] = config.fecha_fin.split('-').map(Number);
      const finMasUno = new Date(Date.UTC(yF, mF - 1, dF + 1));
      fechaFin = `${finMasUno.getUTCFullYear()}-${String(finMasUno.getUTCMonth() + 1).padStart(2, '0')}-${String(finMasUno.getUTCDate()).padStart(2, '0')} 05:00:00+00`;
      endDateLocal = config.fecha_fin;
    } else {
      const now = new Date();
      const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      fechaFin = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')} 05:00:00+00`;
      const today = new Date();
      endDateLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return { fechaInicio, fechaFin, startDateLocal: config.fecha_inicio, endDateLocal };
  }
  const [year, month] = mesKey.split('-').map(Number);
  const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01 05:00:00+00`;
  const lastDay = new Date(year, month, 0).getDate();
  const mesSiguiente = new Date(year, month, 1);
  const fechaFin = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01 05:00:00+00`;
  const startDateLocal = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateLocal = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { fechaInicio, fechaFin, startDateLocal, endDateLocal };
}

function buildDayList(startDateLocal, endDateLocal) {
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

function dateKeyUtcMinus5(tsString) {
  if (!tsString) return null;
  const d = new Date(tsString);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Capitaliza la primera letra de cada palabra (para presentar las ocupaciones bonito).
function tituloCase(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map(w => w && w[0] ? w[0].toUpperCase() + w.slice(1) : w)
    .join('');
}

export default function Slot05_LeadsPorOcupacion({ selectedMes, monthConfigs }) {
  const [leadsRows, setLeadsRows] = useState([]); // [{ ocupacion, created_at }]
  const [loading, setLoading] = useState(false);

  const rango = useMemo(
    () => (selectedMes ? buildRango(monthConfigs, selectedMes) : null),
    [monthConfigs, selectedMes],
  );

  useEffect(() => {
    if (!rango) return;
    let cancelled = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const PAGE_SIZE = 1000;
        const acc = [];
        let from = 0;
        let keep = true;
        while (keep && !cancelled) {
          const { data, error } = await supabase
            .from('leads')
            .select('ocupacion, created_at')
            .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null')
            .gte('created_at', rango.fechaInicio)
            .lte('created_at', rango.fechaFin)
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          acc.push(...(data || []));
          if (!data || data.length < PAGE_SIZE) keep = false;
          from += PAGE_SIZE;
        }
        if (!cancelled) setLeadsRows(acc);
      } catch (err) {
        console.error('[Slot05] error cargando leads:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [rango]);

  const days = useMemo(
    () => (rango ? buildDayList(rango.startDateLocal, rango.endDateLocal) : []),
    [rango],
  );

  // Normaliza la ocupación: trim, lowercase para deduplicar, presenta en Title Case.
  const { totalsByOcup, byDayByOcup, total } = useMemo(() => {
    const totalsByOcup = {};
    const byDayByOcup = {};
    let total = 0;
    leadsRows.forEach(({ ocupacion, created_at }) => {
      const raw = ocupacion == null ? '' : String(ocupacion).trim();
      const key = raw === '' ? SIN_OCUPACION : tituloCase(raw);
      totalsByOcup[key] = (totalsByOcup[key] || 0) + 1;
      total++;
      const dKey = dateKeyUtcMinus5(created_at);
      if (!dKey) return;
      if (!byDayByOcup[dKey]) byDayByOcup[dKey] = {};
      byDayByOcup[dKey][key] = (byDayByOcup[dKey][key] || 0) + 1;
    });
    return { totalsByOcup, byDayByOcup, total };
  }, [leadsRows]);

  const sortedOcup = useMemo(() => {
    return Object.entries(totalsByOcup)
      .map(([ocup, count]) => ({
        ocup,
        count,
        pct: total ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [totalsByOcup, total]);

  const topOcup = useMemo(() => sortedOcup.slice(0, TOP_N), [sortedOcup]);
  const otrosOcup = useMemo(() => sortedOcup.slice(TOP_N), [sortedOcup]);

  const colorByOcup = useMemo(() => {
    const map = {};
    topOcup.forEach((o, i) => { map[o.ocup] = LINE_COLORS[i]; });
    otrosOcup.forEach((o) => { map[o.ocup] = COLOR_OTROS; });
    return map;
  }, [topOcup, otrosOcup]);

  const chartData = useMemo(() => {
    return days.map(({ dateKey, dayLabel, dayFull }) => {
      const row = { day: dayLabel, dateKey, dayFull };
      const byOcup = byDayByOcup[dateKey] || {};
      topOcup.forEach((o) => { row[o.ocup] = byOcup[o.ocup] || 0; });
      if (otrosOcup.length) {
        row['Otros'] = otrosOcup.reduce((acc, o) => acc + (byOcup[o.ocup] || 0), 0);
      }
      return row;
    });
  }, [days, byDayByOcup, topOcup, otrosOcup]);

  const lineDefs = useMemo(() => {
    const out = topOcup.map((o, i) => ({ key: o.ocup, color: LINE_COLORS[i] }));
    if (otrosOcup.length) out.push({ key: 'Otros', color: COLOR_OTROS });
    return out;
  }, [topOcup, otrosOcup]);

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dayFull = payload[0]?.payload?.dayFull || label;
    const items = payload
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);
    if (!items.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[200px] max-w-[280px]">
        <div className="text-slate-500 mb-1.5">Día {dayFull}</div>
        {items.map((it) => (
          <div key={it.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: it.color }} />
            <span className="text-slate-700 flex-1 truncate">{it.dataKey}</span>
            <span className="font-semibold text-slate-800 tabular-nums">{it.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Leads por ocupación</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Comportamiento día a día durante el mes seleccionado.
          </p>
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse">Cargando…</span>}
      </div>

      {!total ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Sin leads en el mes seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip content={renderTooltip} />
                {lineDefs.map((ln) => (
                  <Line
                    key={ln.key}
                    type="monotone"
                    dataKey={ln.key}
                    stroke={ln.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 space-y-1">
            {sortedOcup.map((o) => (
              <div
                key={o.ocup}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                title={o.ocup}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorByOcup[o.ocup] || COLOR_OTROS }}
                />
                <Briefcase size={12} className="text-slate-400 flex-shrink-0" />
                <span
                  className={`flex-1 truncate text-xs ${o.ocup === SIN_OCUPACION ? 'italic text-slate-500' : 'text-slate-700'}`}
                >
                  {o.ocup}
                </span>
                <span className="text-slate-500 text-xs tabular-nums">
                  {o.count.toLocaleString('es-CO')}
                </span>
                <span className="text-slate-800 font-semibold text-xs tabular-nums w-11 text-right">
                  {o.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedOcup.length > 0 && total > 0 && (() => {
        // El análisis ignora "Sin ocupación" (no es una ocupación real).
        const reales = sortedOcup.filter(o => o.ocup !== SIN_OCUPACION);
        const top = reales.slice(0, 3);
        if (!top.length) return null;
        const acumulado = top.reduce((acc, o) => acc + o.pct, 0);
        return (
          <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
            <p className="text-slate-600 leading-relaxed">
              El <span className="font-semibold text-slate-800">{acumulado.toFixed(0)}%</span>{' '}
              de los leads del mes corresponden a{' '}
              <span className="font-semibold text-slate-800">{top.length}</span>{' '}
              {top.length === 1 ? 'ocupación' : 'ocupaciones'}:{' '}
              <span className="text-slate-700">{top.map(t => t.ocup).join(', ')}</span>.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
