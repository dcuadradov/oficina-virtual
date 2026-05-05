import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../../../supabaseClient';

// Paleta de 30+ colores. Mantiene #1717AF como primario y rota tonos
// vivos pero coordinados (índigo, violeta, sky, teal, emerald, amber, rose...).
const PALETTE = [
  '#1717AF', '#6366F1', '#7C3AED', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316', '#F59E0B',
  '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#4F46E5', '#8B5CF6',
  '#C026D3', '#DB2777', '#E11D48', '#DC2626', '#EA580C',
  '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#059669',
];
const COLOR_SIN_FUENTE = '#94A3B8'; // slate-400
const COLOR_OTROS = '#CBD5E1';      // slate-300

const SIN_FUENTE = 'Sin fuente';
const OTROS = 'Otros';

function buildRango(monthConfigs, mesKey) {
  const config = monthConfigs?.[mesKey];
  if (config?.fecha_inicio) {
    const fechaInicio = `${config.fecha_inicio} 05:00:00+00`;
    let fechaFin;
    if (config.fecha_fin) {
      const [yF, mF, dF] = config.fecha_fin.split('-').map(Number);
      const finMasUno = new Date(yF, mF - 1, dF + 1);
      fechaFin = `${finMasUno.getFullYear()}-${String(finMasUno.getMonth() + 1).padStart(2, '0')}-${String(finMasUno.getDate()).padStart(2, '0')} 05:00:00+00`;
    } else {
      const now = new Date();
      const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      fechaFin = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')} 05:00:00+00`;
    }
    return { fechaInicio, fechaFin };
  }
  const [year, month] = mesKey.split('-').map(Number);
  const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01 05:00:00+00`;
  const mesSiguiente = new Date(year, month, 1);
  const fechaFin = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01 05:00:00+00`;
  return { fechaInicio, fechaFin };
}

const TAB_LIMITS = [10, 20, 30];

export default function Slot02_FuentesLeads({ selectedMes, monthConfigs }) {
  const [rawCounts, setRawCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [topLimit, setTopLimit] = useState(10);

  // Trae todas las fuentes del mes en una sola pasada paginada (mismo filtro que Gestión).
  useEffect(() => {
    if (!selectedMes) return;
    let cancelled = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const rango = buildRango(monthConfigs, selectedMes);
        const PAGE_SIZE = 1000;
        const acc = {};
        let totalCount = 0;
        let from = 0;
        let keep = true;
        while (keep && !cancelled) {
          const { data, error } = await supabase
            .from('leads')
            .select('fuente_dato')
            .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null')
            .gte('created_at', rango.fechaInicio)
            .lte('created_at', rango.fechaFin)
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          (data || []).forEach((row) => {
            const key = (row.fuente_dato == null || String(row.fuente_dato).trim() === '')
              ? SIN_FUENTE
              : String(row.fuente_dato).trim();
            acc[key] = (acc[key] || 0) + 1;
            totalCount++;
          });
          if (!data || data.length < PAGE_SIZE) keep = false;
          from += PAGE_SIZE;
        }
        if (!cancelled) {
          setRawCounts(acc);
          setTotal(totalCount);
          setTopLimit(10); // reset al cambiar mes
        }
      } catch (err) {
        console.error('[Slot02] error cargando fuentes:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [selectedMes, monthConfigs]);

  // Sorted entries (mayor → menor). "Sin fuente" se ordena junto con el resto por su cuenta.
  const sorted = useMemo(() => {
    return Object.entries(rawCounts)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawCounts]);

  // Tabs disponibles según total de fuentes únicas.
  const availableTabs = useMemo(() => {
    const tabs = TAB_LIMITS.filter(n => sorted.length > n - 10 || n === 10);
    // Filtramos: solo mostramos un Top N si hay al menos N+1 fuentes (sino no aporta).
    const filtered = TAB_LIMITS.filter((n, i) => i === 0 || sorted.length > TAB_LIMITS[i - 1]);
    return filtered.length ? filtered : [10];
  }, [sorted.length]);

  // Asegurar que topLimit no quede en una tab no disponible.
  useEffect(() => {
    if (!availableTabs.includes(topLimit)) {
      setTopLimit(availableTabs[0] || 10);
    }
  }, [availableTabs, topLimit]);

  // Construye los segmentos visibles (top N + "Otros"), asignando color y porcentaje.
  const segmentos = useMemo(() => {
    if (!sorted.length || !total) return [];
    const top = sorted.slice(0, topLimit);
    const resto = sorted.slice(topLimit);
    let palettePos = 0;
    const out = top.map((item) => {
      const isSinFuente = item.nombre === SIN_FUENTE;
      const color = isSinFuente ? COLOR_SIN_FUENTE : PALETTE[palettePos++ % PALETTE.length];
      return { ...item, color, pct: (item.count / total) * 100 };
    });
    if (resto.length) {
      const restoCount = resto.reduce((acc, r) => acc + r.count, 0);
      out.push({
        nombre: `${OTROS} (${resto.length})`,
        count: restoCount,
        color: COLOR_OTROS,
        pct: (restoCount / total) * 100,
        esOtros: true,
      });
    }
    return out;
  }, [sorted, topLimit, total]);

  // Análisis Pareto: cuántas fuentes acumulan ≥ 80% del total.
  const pareto = useMemo(() => {
    if (!sorted.length || !total) return null;
    let acumulado = 0;
    const top = [];
    for (const item of sorted) {
      acumulado += item.count;
      top.push(item);
      if (acumulado / total >= 0.8) break;
    }
    return {
      cantidad: top.length,
      pct: (acumulado / total) * 100,
      nombres: top.map(t => t.nombre),
    };
  }, [sorted, total]);

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-semibold text-slate-700">{p.nombre}</span>
        </div>
        <div className="text-slate-600">
          <span className="font-semibold text-slate-800">{p.count.toLocaleString('es-CO')}</span> leads · {p.pct.toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Procedencia de los leads</h3>
          <p className="text-xs text-slate-500 mt-0.5">Distribución por fuente del mes seleccionado.</p>
        </div>
        <div className="flex items-center gap-2">
          {availableTabs.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTopLimit(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                topLimit === n
                  ? 'bg-[#1717AF] text-white shadow-sm shadow-[#1717AF]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Top {n}
            </button>
          ))}
          {loading && <span className="text-xs text-slate-400 animate-pulse ml-2">Cargando…</span>}
        </div>
      </div>

      {!total ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Sin leads en el mes seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Donut */}
          <div className="relative w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentos}
                  dataKey="count"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={1100}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  {segmentos.map((seg) => (
                    <Cell key={seg.nombre} fill={seg.color} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            {/* Total al centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">{total.toLocaleString('es-CO')}</span>
              <span className="text-xs text-slate-500 mt-0.5">leads del mes</span>
            </div>
          </div>

          {/* Leyenda */}
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden pr-1 space-y-1">
            {segmentos.map((seg) => (
              <div
                key={seg.nombre}
                className="flex items-center gap-3 text-sm py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span
                  className={`flex-1 truncate ${seg.esOtros ? 'italic text-slate-500' : 'text-slate-700'}`}
                  title={seg.nombre}
                >
                  {seg.nombre}
                </span>
                <span className="text-slate-500 text-xs tabular-nums">
                  {seg.count.toLocaleString('es-CO')}
                </span>
                <span className="text-slate-800 font-semibold text-xs tabular-nums w-12 text-right">
                  {seg.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análisis Pareto */}
      {pareto && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          <p className="text-slate-600 leading-relaxed">
            El <span className="font-semibold text-slate-800">{pareto.pct.toFixed(0)}%</span> de los leads del mes provienen de{' '}
            <span className="font-semibold text-slate-800">{pareto.cantidad}</span>{' '}
            {pareto.cantidad === 1 ? 'fuente' : 'fuentes'}:{' '}
            <span className="text-slate-700">{pareto.nombres.slice(0, 5).join(', ')}{pareto.nombres.length > 5 ? '…' : ''}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
