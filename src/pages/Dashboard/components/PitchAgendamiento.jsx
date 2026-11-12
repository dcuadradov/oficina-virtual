import React, { useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { bucketsDeVista, leadsUnicosDeFilas, sinSalto } from '../pitchCharts';
import PitchRightPanel from './PitchRightPanel';

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
 * / Correo) a la izquierda y, a la derecha, Participación / Tendencia / Leads.
 */
export default function PitchAgendamiento({
  rows = [],
  loading = false,
  viewMode = 'period',
  rangeStart,
  rangeEnd,
  onOpenLead,
}) {
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

  const visibleRows = useMemo(() => {
    const keys = new Set(pieData.map(d => d.rawValue));
    if (keys.size === 0) return [];
    return classified.filter(r => keys.has(r.key));
  }, [classified, pieData]);

  const leadsList = useMemo(() => leadsUnicosDeFilas(visibleRows), [visibleRows]);

  const buckets = useMemo(
    () => bucketsDeVista(viewMode, rangeStart, rangeEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewMode, rangeStart?.getTime(), rangeEnd?.getTime()],
  );

  const trendData = useMemo(() => {
    return buckets.map(b => {
      const obj = { label: b.label };
      pieData.forEach(d => {
        const set = new Set();
        visibleRows.forEach(r => {
          if (r.key === d.rawValue && r.parsed && b.test(r.parsed)) set.add(r.card_id);
        });
        obj[d.name] = set.size;
      });
      return obj;
    });
  }, [buckets, pieData, visibleRows]);

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="relative" style={{ overflowAnchor: 'none' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70">
          <Loader2 size={32} className="text-[#1717AF] animate-spin" />
        </div>
      )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5 flex flex-col h-[28rem]">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-baseline gap-2">
          Canal de agendamiento
          <span className="text-xs font-medium text-slate-400">
            {total} {total === 1 ? 'pitch' : 'pitches'}
          </span>
        </h3>
        <div className="mt-1">
          {rows.length === 0 && !loading && (
            <p className="px-1 py-2 text-xs text-slate-400">No hay pitches con los filtros actuales.</p>
          )}
          {list.map(item => (
            <button
              key={item.key}
              type="button"
              onMouseDown={sinSalto}
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

      <PitchRightPanel
        pieData={pieData}
        colorMap={colorMap}
        trendData={trendData}
        leads={leadsList}
        onOpenLead={onOpenLead}
        unitSingular="pitch"
        unitPlural="pitches"
        pct={pct}
      />
    </div>
    </div>
  );
}
