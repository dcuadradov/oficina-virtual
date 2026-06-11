import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { Loader2, Check } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { rowMatchesDims } from './PitchDimFilters';
import { DAY_LABELS } from '../../../utils/pitchRange';

// Universo "No fueron matrícula": resultados con estos valores de pitch_result.
const NO_MATRICULA_RESULTS = ['Interés futuro', 'Posible matrícula', 'No matrícula', 'Pago pendiente'];

// Sentinelas para valores nulos (se muestran como "Sin categoría / Sin motivo").
const SIN = '__SIN__';
const LABEL_SIN_CAT = 'Sin categoría';
const LABEL_SIN_SUB = 'Sin motivo';

// Paleta para torta y líneas de tendencia.
const PALETTE = [
  '#1717AF', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#65a30d',
];

const norm = (v) => (v === null || v === undefined || String(v).trim() === '' ? SIN : String(v).trim());

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

// Parsea "YYYY-MM-DD HH:MM" sin conversión de zona horaria.
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

const fmtHour = (h) => {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}${ampm}`;
};

const SUB_TABS = [
  { id: 'no_matricula', label: 'No fueron matrícula' },
  { id: 'reprobados', label: 'Reprobados' },
  { id: 'matricula', label: 'Matrícula' },
];

/**
 * Tab "Análisis" de Mis Pitch. Por ahora implementa "No fueron matrícula":
 * panel de motivos (Categoría / Sub categoría, excluyentes) + torta + tendencia.
 * Respeta el scope global (periodo, comercial, tags y filtros de dimensión).
 */
export default function PitchAnalisis({
  rangeStart,
  rangeEnd,
  viewMode = 'period',
  selectedComercial,
  userEmail,
  puedeVerTodos = false,
  tagFilter = [],
  dimFilters = null,
}) {
  const [subTab, setSubTab] = useState('no_matricula');
  const [rows, setRows] = useState([]);       // [{ card_id, cat, sub, parsed }]
  const [loading, setLoading] = useState(true);

  // Nivel activo (excluyente) que manda en las gráficas.
  const [activeLevel, setActiveLevel] = useState('categoria'); // 'categoria' | 'subcategoria'
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState([]);

  // ----- Carga: pitches_resultados (universo no-matrícula) + leads (scope) -----
  useEffect(() => {
    if (!rangeStart || !rangeEnd || subTab !== 'no_matricula') return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Rango servidor con padding ±1-2 días; el filtro fino es client-side.
        const lo = addDays(rangeStart, -1); lo.setHours(0, 0, 0, 0);
        const hi = addDays(rangeEnd, 2); hi.setHours(0, 0, 0, 0);
        const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 00:00:00`;

        const { data: prData, error: prErr } = await supabase
          .from('pitches_resultados')
          .select('card_id, pitch_result, motivo_no_matricula, motivo_no_matricula_categoria, fecha_pitch')
          .in('pitch_result', NO_MATRICULA_RESULTS)
          .gte('fecha_pitch', iso(lo))
          .lt('fecha_pitch', iso(hi));
        if (prErr) throw prErr;
        if (cancelled) return;

        const pitches = prData || [];
        const cardIds = [...new Set(pitches.map(p => p.card_id))];
        let leadMap = {};
        if (cardIds.length > 0) {
          const { data: leadsData, error: leadsErr } = await supabase
            .from('leads')
            .select('card_id, comercial_email, label, ocupacion, sexo, edad, ciudad, pais')
            .in('card_id', cardIds);
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
          // Scope: comercial
          if (selectedComercial) {
            if (lead.comercial_email !== selectedComercial) continue;
          } else if (!puedeVerTodos && userEmail) {
            if (lead.comercial_email !== userEmail) continue;
          }
          // Scope: tags
          if (tagFilter.length > 0 && !tagFilter.includes(lead.label)) continue;
          // Scope: dimensiones
          if (!rowMatchesDims(lead, dimFilters)) continue;
          // Scope: rango fino por fecha del pitch
          const parsed = parseDT(p.fecha_pitch);
          if (!parsed) continue;
          if (parsed.dateLocal < start || parsed.dateLocal > end) continue;

          built.push({
            card_id: p.card_id,
            cat: norm(p.motivo_no_matricula_categoria),
            sub: norm(p.motivo_no_matricula),
            parsed,
          });
        }
        setRows(built);
      } catch (e) {
        console.error('[Análisis] Error cargando no-matrícula:', e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    subTab,
    rangeStart?.getTime(),
    rangeEnd?.getTime(),
    selectedComercial,
    userEmail,
    puedeVerTodos,
    tagFilter.join('|'),
    JSON.stringify(dimFilters),
  ]);

  // Total de personas (leads únicos) del universo en scope → denominador del %.
  const totalLeads = useMemo(
    () => new Set(rows.map(r => r.card_id)).size,
    [rows]
  );

  // Lista de Categorías: todas (para poder seleccionar), con conteo de leads.
  const catList = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.cat)) map.set(r.cat, new Set());
      map.get(r.cat).add(r.card_id);
    });
    return [...map.entries()]
      .map(([value, set]) => ({ value, count: set.size }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  // Filas base para Sub categoría: cross-filter por categorías seleccionadas.
  const rowsForSub = useMemo(() => {
    if (selectedCats.length === 0) return rows;
    return rows.filter(r => selectedCats.includes(r.cat));
  }, [rows, selectedCats]);

  // Lista de Sub categorías (respeta el cross-filter de Categoría).
  const subList = useMemo(() => {
    const map = new Map();
    rowsForSub.forEach(r => {
      if (!map.has(r.sub)) map.set(r.sub, new Set());
      map.get(r.sub).add(r.card_id);
    });
    return [...map.entries()]
      .map(([value, set]) => ({ value, count: set.size }))
      .sort((a, b) => b.count - a.count);
  }, [rowsForSub]);

  // Prune de subs seleccionados que ya no existen tras cambiar el cross-filter.
  useEffect(() => {
    setSelectedSubs(prev => prev.filter(s => subList.some(x => x.value === s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subList.map(s => s.value).join('|')]);

  const labelFor = (level, value) => {
    if (value !== SIN) return value;
    return level === 'categoria' ? LABEL_SIN_CAT : LABEL_SIN_SUB;
  };

  // ----- Datos para las gráficas según nivel activo + selección -----
  const { chartRows, chartValues, chartLevel } = useMemo(() => {
    if (activeLevel === 'subcategoria') {
      const values = selectedSubs.length > 0 ? selectedSubs : subList.map(s => s.value);
      const base = rowsForSub.filter(r => values.includes(r.sub));
      return { chartRows: base.map(r => ({ ...r, value: r.sub })), chartValues: values, chartLevel: 'subcategoria' };
    }
    const values = selectedCats.length > 0 ? selectedCats : catList.map(c => c.value);
    const base = rows.filter(r => values.includes(r.cat));
    return { chartRows: base.map(r => ({ ...r, value: r.cat })), chartValues: values, chartLevel: 'categoria' };
  }, [activeLevel, selectedSubs, selectedCats, subList, catList, rows, rowsForSub]);

  // Conteo de leads únicos por valor (para la torta).
  const pieData = useMemo(() => {
    const map = new Map();
    chartValues.forEach(v => map.set(v, new Set()));
    chartRows.forEach(r => { if (map.has(r.value)) map.get(r.value).add(r.card_id); });
    return chartValues
      .map(v => ({ name: labelFor(chartLevel, v), rawValue: v, value: map.get(v)?.size || 0 }))
      .filter(d => d.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRows, chartValues, chartLevel]);

  // Buckets de tiempo según el modo de vista.
  const buckets = useMemo(() => {
    const list = [];
    if (!rangeStart || !rangeEnd) return list;
    if (viewMode === 'day') {
      for (let h = 0; h < 24; h += 2) {
        list.push({ key: `h${h}`, label: fmtHour(h), test: (p) => p.hour >= h && p.hour < h + 2 });
      }
    } else if (viewMode === 'month') {
      const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
      const end = new Date(rangeEnd); end.setHours(0, 0, 0, 0);
      let cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 200) {
        const bStart = new Date(cursor);
        const bEnd = addDays(cursor, 2);
        list.push({
          key: `d${bStart.getTime()}`,
          label: `${bStart.getDate()}`,
          test: (p) => p.dateLocal >= bStart && p.dateLocal < bEnd,
        });
        cursor = addDays(cursor, 2);
        guard++;
      }
    } else {
      const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
      const end = new Date(rangeEnd); end.setHours(0, 0, 0, 0);
      let cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 40) {
        const d0 = new Date(cursor);
        list.push({
          key: `d${d0.getTime()}`,
          label: `${DAY_LABELS[d0.getDay()]} ${d0.getDate()}`,
          test: (p) => p.dateLocal.getTime() === d0.getTime(),
        });
        cursor = addDays(cursor, 1);
        guard++;
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart?.getTime(), rangeEnd?.getTime()]);

  // Datos de tendencia: una serie por valor del nivel activo, leads únicos/bucket.
  const trendData = useMemo(() => {
    return buckets.map(b => {
      const obj = { label: b.label };
      chartValues.forEach(v => {
        const set = new Set();
        chartRows.forEach(r => {
          if (r.value === v && b.test(r.parsed)) set.add(r.card_id);
        });
        obj[labelFor(chartLevel, v)] = set.size;
      });
      return obj;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, chartRows, chartValues, chartLevel]);

  const colorFor = (rawValue, idx) => PALETTE[idx % PALETTE.length];

  const toggleCat = (value) => {
    setActiveLevel('categoria');
    setSelectedCats(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };
  const toggleSub = (value) => {
    setActiveLevel('subcategoria');
    setSelectedSubs(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const pct = (n) => (totalLeads > 0 ? Math.round((n / totalLeads) * 100) : 0);

  // ----- Render -----
  return (
    <div>
      {/* Sub-tabs del Análisis */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              subTab === t.id
                ? 'border-[#1717AF] text-[#1717AF]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab !== 'no_matricula' ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 px-6 py-16 text-center">
          <div className="text-sm font-medium text-slate-600">{SUB_TABS.find(t => t.id === subTab)?.label}</div>
          <div className="text-xs text-slate-400 mt-1">Próximamente.</div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#1717AF] animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 px-6 py-16 text-center">
          <div className="text-sm font-medium text-slate-600">Sin datos en este periodo</div>
          <div className="text-xs text-slate-400 mt-1">No hay pitches "no matrícula" con los filtros actuales.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel de motivos */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Motivos</h3>

            {/* Nivel: Categoría */}
            <LevelHeader
              label="Categoría"
              active={activeLevel === 'categoria'}
              onClick={() => setActiveLevel('categoria')}
            />
            <div className="mt-1 mb-4">
              {catList.map(item => (
                <ItemRow
                  key={item.value}
                  label={labelFor('categoria', item.value)}
                  count={item.count}
                  pct={pct(item.count)}
                  checked={selectedCats.includes(item.value)}
                  dim={item.value === SIN}
                  onClick={() => toggleCat(item.value)}
                />
              ))}
            </div>

            {/* Nivel: Sub categoría */}
            <LevelHeader
              label="Sub categoría"
              active={activeLevel === 'subcategoria'}
              onClick={() => setActiveLevel('subcategoria')}
            />
            <div className="mt-1">
              {subList.map(item => (
                <ItemRow
                  key={item.value}
                  label={labelFor('subcategoria', item.value)}
                  count={item.count}
                  pct={pct(item.count)}
                  checked={selectedSubs.includes(item.value)}
                  dim={item.value === SIN}
                  onClick={() => toggleSub(item.value)}
                />
              ))}
            </div>
          </div>

          {/* Gráficas */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Torta */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Proyección</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                      {pieData.map((d, i) => <Cell key={d.rawValue} fill={colorFor(d.rawValue, i)} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} ${v === 1 ? 'persona' : 'personas'} (${pct(v)}%)`, n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tendencia */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Tendencia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Legend />
                    {pieData.map((d, i) => (
                      <Line
                        key={d.rawValue}
                        type="monotone"
                        dataKey={d.name}
                        stroke={colorFor(d.rawValue, i)}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Encabezado de nivel con checkbox (radio del nivel activo).
function LevelHeader({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 pb-1 border-b transition-colors ${
        active ? 'border-[#1717AF]' : 'border-slate-200'
      }`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        active ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
      }`}>
        {active && <Check size={10} className="text-white" />}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-[#1717AF]' : 'text-slate-600'}`}>{label}</span>
    </button>
  );
}

// Fila de item con checkbox + conteo + %.
function ItemRow({ label, count, pct, checked, dim, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg text-left transition-colors hover:bg-slate-50`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        checked ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
      }`}>
        {checked && <Check size={10} className="text-white" />}
      </div>
      <span className={`flex-1 text-sm truncate ${dim ? 'italic text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">{count} · {pct}%</span>
    </button>
  );
}
