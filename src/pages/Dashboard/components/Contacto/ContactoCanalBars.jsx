import { Phone, MessageCircle } from 'lucide-react';
import { CANAL_LLAMADA, CANAL_MENSAJE, pct } from './contactoReglas';

const TRAMOS = [
  { id: 'no', key: 'noContestaron', pctKey: 'pctNo', label: 'No contestaron', color: 'bg-slate-300' },
  { id: 'contesto', key: 'contestaronSolo', pctKey: 'pctContestoSolo', label: 'Contestaron', color: 'bg-[#1717AF]' },
  { id: 'efectiva', key: 'efectivas', pctKey: 'pctEfectivas', label: 'Efectivas', color: 'bg-emerald-500' },
  { id: 'errado', key: 'numeroErrado', pctKey: 'pctErrado', label: 'Número errado', color: 'bg-amber-400' },
];

function CanalCard({ titulo, icon: Icon, barra, onSegmento }) {
  const total = barra.personas || 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#1717AF]" />
          <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        </div>
        <span className="text-xs text-slate-400 tabular-nums">
          {(total || 0).toLocaleString('es-CO')} personas
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Sin contactos en este canal.</p>
      ) : (
        <>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-4">
            {TRAMOS.map((tramo) => {
              const width = barra[tramo.pctKey] || 0;
              if (width <= 0) return null;
              return (
                <button
                  key={tramo.id}
                  type="button"
                  title={tramo.label}
                  onClick={() => onSegmento?.(tramo.id)}
                  className={`${tramo.color} h-full transition-opacity hover:opacity-80`}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
          <div className="space-y-1.5">
            {TRAMOS.map((tramo) => (
              <button
                key={tramo.id}
                type="button"
                onClick={() => onSegmento?.(tramo.id)}
                className="w-full flex items-center gap-2 text-sm py-1 px-1 rounded-lg hover:bg-slate-50 text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${tramo.color}`} />
                <span className="flex-1 text-slate-600">{tramo.label}</span>
                <span className="tabular-nums text-slate-800 font-medium">
                  {(barra[tramo.key] || 0).toLocaleString('es-CO')}
                </span>
                <span className="tabular-nums text-slate-400 w-12 text-right">
                  {pct(barra[tramo.pctKey])}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            De {total.toLocaleString('es-CO')}, {barra.contestaronIncluye.toLocaleString('es-CO')} contestaron
            ({pct(barra.pctContestaron)}) y {barra.efectivas.toLocaleString('es-CO')} agendaron
            ({pct(barra.pctEfectivas)}).
          </p>
        </>
      )}
    </div>
  );
}

export default function ContactoCanalBars({ llamada, mensaje, onSegmento }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CanalCard
        titulo="Llamadas"
        icon={Phone}
        barra={llamada}
        onSegmento={(seg) => onSegmento?.(CANAL_LLAMADA, seg)}
      />
      <CanalCard
        titulo="WhatsApp"
        icon={MessageCircle}
        barra={mensaje}
        onSegmento={(seg) => onSegmento?.(CANAL_MENSAJE, seg)}
      />
    </div>
  );
}
