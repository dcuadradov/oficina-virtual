import { DIAS_SEMANA, HORAS_HEATMAP, PESTANAS_HEATMAP } from './contactoReglas';

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
  capas = [],
  canal,
  onCanal,
  onCelda,
}) {
  const capasVisibles = capas.length ? capas : PESTANAS_HEATMAP.map((p) => ({ ...p, celdas: [], max: 1 }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">A qué hora llaman y contestan</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tres capas por día. Si a las 9a no hay nada en ninguna, no llamaron a esa hora.
          </p>
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

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-x-1 border-spacing-y-0.5 min-w-[720px]">
          <thead>
            <tr>
              <th className="w-10" />
              <th className="w-[4.25rem]" />
              {HORAS_HEATMAP.map((hora) => (
                <th key={hora} className="text-[10px] font-medium text-slate-400 text-center pb-1">
                  {etiquetaHora(hora)}
                </th>
              ))}
            </tr>
          </thead>
          {DIAS_SEMANA.map((dia) => (
            <tbody
              key={dia.id}
              className={
                dia.id % 2 === 0
                  ? '[&>tr:not(:last-child)>td]:bg-slate-50/80'
                  : undefined
              }
            >
              {capasVisibles.map((capa, i) => (
                <tr key={`${dia.id}-${capa.id}`}>
                  {i === 0 && (
                    <td
                      rowSpan={capasVisibles.length}
                      className={`text-[11px] font-medium text-slate-600 pl-2 pr-1 align-middle border-l-2 ${
                        dia.id % 2 === 0 ? 'border-slate-200' : 'border-slate-100'
                      }`}
                    >
                      {dia.label}
                    </td>
                  )}
                  <td
                    className={`text-[9px] text-slate-400 pr-1 whitespace-nowrap align-middle ${
                      i === 0 ? 'pt-1.5' : i === capasVisibles.length - 1 ? 'pb-1.5' : ''
                    }`}
                  >
                    {capa.short}
                  </td>
                  {HORAS_HEATMAP.map((hora) => {
                    const cell = capa.celdas.find((c) => c.dia === dia.id && c.hora === hora);
                    const intentos = cell?.intentos || 0;
                    const intensidad = intentos / (capa.max || 1);
                    return (
                      <td
                        key={`${dia.id}-${capa.id}-${hora}`}
                        className={
                          i === 0 ? 'pt-1.5' : i === capasVisibles.length - 1 ? 'pb-1.5' : undefined
                        }
                      >
                        <button
                          type="button"
                          disabled={!intentos}
                          onClick={() => intentos && onCelda?.({ ...cell, pestana: capa.id })}
                          title={
                            intentos
                              ? `${dia.label} ${hora}:00 · ${capa.label} · ${intentos} intentos · ${cell.personas} personas`
                              : `${dia.label} ${hora}:00 · ${capa.label} · 0`
                          }
                          className={`w-full h-3.5 rounded-sm ${colorCelda(capa.id, intensidad)} disabled:cursor-default`}
                          style={{ opacity: intentos ? 0.18 + intensidad * 0.82 : 1 }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td
                  colSpan={2 + HORAS_HEATMAP.length}
                  className="p-0 h-2"
                >
                  <div className="h-px bg-slate-200 mx-0.5" />
                </td>
              </tr>
            </tbody>
          ))}
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-400">
        {PESTANAS_HEATMAP.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${colorCelda(p.id, 1)}`} />
            {p.label}
          </span>
        ))}
        <span>Cada capa se pinta contra su máximo. Clic abre esas personas.</span>
      </div>
    </div>
  );
}
