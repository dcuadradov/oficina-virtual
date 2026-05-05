import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import Slot01_LeadsCreadosMes from './slots/Slot01_LeadsCreadosMes';
import Slot02_FuentesLeads from './slots/Slot02_FuentesLeads';
import { MESES_LARGOS } from './data/leadsHistoricos';

// Inicio de los meses disponibles en el dropdown del informe.
// Antes de esta fecha no había información comparable.
const MES_MIN = '2026-03';

function formatMesLabel(mesKey) {
  const [year, mm] = mesKey.split('-');
  const idx = parseInt(mm, 10) - 1;
  return `${MESES_LARGOS[idx]} ${year}`;
}

// Mes actual del calendario (formato 'YYYY-MM'), igual que el filtro de Gestión.
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Genera todos los meses del calendario desde fromKey hasta toKey (inclusive).
function generarMesesCalendario(fromKey, toKey) {
  const result = [];
  let [y, m] = fromKey.split('-').map(Number);
  const [yEnd, mEnd] = toKey.split('-').map(Number);
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

export default function Informe({ monthConfigs }) {
  const [selectedMes, setSelectedMes] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Opciones del dropdown: meses del calendario desde MES_MIN hasta el mes en curso,
  // ordenados de más reciente a más antiguo. (Igual que el filtro de Gestión.)
  const opciones = useMemo(() => {
    return generarMesesCalendario(MES_MIN, getCurrentMonthKey())
      .sort((a, b) => b.localeCompare(a));
  }, []);

  // Default: mes en curso del calendario.
  useEffect(() => {
    if (selectedMes) return;
    setSelectedMes(getCurrentMonthKey());
  }, [selectedMes]);

  // Cerrar dropdown al click fuera.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="space-y-6">
      {/* Header con dropdown global de mes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Informe</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona un mes para ver el detalle del periodo.
          </p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Calendar size={16} className="text-slate-400" />
            {selectedMes ? formatMesLabel(selectedMes) : 'Seleccionar mes'}
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-auto">
              {opciones.length ? opciones.map(mesKey => {
                const isActive = mesKey === selectedMes;
                return (
                  <button
                    key={mesKey}
                    type="button"
                    onClick={() => { setSelectedMes(mesKey); setOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-[#1717AF]/10 text-[#1717AF] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {formatMesLabel(mesKey)}
                  </button>
                );
              }) : (
                <div className="px-4 py-3 text-xs text-slate-400">Sin meses configurados.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slot 1 */}
      <Slot01_LeadsCreadosMes
        selectedMes={selectedMes}
        monthConfigs={monthConfigs}
      />

      {/* Slot 2 */}
      <Slot02_FuentesLeads
        selectedMes={selectedMes}
        monthConfigs={monthConfigs}
      />

      {/* Próximos slots aquí */}
    </div>
  );
}
