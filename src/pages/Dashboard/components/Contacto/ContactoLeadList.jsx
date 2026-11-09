import { X } from 'lucide-react';

export default function ContactoLeadList({ titulo, filas = [], onClose, onOpenLead }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
          <p className="text-xs text-slate-400">{filas.length.toLocaleString('es-CO')} personas</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
      {filas.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No hay personas en este recorte.</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
          {filas.map((fila, i) => (
            <button
              key={`${fila.lead_id}-${fila.fecha || ''}-${fila.resultado || ''}-${i}`}
              type="button"
              onClick={() => onOpenLead?.(fila.lead_id)}
              className="w-full flex items-center gap-3 py-2 px-1 text-left hover:bg-slate-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{fila.nombre}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {fila.autorNombre || fila.autor_email || 'Sin autor'}
                  {fila.hora != null ? ` · ${fila.hora}:00` : ''}
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 tabular-nums flex-shrink-0">
                {fila.resultado || ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
