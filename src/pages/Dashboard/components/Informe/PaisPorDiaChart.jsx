import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getCountryFlag } from '../../../../utils/countryFlags';
import {
  COLOR_LEADS_OVERLAY,
  COLOR_OTROS,
  LINE_COLORS,
  OVERLAY_LEADS_KEY,
  SIN_PAIS,
  TOP_N,
  buildPaisChartRows,
  buildPaisLineDefs,
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

const VISTAS = [
  { id: 'periodo', label: 'Periodo' },
  { id: 'meses', label: 'Todos los meses' },
];

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
  monthly = null,
  vista = 'periodo',
  onVistaChange,
  overlayByDayByPais = null,
  selectedPais = null,
  onPaisFocusChange,
  compareLabel = '',
}) {
  const serie = vista === 'meses' && monthly ? monthly : {
    days,
    totalsByPais,
    byDayByPais,
    total,
    baselineByPais,
    overlayByDayByPais,
    loading,
    subtitle,
    emptyLabel,
  };
  const ejeMensual = vista === 'meses' && Boolean(monthly);
  const serieLoading = serie.loading ?? loading;
  const overlay = serie.overlayByDayByPais ?? overlayByDayByPais;
  const compareMode = Boolean(selectedPais && overlay);
  const sePuedeFocar = typeof onPaisFocusChange === 'function';

  const ranked = useMemo(
    () => sortedPaises({
      totalsByPais: serie.totalsByPais,
      total: serie.total,
      baselineByPais: serie.baselineByPais ?? baselineByPais,
      pctMode,
    }).map((p) => ({
      ...p,
      bandera: p.pais === SIN_PAIS ? '🌎' : getCountryFlag(p.pais),
    })),
    [serie.totalsByPais, serie.total, serie.baselineByPais, baselineByPais, pctMode],
  );

  const topPaises = useMemo(() => ranked.slice(0, TOP_N), [ranked]);
  const otrosPaises = useMemo(() => ranked.slice(TOP_N), [ranked]);

  const colorByPais = useMemo(() => {
    const map = {};
    topPaises.forEach((p, i) => { map[p.pais] = LINE_COLORS[i]; });
    otrosPaises.forEach((p) => { map[p.pais] = COLOR_OTROS; });
    return map;
  }, [topPaises, otrosPaises]);

  const chartData = useMemo(() => buildPaisChartRows({
    days: serie.days,
    byDayByPais: serie.byDayByPais,
    overlayByDayByPais: overlay,
    selectedPais: compareMode ? selectedPais : null,
    topPaises,
    otrosPaises,
  }), [serie.days, serie.byDayByPais, overlay, compareMode, selectedPais, topPaises, otrosPaises]);

  const lineDefs = useMemo(() => buildPaisLineDefs({
    selectedPais: compareMode ? selectedPais : null,
    showLeadsOverlay: compareMode,
    topPaises,
    otrosPaises,
    colorByPais,
  }), [compareMode, selectedPais, topPaises, otrosPaises, colorByPais]);

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dayFull = payload[0]?.payload?.dayFull || label;
    const items = (compareMode ? payload : payload.filter((p) => p.value > 0))
      .slice()
      .sort((a, b) => b.value - a.value);
    if (!items.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[160px]">
        <div className="text-slate-500 mb-1.5">{ejeMensual ? dayFull : `Día ${dayFull}`}</div>
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
          <p className="text-xs text-slate-500 mt-0.5">{serie.subtitle || subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {monthly && VISTAS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onVistaChange?.(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                vista === tab.id
                  ? 'bg-[#1717AF] text-white shadow-sm shadow-[#1717AF]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {compareMode && sePuedeFocar && (
            <button
              type="button"
              onClick={() => onPaisFocusChange(null)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1717AF]/10 text-[#1717AF] hover:bg-[#1717AF]/15"
              title="Volver a todos los países"
            >
              {selectedPais} ×
            </button>
          )}
          {serieLoading && <span className="text-xs text-slate-400 animate-pulse">Cargando…</span>}
        </div>
      </div>

      {!(serie.total || compareMode) ? (
        <div className="py-16 text-center text-sm text-slate-400">
          {serie.emptyLabel || emptyLabel}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 w-full">
            {compareMode && (
              <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: lineDefs[0]?.color }} />
                  {compareLabel || selectedPais}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_LEADS_OVERLAY }} />
                  Leads
                </span>
              </div>
            )}
            <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: compareMode ? 36 : 8, left: 0, bottom: ejeMensual ? 18 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  tick={{ fontSize: ejeMensual ? 10 : 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={ejeMensual ? 0 : 'preserveStartEnd'}
                  minTickGap={ejeMensual ? 0 : 12}
                  angle={ejeMensual ? -40 : 0}
                  textAnchor={ejeMensual ? 'end' : 'middle'}
                  height={ejeMensual ? 52 : 30}
                  dy={ejeMensual ? 8 : 0}
                />
                {compareMode ? (
                  <>
                    <YAxis
                      yAxisId="metric"
                      stroke="#94A3B8"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <YAxis
                      yAxisId="leads"
                      orientation="right"
                      stroke={COLOR_LEADS_OVERLAY}
                      tick={{ fontSize: 11, fill: COLOR_LEADS_OVERLAY }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={36}
                    />
                  </>
                ) : (
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                )}
                <Tooltip content={renderTooltip} />
                {lineDefs.map((ln) => (
                  <Line
                    key={ln.key}
                    type="monotone"
                    dataKey={ln.key}
                    name={ln.key === OVERLAY_LEADS_KEY ? 'Leads' : ln.key}
                    yAxisId={compareMode ? ln.yAxisId : undefined}
                    stroke={ln.color}
                    strokeWidth={2}
                    strokeDasharray={ln.dashed ? '5 4' : undefined}
                    dot={ejeMensual ? { r: 3 } : false}
                    activeDot={{ r: 4 }}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 space-y-1">
            {ranked.map((p) => {
              const enfocado = selectedPais === p.pais;
              const claseFila = `w-full flex items-center gap-2 text-sm py-1 px-2 rounded-lg transition-colors text-left ${
                enfocado
                  ? 'bg-[#1717AF]/10 ring-1 ring-[#1717AF]/25'
                  : sePuedeFocar
                    ? 'hover:bg-slate-50 cursor-pointer'
                    : 'hover:bg-slate-50'
              }`;
              const contenido = (
                <>
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
                </>
              );
              if (!sePuedeFocar) {
                return (
                  <div key={p.pais} className={claseFila} title={p.pais}>
                    {contenido}
                  </div>
                );
              }
              return (
                <button
                  key={p.pais}
                  type="button"
                  onClick={() => onPaisFocusChange(enfocado ? null : p.pais)}
                  className={claseFila}
                  title={enfocado ? 'Volver a todos los países' : `Ver ${p.pais} junto a sus leads`}
                  aria-pressed={enfocado}
                >
                  {contenido}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ranked.length > 0 && serie.total > 0 && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          {compareMode ? (
            <p className="text-slate-600 leading-relaxed">
              La línea continua es {compareLabel || 'esta métrica'} de{' '}
              <span className="font-semibold text-slate-800">{selectedPais}</span>
              . La punteada es <span className="font-semibold text-slate-800">leads</span> del mismo país.
              {' '}Cada eje tiene su escala para que se vean las dos.
            </p>
          ) : pctMode === 'funnel' ? (
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
              de los leads {ejeMensual ? 'desde noviembre 2025' : 'del mes'} provienen de{' '}
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
