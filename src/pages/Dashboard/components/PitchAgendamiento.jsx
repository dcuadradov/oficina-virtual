import React, { useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const SIN = '__SIN__';

// Canales fijos del campo "¿Cómo agendaste el Pitch?" (cierre_pitch).
const CIERRE_PITCH_OPTIONS = [
  { key: 'whatsapp', label: 'WhatsApp', pattern: /whatsapp/i, color: '#1717AF' },
  { key: 'llamada',  label: 'Llamada',  pattern: /llamada/i,  color: '#f59e0b' },
  { key: 'correo',   label: 'Correo',   pattern: /correo|e-?mail/i, color: '#10b981' },
];

const OTHER_PALETTE = ['#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

const classifyCierre = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return { key: SIN, label: 'Sin dato', color: '#94a3b8' };
  const known = CIERRE_PITCH_OPTIONS.find(o => o.pattern.test(s));
  if (known) return { key: known.key, label: known.label, color: known.color };
  return { key: `other:${s}`, label: s, color: null };
};

/**
 * Tab "Agendamiento" de Mis Pitch. Recibe el universo ya filtrado por
 * comercial/tags/dimensiones y muestra el canal de cierre (WhatsApp / Llamada
 * / Correo) en un panel + torta, con el mismo lenguaje visual que Análisis.
 */
export default function PitchAgendamiento({ rows = [], loading = false }) {
  const [selected, setSelected] = useState([]);

  const classified = useMemo(
    () => rows.map(r => ({ ...r, ...classifyCierre(r.cierre_pitch) })),
    [rows]
  );

  const { list, colorMap, total, sinCount } = useMemo(() => {
    const counts = new Map();
    let empty = 0;
    classified.forEach(r => {
      if (r.key === SIN) {
        empty += 1;
        return;
      }
      counts.set(r.key, (counts.get(r.key) || 0) + 1);
    });

    const knownKeys = new Set(CIERRE_PITCH_OPTIONS.map(o => o.key));
    const items = CIERRE_PITCH_OPTIONS.map(o => ({
      key: o.key,
      label: o.label,
      color: o.color,
      count: counts.get(o.key) || 0,
    }));

    let extraIdx = 0;
    counts.forEach((count, key) => {
      if (knownKeys.has(key)) return;
      const sample = classified.find(r => r.key === key);
      items.push({
        key,
        label: sample?.label || key,
        color: OTHER_PALETTE[extraIdx % OTHER_PALETTE.length],
        count,
      });
      extraIdx += 1;
    });

    const cmap = new Map(items.map(it => [it.key, it.color]));
    const tot = items.reduce((acc, it) => acc + it.count, 0);
    return { list: items, colorMap: cmap, total: tot, sinCount: empty };
  }, [classified]);

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const pieData = useMemo(() => {
    const visibleKeys = selected.length > 0 ? selected : list.filter(it => it.count > 0).map(it => it.key);
    return list
      .filter(it => visibleKeys.includes(it.key) && it.count > 0)
      .map(it => ({ name: it.label, rawValue: it.key, value: it.count }));
  }, [list, selected]);

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#1717AF] animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 px-6 py-16 text-center">
        <div className="text-sm font-medium text-slate-600">Sin datos en este periodo</div>
        <div className="text-xs text-slate-400 mt-1">No hay pitches con los filtros actuales.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-baseline gap-2">
          Canal de agendamiento
          <span className="text-xs font-medium text-slate-400">
            {total} {total === 1 ? 'pitch' : 'pitches'}
          </span>
        </h3>
        <div className="mt-1">
          {list.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg text-left transition-colors hover:bg-slate-50"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                selected.includes(item.key) ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
              }`}>
                {selected.includes(item.key) && <Check size={10} className="text-white" />}
              </div>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="flex-1 text-sm truncate text-slate-600">
                {item.label}
              </span>
              <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">
                {item.count} · {pct(item.count)}%
              </span>
            </button>
          ))}
        </div>
        {sinCount > 0 && (
          <p className="mt-3 px-1 text-[11px] text-slate-400">
            {sinCount} {sinCount === 1 ? 'pitch' : 'pitches'} sin canal registrado
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Participación</h3>
          {pieData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-sm text-slate-400">
              Sin canales para mostrar
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={55}>
                    {pieData.map((d) => (
                      <Cell key={d.rawValue} fill={colorMap.get(d.rawValue) || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} ${v === 1 ? 'pitch' : 'pitches'} (${pct(v)}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
