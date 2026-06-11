import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Check } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { DAY_LABELS } from '../../../utils/pitchRange';
import { ANALISIS_SUBTABS, getSubTabConfig } from './usePitchAnalisisUniverse';

const SIN = '__SIN__';

// Metadatos de cada nivel jerárquico del panel "Motivos".
const LEVEL_META = {
  etapa:        { label: 'Etapa',         accessor: 'stage',     sinLabel: 'Sin etapa' },
  categoria:    { label: 'Categoría',     accessor: 'cat',       sinLabel: 'Sin categoría' },
  subcategoria: { label: 'Sub categoría', accessor: 'sub',       sinLabel: 'Sin motivo' },
  matricula:    { label: 'Motivo',        accessor: 'matricula', sinLabel: 'Sin motivo' },
};

// Paleta para torta y líneas de tendencia (y los punticos del panel).
const PALETTE = [
  '#1717AF', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#65a30d',
];

const norm = (v) => (v === null || v === undefined || String(v).trim() === '' ? SIN : String(v).trim());
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

const fmtHour = (h) => {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}${ampm}`;
};

/**
 * Tab "Análisis" de Mis Pitch (presentacional). Recibe el universo ya filtrado
 * por comercial/tags/dimensiones (`rows`) y dibuja el panel de motivos
 * (niveles excluyentes con cascada) + torta + tendencia.
 */
export default function PitchAnalisis({
  subTab = 'no_matricula',
  onSubTabChange,
  rows = [],
  loading = false,
  viewMode = 'period',
  rangeStart,
  rangeEnd,
}) {
  const config = getSubTabConfig(subTab);
  const levels = config.levels;

  // Nivel activo + selecciones por nivel. Se reinician al cambiar de sub-tab.
  const [activeLevel, setActiveLevel] = useState(levels[0] || null);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    setActiveLevel(levels[0] || null);
    setSelected({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  // Nivel activo "seguro": si el estado quedó en un nivel que no existe en el
  // sub-tab actual (transición entre tabs antes de que corra el efecto), cae al
  // primer nivel disponible. Evita leer LEVEL_META[undefined] y crashear.
  const safeActive = activeLevel && levels.includes(activeLevel) ? activeLevel : (levels[0] || null);

  // Total de leads únicos del universo del sub-tab → denominador del %.
  const totalLeads = useMemo(() => new Set(rows.map(r => r.card_id)).size, [rows]);

  // Filas que cumplen las selecciones de los niveles superiores a `levelIdx`.
  const scopedRows = (levelIdx) => {
    let r = rows;
    for (let j = 0; j < levelIdx; j++) {
      const lv = levels[j];
      const acc = LEVEL_META[lv].accessor;
      const sel = selected[lv] || [];
      if (sel.length > 0) r = r.filter(x => sel.includes(norm(x[acc])));
    }
    return r;
  };

  // Lista de un nivel: valores distintos con conteo de leads únicos (cascada).
  const listFor = (levelIdx) => {
    const lv = levels[levelIdx];
    const acc = LEVEL_META[lv].accessor;
    const base = scopedRows(levelIdx);
    const map = new Map();
    base.forEach(r => {
      const v = norm(r[acc]);
      if (!map.has(v)) map.set(v, new Set());
      map.get(v).add(r.card_id);
    });
    return [...map.entries()]
      .map(([value, set]) => ({ value, count: set.size }))
      .sort((a, b) => b.count - a.count);
  };

  const labelFor = (lv, value) => (value === SIN ? LEVEL_META[lv].sinLabel : value);

  const toggle = (lv, value) => {
    setActiveLevel(lv);
    setSelected(prev => {
      const cur = prev[lv] || [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      const result = { ...prev, [lv]: next };
      // Al cambiar selección de un nivel, limpio las selecciones de los de abajo
      // (la cascada vuelve a empezar desde aquí).
      const idx = levels.indexOf(lv);
      for (let j = idx + 1; j < levels.length; j++) result[levels[j]] = [];
      return result;
    });
  };

  // Datos de la gráfica según el nivel activo (respeta la cascada).
  const { chartLevel, chartAcc, chartValues, chartRows, colorMap } = useMemo(() => {
    if (!safeActive) {
      return { chartLevel: null, chartAcc: null, chartValues: [], chartRows: [], colorMap: new Map() };
    }
    const idx = levels.indexOf(safeActive);
    const acc = LEVEL_META[safeActive].accessor;
    const list = listFor(idx);
    const cmap = new Map(list.map((it, i) => [it.value, PALETTE[i % PALETTE.length]]));
    const sel = selected[safeActive] || [];
    const values = sel.length > 0 ? sel : list.map(it => it.value);
    const base = scopedRows(idx).filter(r => values.includes(norm(r[acc])));
    return { chartLevel: safeActive, chartAcc: acc, chartValues: values, chartRows: base, colorMap: cmap };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeActive, selected, rows, levels]);

  // Torta: leads únicos por valor.
  const pieData = useMemo(() => {
    const map = new Map();
    chartValues.forEach(v => map.set(v, new Set()));
    chartRows.forEach(r => {
      const v = norm(r[chartAcc]);
      if (map.has(v)) map.get(v).add(r.card_id);
    });
    return chartValues
      .map(v => ({ name: labelFor(chartLevel, v), rawValue: v, value: map.get(v)?.size || 0 }))
      .filter(d => d.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRows, chartValues, chartAcc, chartLevel]);

  // Buckets de tiempo según el modo de vista (mes 2d/15, semana 7, día 2h/12).
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
        list.push({ key: `d${bStart.getTime()}`, label: `${bStart.getDate()}`, test: (p) => p.dateLocal >= bStart && p.dateLocal < bEnd });
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
        list.push({ key: `d${d0.getTime()}`, label: `${DAY_LABELS[d0.getDay()]} ${d0.getDate()}`, test: (p) => p.dateLocal.getTime() === d0.getTime() });
        cursor = addDays(cursor, 1);
        guard++;
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rangeStart?.getTime(), rangeEnd?.getTime()]);

  // Tendencia: una serie por valor del nivel activo, leads únicos por bucket.
  const trendData = useMemo(() => {
    return buckets.map(b => {
      const obj = { label: b.label };
      chartValues.forEach(v => {
        const set = new Set();
        chartRows.forEach(r => {
          if (norm(r[chartAcc]) === v && b.test(r.parsed)) set.add(r.card_id);
        });
        obj[labelFor(chartLevel, v)] = set.size;
      });
      return obj;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, chartRows, chartValues, chartAcc, chartLevel]);

  const pct = (n) => (totalLeads > 0 ? Math.round((n / totalLeads) * 100) : 0);

  return (
    <div>
      {/* Sub-tabs del Análisis */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {ANALISIS_SUBTABS.map(t => (
          <button
            key={t.id}
            onClick={() => onSubTabChange?.(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              subTab === t.id ? 'border-[#1717AF] text-[#1717AF]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {levels.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 px-6 py-16 text-center">
          <div className="text-sm font-medium text-slate-600">{config.label}</div>
          <div className="text-xs text-slate-400 mt-1">Próximamente.</div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#1717AF] animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 px-6 py-16 text-center">
          <div className="text-sm font-medium text-slate-600">Sin datos en este periodo</div>
          <div className="text-xs text-slate-400 mt-1">No hay pitches en este sub-tab con los filtros actuales.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Panel de motivos (scrollable) */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-baseline gap-2">
              Motivos
              <span className="text-xs font-medium text-slate-400">
                {totalLeads} {totalLeads === 1 ? 'lead' : 'leads'}
              </span>
            </h3>
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '460px' }}>
              {levels.map((lv, idx) => {
                const list = listFor(idx);
                const isActive = safeActive === lv;
                return (
                  <div key={lv} className={idx > 0 ? 'mt-4' : ''}>
                    {levels.length > 1 && (
                      <LevelHeader label={LEVEL_META[lv].label} active={isActive} onClick={() => setActiveLevel(lv)} />
                    )}
                    <div className="mt-1">
                      {list.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-slate-400">Sin opciones</p>
                      ) : list.map(item => (
                        <ItemRow
                          key={item.value}
                          label={labelFor(lv, item.value)}
                          count={item.count}
                          pct={pct(item.count)}
                          checked={(selected[lv] || []).includes(item.value)}
                          dim={item.value === SIN}
                          color={isActive ? colorMap.get(item.value) : null}
                          onClick={() => toggle(lv, item.value)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráficas */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Participación</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                      {pieData.map((d) => <Cell key={d.rawValue} fill={colorMap.get(d.rawValue) || '#cbd5e1'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} ${v === 1 ? 'persona' : 'personas'} (${pct(v)}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Tendencia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip />
                    {pieData.map((d) => (
                      <Line
                        key={d.rawValue}
                        type="monotone"
                        dataKey={d.name}
                        stroke={colorMap.get(d.rawValue) || '#cbd5e1'}
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
      className={`w-full flex items-center gap-2 pb-1 border-b transition-colors ${active ? 'border-[#1717AF]' : 'border-slate-200'}`}
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

// Fila de item con checkbox + puntico de color (nivel activo) + conteo + %.
function ItemRow({ label, count, pct, checked, dim, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg text-left transition-colors hover:bg-slate-50"
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        checked ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
      }`}>
        {checked && <Check size={10} className="text-white" />}
      </div>
      {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className={`flex-1 text-sm truncate ${dim ? 'italic text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">{count} · {pct}%</span>
    </button>
  );
}
