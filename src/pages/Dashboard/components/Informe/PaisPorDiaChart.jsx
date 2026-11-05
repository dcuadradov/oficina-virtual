import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getCountryFlag } from '../../../../utils/countryFlags';
import {
  COLOR_OTROS,
  LINE_COLORS,
  SIN_PAIS,
  TOP_N,
  sortedPaises,
} from './paisPorDia';

function formatPct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

function formatPctConBase(pct, baselineCount) {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}% (${(baselineCount || 0).toLocaleString('es-CO')})`;
}

export default function PaisPorDiaChart({
  title,
  subtitle,
  emptyLabel,
  loading = false,
  days = [],
  totalsByPais = {},
  byDayByPais = {},
  total = 0,
  pctMode = 'share',
  baselineByPais = null,
  previousLabel = '',
}) {
  const ranked = useMemo(
    () => sortedPaises({ totalsByPais, total, baselineByPais, pctMode })
      .map((p) => ({
        ...p,
        bandera: p.pais === SIN_PAIS ? '🌎' : getCountryFlag(p.pais),
      })),
    [totalsByPais, total, baselineByPais, pctMode],
  );

  const topPaises = useMemo(() => ranked.slice(0, TOP_N), [ranked]);
  const otrosPaises = useMemo(() => ranked.slice(TOP_N), [ranked]);

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
        row.Otros = otrosPaises.reduce((acc, p) => acc + (byPais[p.pais] || 0), 0);
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
      .filter((p) => p.value > 0)
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

  const top3Share = ranked.slice(0, 3).reduce((a, p) => a + p.sharePct, 0);
  const top3Count = Math.min(3, ranked.length);
  const topVolume = ranked[0];

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
            {ranked.map((p) => (
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
                <span className="text-slate-800 font-semibold text-xs tabular-nums whitespace-nowrap text-right">
                  {pctMode === 'funnel' ? formatPctConBase(p.pct, p.baselineCount) : formatPct(p.pct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ranked.length > 0 && total > 0 && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          {pctMode === 'funnel' ? (
            <p className="text-slate-600 leading-relaxed">
              El % de cada país es sobre <span className="font-semibold text-slate-800">{previousLabel}</span>
              {topVolume ? (
                <>
                  . El de mayor volumen es {topVolume.bandera}{' '}
                  <span className="font-semibold text-slate-800">{topVolume.pais}</span>
                  {' '}({topVolume.count.toLocaleString('es-CO')}
                  {topVolume.pct != null ? `, ${topVolume.pct.toFixed(0)}%` : ''}).
                </>
              ) : '.'}
            </p>
          ) : (
            <p className="text-slate-600 leading-relaxed">
              El <span className="font-semibold text-slate-800">{top3Share.toFixed(0)}%</span>{' '}
              de los leads del mes provienen de{' '}
              <span className="font-semibold text-slate-800">{top3Count}</span>{' '}
              {top3Count === 1 ? 'país' : 'países'}:{' '}
              {ranked.slice(0, 3).map((p, i) => (
                <span key={p.pais}>
                  {i > 0 ? ', ' : ''}
                  <span>{p.bandera}</span> {p.pais}
                </span>
              ))}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
