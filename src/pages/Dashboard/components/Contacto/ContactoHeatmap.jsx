import { DIAS_SEMANA, HORAS_HEATMAP } from './contactoReglas';

const PESTANAS = [
  { id: 'contestaron', label: 'Contestaron' },
  { id: 'agendaron', label: 'Agendaron' },
  { id: 'no_contestaron', label: 'No contestaron' },
];

const CANALES = [
  { id: 'llamada', label: 'Llamada' },
  { id: 'mensaje', label: 'WhatsApp' },
  { id: 'ambos', label: 'Ambos' },
];

function colorCelda(pestana, intensidad) {
  if (intensidad <= 0) return 'bg-slate-50';
  if (pestana === 'agendaron') return 'bg-emerald-500';
  if (pestana === 'no_contestaron') return 'bg-slate-500';
  return 'bg-[#1717AF]';
}

function etiquetaHora(hora) {
  const h = hora % 12 === 0 ? 12 : hora % 12;
  return `${h}${hora < 12 ? 'a' : 'p'}`;
}

export default function ContactoHeatmap({
  celdas = [],
  pestana,
  canal,
  onPestana,
  onCanal,
  onCelda,
}) {
  const max = Math.max(1, ...celdas.map((c) => c.intentos || 0));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">A qué hora contestan</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Intentos por hora Colombia. El país y el comercial salen de los filtros.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPestana?.(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  pestana === p.id ? 'bg-[#1717AF] text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {CANALES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCanal?.(c.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  canal === c.id ? 'bg-white text-[#1717AF] shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 min-w-[640px]">
          <thead>
            <tr>
              <th className="w-10" />
              {HORAS_HEATMAP.map((hora) => (
                <th key={hora} className="text-[10px] font-medium text-slate-400 text-center">
                  {etiquetaHora(hora)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIAS_SEMANA.map((dia) => (
              <tr key={dia.id}>
                <td className="text-[11px] text-slate-500 pr-1">{dia.label}</td>
                {HORAS_HEATMAP.map((hora) => {
                  const cell = celdas.find((c) => c.dia === dia.id && c.hora === hora);
                  const intentos = cell?.intentos || 0;
                  const intensidad = intentos / max;
                  return (
                    <td key={`${dia.id}-${hora}`}>
                      <button
                        type="button"
                        disabled={!intentos}
                        onClick={() => intentos && onCelda?.(cell)}
                        title={
                          intentos
                            ? `${dia.label} ${hora}:00 · ${intentos} intentos · ${cell.personas} personas`
                            : undefined
                        }
                        className={`w-full h-7 rounded-sm ${colorCelda(pestana, intensidad)} disabled:cursor-default`}
                        style={{ opacity: intentos ? 0.18 + intensidad * 0.82 : 1 }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        Más oscuro = más intentos. Clic en una celda abre esas personas.
      </p>
    </div>
  );
}
