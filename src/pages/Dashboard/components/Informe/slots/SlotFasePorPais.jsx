import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../../../../supabaseClient';
import { getCountryFlag } from '../../../../../utils/countryFlags';

const LINE_COLORS = ['#1717AF', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];
const COLOR_OTROS = '#94A3B8';
const SIN_PAIS = 'Sin país';
const TOP_N = 5;
const PAGE_SIZE = 1000;
const LEAD_IN_CHUNK = 200;

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

/**
 * Leads que entraron a una fase (historial.nombre_fase) en el mes,
 * únicos por lead_id, país desde leads.card_id.
 */
export default function SlotFasePorPais({
  selectedMes,
  monthConfigs,
  nombreFase,
  title,
  subtitle,
  emptyLabel,
}) {
  const [rows, setRows] = useState([]); // [{ pais, created_at }]
  const [loading, setLoading] = useState(false);

  const rango = useMemo(
    () => (selectedMes ? buildRango(monthConfigs, selectedMes) : null),
    [monthConfigs, selectedMes],
  );

  useEffect(() => {
    if (!rango || !nombreFase) return;
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      try {
        const histAcc = [];
        let from = 0;
        let keep = true;
        while (keep && !cancelled) {
          const { data, error } = await supabase
            .from('historial')
            .select('lead_id, created_at')
            .eq('modulo', 'comercial')
            .eq('nombre_fase', nombreFase)
            .gte('created_at', rango.fechaInicio)
            .lte('created_at', rango.fechaFin)
            .order('created_at', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          histAcc.push(...(data || []));
          if (!data || data.length < PAGE_SIZE) keep = false;
          from += PAGE_SIZE;
        }
        if (cancelled) return;

        // Un lead puede entrar varias veces a la misma fase: nos quedamos con la primera del mes.
        const firstByLead = new Map();
        histAcc.forEach(({ lead_id, created_at }) => {
          if (!lead_id) return;
          if (!firstByLead.has(lead_id)) firstByLead.set(lead_id, created_at);
        });

        const leadIds = [...firstByLead.keys()];
        const paisByCard = {};
        for (let i = 0; i < leadIds.length && !cancelled; i += LEAD_IN_CHUNK) {
          const chunk = leadIds.slice(i, i + LEAD_IN_CHUNK);
          const { data, error } = await supabase
            .from('leads')
            .select('card_id, pais')
            .in('card_id', chunk);
          if (error) throw error;
          (data || []).forEach((l) => {
            paisByCard[l.card_id] = l.pais;
          });
        }
        if (cancelled) return;

        const nextRows = leadIds.map((leadId) => ({
          pais: paisByCard[leadId],
          created_at: firstByLead.get(leadId),
        }));
        setRows(nextRows);
      } catch (err) {
        console.error(`[SlotFasePorPais ${nombreFase}] error:`, err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    cargar();
    return () => { cancelled = true; };
  }, [rango, nombreFase]);

  const days = useMemo(
    () => (rango ? buildDayList(rango.startDateLocal, rango.endDateLocal) : []),
    [rango],
  );

  const { totalsByPais, byDayByPais, total } = useMemo(() => {
    const totalsByPais = {};
    const byDayByPais = {};
    let total = 0;
    rows.forEach(({ pais, created_at }) => {
      const key = (pais == null || String(pais).trim() === '') ? SIN_PAIS : String(pais).trim();
      totalsByPais[key] = (totalsByPais[key] || 0) + 1;
      total++;
      const dKey = dateKeyUtcMinus5(created_at);
      if (!dKey) return;
      if (!byDayByPais[dKey]) byDayByPais[dKey] = {};
      byDayByPais[dKey][key] = (byDayByPais[dKey][key] || 0) + 1;
    });
    return { totalsByPais, byDayByPais, total };
  }, [rows]);

  const sortedPaises = useMemo(() => {
    return Object.entries(totalsByPais)
      .map(([pais, count]) => ({
        pais,
        count,
        pct: total ? (count / total) * 100 : 0,
        bandera: pais === SIN_PAIS ? '🌎' : getCountryFlag(pais),
      }))
      .sort((a, b) => b.count - a.count);
  }, [totalsByPais, total]);

  const topPaises = useMemo(() => sortedPaises.slice(0, TOP_N), [sortedPaises]);
  const otrosPaises = useMemo(() => sortedPaises.slice(TOP_N), [sortedPaises]);

  const colorByPais = useMemo(() => {
    const map = {};
    topPaises.forEach((p, i) => { map[p.pais] = LINE_COLORS[i]; });
    otrosPaises.forEach((p) => { map[p.pais] = COLOR_OTROS; });
    return map;
  }, [topPaises, otrosPaises]);

  const chartData = useMemo(() => {
    return days.map(({ dateKey, dayLabel, dayFull }) => {
      const row = { day: dayLabel, dateKey, dayFull };
      const byPais = byDayByPais[dateKey] || {};
      topPaises.forEach((p) => { row[p.pais] = byPais[p.pais] || 0; });
      if (otrosPaises.length) {
        row['Otros'] = otrosPaises.reduce((acc, p) => acc + (byPais[p.pais] || 0), 0);
      }
      return row;
    });
  }, [days, byDayByPais, topPaises, otrosPaises]);

  const lineDefs = useMemo(() => {
    const out = topPaises.map((p, i) => ({ key: p.pais, color: LINE_COLORS[i] }));
    if (otrosPaises.length) out.push({ key: 'Otros', color: COLOR_OTROS });
    return out;
  }, [topPaises, otrosPaises]);

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dayFull = payload[0]?.payload?.dayFull || label;
    const items = payload
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);
    if (!items.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[160px]">
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

  const top3Pct = sortedPaises.slice(0, 3).reduce((a, p) => a + p.pct, 0);
  const top3Count = Math.min(3, sortedPaises.length);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse">Cargando…</span>}
      </div>

      {!total ? (
        <div className="py-16 text-center text-sm text-slate-400">
          {emptyLabel}
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
            {sortedPaises.map((p) => (
              <div
                key={p.pais}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                title={p.pais}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorByPais[p.pais] || COLOR_OTROS }}
                />
                <span className="text-base leading-none flex-shrink-0">{p.bandera}</span>
                <span
                  className={`flex-1 truncate text-xs ${p.pais === SIN_PAIS ? 'italic text-slate-500' : 'text-slate-700'}`}
                >
                  {p.pais}
                </span>
                <span className="text-slate-500 text-xs tabular-nums">
                  {p.count.toLocaleString('es-CO')}
                </span>
                <span className="text-slate-800 font-semibold text-xs tabular-nums w-11 text-right">
                  {p.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedPaises.length > 0 && total > 0 && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          <p className="text-slate-600 leading-relaxed">
            El <span className="font-semibold text-slate-800">{top3Pct.toFixed(0)}%</span>{' '}
            de los leads que entraron a {nombreFase} en el mes provienen de{' '}
            <span className="font-semibold text-slate-800">{top3Count}</span>{' '}
            {top3Count === 1 ? 'país' : 'países'}:{' '}
            {sortedPaises.slice(0, 3).map((p, i) => (
              <span key={p.pais}>
                {i > 0 ? ', ' : ''}
                <span>{p.bandera}</span> {p.pais}
              </span>
            ))}.
          </p>
        </div>
      )}
    </div>
  );
}
