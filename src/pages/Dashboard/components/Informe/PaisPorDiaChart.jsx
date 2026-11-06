import { useMemo } from 'react';
import { Check, Sparkles } from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getCountryFlag } from '../../../../utils/countryFlags';
import {
  COLOR_LEADS_BAR,
  COLOR_LEADS_OVERLAY,
  COLOR_OTROS,
  COMPARE_METRIC_KEY,
  COMPARE_PCT_KEY,
  LINE_COLORS,
  OVERLAY_LEADS_KEY,
  SIN_PAIS,
  TOP_N,
  buildPaisChartRows,
  buildPaisCompareMonthRows,
  buildPaisLineDefs,
  etiquetaPaises,
  paisesEnFoco,
  sortedPaises,
  togglePaisSeleccionado,
} from './paisPorDia';

function formatPct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

function formatPctConBase(pct, baselineCount) {
  if (pct == null || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}% (${(baselineCount || 0).toLocaleString('es-CO')})`;
}

function CheckBox({ checked, indeterminate = false }) {
  return (
    <span
      className={`flex items-center justify-center w-3.5 h-3.5 rounded border flex-shrink-0 ${
        checked || indeterminate
          ? 'bg-[#1717AF] border-[#1717AF] text-white'
          : 'bg-white border-slate-300'
      }`}
    >
      {checked && <Check size={10} strokeWidth={3} />}
      {!checked && indeterminate && <span className="block w-2 h-0.5 bg-white rounded-full" />}
    </span>
  );
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
  selectedPaises = null,
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
  const foco = paisesEnFoco({ selectedPaises, selectedPais });
  const etiquetaFoco = etiquetaPaises(foco);
  const compareMode = foco.length > 0;
  const mostrarLeads = Boolean(compareMode && overlay);
  const tasaVsVolumen = mostrarLeads && ejeMensual;
  const sePuedeFocar = typeof onPaisFocusChange === 'function';
  const metricLabel = compareLabel || etiquetaFoco || 'Métrica';

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
  const idsLista = useMemo(() => ranked.map((p) => p.pais), [ranked]);
  const todosMarcados = idsLista.length > 0 && idsLista.every((id) => foco.includes(id));
  const algunosMarcados = foco.length > 0 && !todosMarcados;

  const colorByPais = useMemo(() => {
    const map = {};
    topPaises.forEach((p, i) => { map[p.pais] = LINE_COLORS[i]; });
    otrosPaises.forEach((p) => { map[p.pais] = COLOR_OTROS; });
    return map;
  }, [topPaises, otrosPaises]);
  const colorMetrica = colorByPais[foco[0]] || LINE_COLORS[0];

  const chartData = useMemo(() => {
    if (tasaVsVolumen) {
      return buildPaisCompareMonthRows({
        days: serie.days,
        byDayByPais: serie.byDayByPais,
        overlayByDayByPais: overlay,
        selectedPaises: foco,
      });
    }
    return buildPaisChartRows({
      days: serie.days,
      byDayByPais: serie.byDayByPais,
      overlayByDayByPais: mostrarLeads ? overlay : null,
      selectedPaises: foco,
      topPaises,
      otrosPaises,
    });
  }, [tasaVsVolumen, serie.days, serie.byDayByPais, overlay, mostrarLeads, foco, topPaises, otrosPaises]);

  const lineDefs = useMemo(() => buildPaisLineDefs({
    selectedPaises: foco,
    showLeadsOverlay: mostrarLeads && !tasaVsVolumen,
    topPaises,
    otrosPaises,
    colorByPais,
  }), [foco, mostrarLeads, tasaVsVolumen, topPaises, otrosPaises, colorByPais]);

  const lineName = (key) => {
    if (key === OVERLAY_LEADS_KEY) return 'Leads';
    if (key === COMPARE_METRIC_KEY) return metricLabel;
    return key;
  };

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    const dayFull = row?.dayFull || label;
    if (tasaVsVolumen) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[170px]">
          <div className="text-slate-500 mb-1.5">{dayFull}</div>
          <div className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-slate-700">Leads</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {(row[OVERLAY_LEADS_KEY] || 0).toLocaleString('es-CO')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-slate-700">{metricLabel}</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {(row[COMPARE_METRIC_KEY] || 0).toLocaleString('es-CO')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-slate-700">Conversión</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatPct(row[COMPARE_PCT_KEY])}
            </span>
          </div>
        </div>
      );
    }
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
            <span className="text-slate-700 flex-1 truncate">{lineName(it.dataKey)}</span>
            <span className="font-semibold text-slate-800 tabular-nums">{it.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const top3Share = ranked.slice(0, 3).reduce((a, p) => a + p.sharePct, 0);
  const top3Count = Math.min(3, ranked.length);
  const topVolume = ranked[0];

  const setFoco = (next) => onPaisFocusChange?.(next);
  const togglePais = (pais) => setFoco(togglePaisSeleccionado(foco, pais));
  const toggleTodos = () => setFoco(todosMarcados ? [] : idsLista);

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
              onClick={() => setFoco([])}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1717AF]/10 text-[#1717AF] hover:bg-[#1717AF]/15 max-w-[180px] truncate"
              title="Volver a todos los países"
            >
              {etiquetaFoco} ×
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
                {tasaVsVolumen ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_LEADS_BAR }} />
                      Leads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: colorMetrica }} />
                      {metricLabel} %
                    </span>
                  </>
                ) : mostrarLeads ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: colorMetrica }} />
                      {metricLabel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_LEADS_OVERLAY }} />
                      Leads
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: colorMetrica }} />
                    {etiquetaFoco}
                  </span>
                )}
              </div>
            )}
            <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {tasaVsVolumen ? (
                <ComposedChart key={`${etiquetaFoco}-tasa`} data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#94A3B8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={0}
                    angle={-40}
                    textAnchor="end"
                    height={52}
                    dy={8}
                  />
                  <YAxis
                    yAxisId="leads"
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={36}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    stroke={colorMetrica}
                    tick={{ fontSize: 11, fill: colorMetrica }}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={renderTooltip} />
                  <Bar
                    yAxisId="leads"
                    dataKey={OVERLAY_LEADS_KEY}
                    name="Leads"
                    fill={COLOR_LEADS_BAR}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive
                    animationDuration={700}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey={COMPARE_PCT_KEY}
                    name={`${metricLabel} %`}
                    stroke={colorMetrica}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </ComposedChart>
              ) : (
                <LineChart key={`${etiquetaFoco || 'all'}-${vista}`} data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: ejeMensual ? 18 : 0 }}>
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
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={compareMode ? 36 : 32}
                  />
                  <Tooltip content={renderTooltip} />
                  {lineDefs.map((ln) => (
                    <Line
                      key={ln.key}
                      type="monotone"
                      dataKey={ln.key}
                      name={lineName(ln.key)}
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
              )}
            </ResponsiveContainer>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto overflow-x-hidden pr-1">
            {sePuedeFocar && ranked.length > 0 && (
              <button
                type="button"
                onClick={toggleTodos}
                className="sticky top-0 z-10 w-full flex items-center gap-2 text-sm py-1.5 px-2 mb-1 rounded-lg bg-white border-b border-slate-100 hover:bg-slate-50"
                title={todosMarcados ? 'Quitar todos' : 'Marcar todos'}
              >
                <CheckBox checked={todosMarcados} indeterminate={algunosMarcados} />
                <span className="flex-1 truncate text-xs font-medium text-slate-700 text-left">Todos</span>
                <span className="text-slate-400 text-xs tabular-nums">
                  {ranked.length}
                </span>
              </button>
            )}
            <div className="space-y-1">
            {ranked.map((p) => {
              const marcado = foco.includes(p.pais);
              const claseFila = `w-full flex items-center gap-2 text-sm py-1 px-2 rounded-lg transition-colors text-left ${
                marcado
                  ? 'bg-[#1717AF]/10 ring-1 ring-[#1717AF]/25'
                  : sePuedeFocar
                    ? 'hover:bg-slate-50 cursor-pointer'
                    : 'hover:bg-slate-50'
              }`;
              const contenido = (
                <>
                  {sePuedeFocar && <CheckBox checked={marcado} />}
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
                  onClick={() => togglePais(p.pais)}
                  className={claseFila}
                  title={marcado ? `Quitar ${p.pais}` : `Sumar ${p.pais}`}
                  aria-pressed={marcado}
                >
                  {contenido}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {ranked.length > 0 && serie.total > 0 && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          {tasaVsVolumen ? (
            <p className="text-slate-600 leading-relaxed">
              Las barras son los leads de{' '}
              <span className="font-semibold text-slate-800">{etiquetaFoco}</span>
              {' '}cada mes. La línea es el % de {metricLabel} sobre esos leads.
              {' '}Si el volumen baja y el % se sostiene, no se cayó la conversión.
            </p>
          ) : compareMode && mostrarLeads ? (
            <p className="text-slate-600 leading-relaxed">
              La línea continua es {metricLabel} de{' '}
              <span className="font-semibold text-slate-800">{etiquetaFoco}</span>
              . La punteada es <span className="font-semibold text-slate-800">leads</span> del mismo grupo.
              {' '}El eje es el volumen de leads.
            </p>
          ) : compareMode ? (
            <p className="text-slate-600 leading-relaxed">
              La línea es el volumen combinado de{' '}
              <span className="font-semibold text-slate-800">{etiquetaFoco}</span>.
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
