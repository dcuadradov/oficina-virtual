import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../../../supabaseClient';
import { PITCH_TAG_PRESETS } from '../../PitchKpis';

// Paleta para hasta ~10 comerciales (mismos tonos que Slot 2 pero saltando los grises de "Sin asignar").
const PALETTE = [
  '#1717AF', '#6366F1', '#7C3AED', '#A855F7', '#EC4899',
  '#F43F5E', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
];
const COLOR_SIN_ASIGNAR = '#94A3B8'; // slate-400
const SIN_ASIGNAR = 'Sin asignar';

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

export default function Slot03_AsignacionLeads({ selectedMes, monthConfigs }) {
  const [activePresetId, setActivePresetId] = useState('todos');
  const [counts, setCounts] = useState({}); // { email: count }
  const [total, setTotal] = useState(0);
  const [nombresMap, setNombresMap] = useState({}); // { email: nombre }
  const [loading, setLoading] = useState(false);

  const presetActive = useMemo(
    () => PITCH_TAG_PRESETS.find(p => p.id === activePresetId) || PITCH_TAG_PRESETS[0],
    [activePresetId],
  );

  // Trae los leads del mes filtrados por preset (tags) y los agrupa por comercial.
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
          let query = supabase
            .from('leads')
            .select('comercial_email')
            .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null')
            .gte('created_at', rango.fechaInicio)
            .lte('created_at', rango.fechaFin);

          if (presetActive.tags !== 'all' && Array.isArray(presetActive.tags)) {
            query = query.in('label', presetActive.tags);
          }

          const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          (data || []).forEach((row) => {
            const key = (row.comercial_email == null || String(row.comercial_email).trim() === '')
              ? SIN_ASIGNAR
              : String(row.comercial_email).trim();
            acc[key] = (acc[key] || 0) + 1;
            totalCount++;
          });
          if (!data || data.length < PAGE_SIZE) keep = false;
          from += PAGE_SIZE;
        }

        // Resolver nombres
        const emails = Object.keys(acc).filter(e => e !== SIN_ASIGNAR);
        let nombres = {};
        if (emails.length) {
          const { data: usuarios } = await supabase
            .from('usuarios')
            .select('email, nombre')
            .in('email', emails);
          (usuarios || []).forEach((u) => {
            if (u?.email) nombres[u.email] = u.nombre || u.email.split('@')[0];
          });
        }

        if (!cancelled) {
          setCounts(acc);
          setTotal(totalCount);
          setNombresMap(nombres);
        }
      } catch (err) {
        console.error('[Slot03] error cargando asignación:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [selectedMes, monthConfigs, presetActive]);

  // Segmentos ordenados (mayor → menor); "Sin asignar" siempre con color gris.
  const segmentos = useMemo(() => {
    if (!total) return [];
    const sorted = Object.entries(counts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count);
    let palettePos = 0;
    return sorted.map((item) => {
      const isSinAsignar = item.email === SIN_ASIGNAR;
      const color = isSinAsignar ? COLOR_SIN_ASIGNAR : PALETTE[palettePos++ % PALETTE.length];
      const nombre = isSinAsignar
        ? SIN_ASIGNAR
        : (nombresMap[item.email] || item.email.split('@')[0] || item.email);
      return {
        email: item.email,
        nombre,
        count: item.count,
        color,
        pct: (item.count / total) * 100,
      };
    });
  }, [counts, nombresMap, total]);

  // Top concentración: hasta 3 comerciales que acumulen el mayor porcentaje, para el análisis.
  // Excluye "Sin asignar" (no es un comercial).
  const topConcentracion = useMemo(() => {
    const comerciales = segmentos.filter(s => s.email !== SIN_ASIGNAR);
    if (!comerciales.length) return null;
    const top = comerciales.slice(0, 3);
    const acumulado = top.reduce((acc, s) => acc + s.pct, 0);
    return {
      cantidad: top.length,
      pct: acumulado,
      nombres: top.map(t => t.nombre),
    };
  }, [segmentos]);

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
          <h3 className="text-base font-semibold text-slate-800">Asignación de leads</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribución de los leads del mes por comercial, según el grupo de tags seleccionado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PITCH_TAG_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActivePresetId(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePresetId === preset.id
                  ? 'bg-[#1717AF] text-white shadow-sm shadow-[#1717AF]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {loading && <span className="text-xs text-slate-400 animate-pulse ml-2">Cargando…</span>}
        </div>
      </div>

      {!total ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Sin leads en el mes seleccionado para este grupo.
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
                    <Cell key={seg.email} fill={seg.color} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">{total.toLocaleString('es-CO')}</span>
              <span className="text-xs text-slate-500 mt-0.5">leads del mes</span>
            </div>
          </div>

          {/* Leyenda */}
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden pr-1 space-y-1">
            {segmentos.map((seg) => (
              <div
                key={seg.email}
                className="flex items-center gap-3 text-sm py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span
                  className={`flex-1 truncate ${seg.email === SIN_ASIGNAR ? 'italic text-slate-500' : 'text-slate-700'}`}
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

      {topConcentracion && (
        <div className="mt-5 flex items-start gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <Sparkles size={16} className="text-[#1717AF] mt-0.5 flex-shrink-0" />
          <p className="text-slate-600 leading-relaxed">
            Los <span className="font-semibold text-slate-800">{topConcentracion.cantidad}</span>{' '}
            comerciales con más asignaciones en este grupo concentran el{' '}
            <span className="font-semibold text-slate-800">{topConcentracion.pct.toFixed(0)}%</span> de los leads:{' '}
            <span className="text-slate-700">{topConcentracion.nombres.join(', ')}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
