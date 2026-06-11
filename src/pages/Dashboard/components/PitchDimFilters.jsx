import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { ChevronDown, Check, Search, Briefcase, Users, Cake, MapPin, Globe, X } from 'lucide-react';

// Sentinela para valores nulos/vacíos (se muestra como "Sin X").
export const SIN_DATO = '__SIN__';

// Normaliza el valor de una dimensión: null/'' → SIN_DATO.
const norm = (v) => (v === null || v === undefined || String(v).trim() === '' ? SIN_DATO : String(v).trim());

// Configuración de las 5 dimensiones del análisis de Pitch.
//   key      → columna en leads (presente en vw_pitches_calendario vía l.*)
//   label    → nombre del filtro
//   sinLabel → etiqueta para el valor nulo
export const PITCH_DIMS = [
  { key: 'ocupacion', label: 'Profesión',     sinLabel: 'Sin profesión', icon: Briefcase },
  { key: 'sexo',      label: 'Género',         sinLabel: 'Sin género',    icon: Users },
  { key: 'edad',      label: 'Rango de edad',  sinLabel: 'Sin dato',      icon: Cake },
  { key: 'ciudad',    label: 'Ciudad',         sinLabel: 'Sin ciudad',    icon: MapPin },
  { key: 'pais',      label: 'País',           sinLabel: 'Sin país',      icon: Globe },
];

// Estado inicial vacío de las dimensiones (sin selección = sin filtro).
export const emptyPitchDims = () =>
  PITCH_DIMS.reduce((acc, d) => { acc[d.key] = []; return acc; }, {});

/**
 * Aplica el filtro de dimensiones a una fila (objeto con las columnas de leads).
 * Una dimensión sin selección no filtra. Para las seleccionadas, la fila pasa
 * solo si su valor normalizado está en la lista. Usado por PitchCalendar y
 * PitchKpis para mantener el mismo criterio que estos filtros.
 */
export const rowMatchesDims = (row, dims) => {
  if (!dims) return true;
  return PITCH_DIMS.every(d => {
    const sel = dims[d.key] || [];
    if (sel.length === 0) return true;
    return sel.includes(norm(row[d.key]));
  });
};

/**
 * Barra de 5 filtros facetados (Profesión, Género, Rango de edad, Ciudad,
 * País) para "Mis Pitch". Se alimenta de los pitches en el scope actual
 * (vw_pitches_calendario filtrado por rango + comercial + tags) y aplica
 * cross-filtering: las opciones de cada filtro se calculan respecto a las
 * selecciones YA aplicadas de los otros filtros.
 *
 * UX igual al filtro de Tags: checkboxes, "Seleccionar todos", buscador y
 * botones Cancelar/Filtrar (staged: no aplica hasta "Filtrar").
 */
export default function PitchDimFilters({
  rangeStart,
  rangeEnd,
  selectedComercial,
  userEmail,
  puedeVerTodos = false,
  tagFilter = [],
  value,
  onChange,
}) {
  const [rows, setRows] = useState([]);
  const [openKey, setOpenKey] = useState(null);
  const [pending, setPending] = useState([]); // selección staged del dropdown abierto
  const [search, setSearch] = useState('');

  // Carga los pitches en scope (misma lógica que PitchKpis/PitchCalendar).
  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    let cancelled = false;
    const load = async () => {
      try {
        let query = supabase.from('vw_pitches_calendario').select('*');
        if (selectedComercial) query = query.eq('comercial_email', selectedComercial);
        else if (!puedeVerTodos && userEmail) query = query.eq('comercial_email', userEmail);
        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);
        const filtered = (data || []).filter(p => {
          if (!p.fecha_pitch_calendario) return false;
          const m = p.fecha_pitch_calendario.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (!m) return false;
          const [, y, mo, d] = m;
          const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
          if (dt < start || dt > end) return false;
          if (tagFilter.length > 0 && !tagFilter.includes(p.label)) return false;
          return true;
        });
        setRows(filtered);
      } catch (e) {
        console.error('Error cargando filtros de análisis de Pitch:', e);
        if (!cancelled) setRows([]);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rangeStart?.getTime(),
    rangeEnd?.getTime(),
    selectedComercial,
    userEmail,
    puedeVerTodos,
    tagFilter.join('|'),
  ]);

  // Cerrar el dropdown abierto al hacer clic fuera de cualquier filtro de dim.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.pitch-dim-filter')) setOpenKey(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Opciones facetadas para una dimensión: distintos valores (con conteo)
  // entre las filas que cumplen las selecciones APLICADAS de las otras dims.
  const optionsFor = (dimKey) => {
    const base = rows.filter(r =>
      PITCH_DIMS.every(d => {
        if (d.key === dimKey) return true;
        const sel = value[d.key] || [];
        if (sel.length === 0) return true;
        return sel.includes(norm(r[d.key]));
      })
    );
    const counts = new Map();
    for (const r of base) {
      const v = norm(r[dimKey]);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([v, c]) => ({ value: v, count: c }))
      .sort((a, b) => {
        if (a.value === SIN_DATO) return 1;
        if (b.value === SIN_DATO) return -1;
        return a.value.localeCompare(b.value, 'es', { sensitivity: 'base' });
      });
  };

  const labelForOption = (dim, optValue) =>
    optValue === SIN_DATO ? dim.sinLabel : optValue;

  const openDropdown = (dimKey) => {
    if (openKey === dimKey) { setOpenKey(null); return; }
    setOpenKey(dimKey);
    setPending(value[dimKey] || []);
    setSearch('');
  };

  const applyFilter = (dimKey) => {
    onChange({ ...value, [dimKey]: pending });
    setOpenKey(null);
  };
  const cancelFilter = () => setOpenKey(null);
  const clearDim = (dimKey, e) => {
    e.stopPropagation();
    onChange({ ...value, [dimKey]: [] });
  };

  return (
    <>
      {PITCH_DIMS.map(dim => {
        const Icon = dim.icon;
        const applied = value[dim.key] || [];
        const isOpen = openKey === dim.key;
        const options = isOpen ? optionsFor(dim.key) : [];
        const visibleOptions = options.filter(o =>
          labelForOption(dim, o.value).toLowerCase().includes(search.toLowerCase())
        );
        const allValues = options.map(o => o.value);
        const allSelected = allValues.length > 0 && allValues.every(v => pending.includes(v));

        const togglePending = (v) => {
          setPending(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
        };
        const toggleAll = () => setPending(allSelected ? [] : allValues);

        return (
          <div key={dim.key} className="relative pitch-dim-filter">
            <button
              type="button"
              onClick={() => openDropdown(dim.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                applied.length > 0
                  ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
              }`}
            >
              <Icon size={16} />
              <span className="max-w-[160px] truncate">
                {applied.length > 0 ? `${dim.label} (${applied.length})` : dim.label}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              {applied.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => clearDim(dim.key, e)}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/20"
                  aria-label={`Limpiar ${dim.label}`}
                >
                  <X size={12} />
                </button>
              )}
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 flex flex-col" style={{ maxHeight: '440px' }}>
                {/* Buscador */}
                <div className="px-3 pb-2 border-b border-slate-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Buscar ${dim.label.toLowerCase()}...`}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1717AF]/30 focus:border-[#1717AF]"
                    />
                  </div>
                </div>

                {/* Seleccionar / Deseleccionar todos */}
                <button
                  onClick={toggleAll}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
                    allSelected ? 'bg-[#1717AF]/5 text-[#1717AF] font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    allSelected ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
                  }`}>
                    {allSelected && <Check size={10} className="text-white" />}
                  </div>
                  {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <div className="h-px bg-slate-100 my-1" />

                {/* Lista de opciones */}
                <div className="flex-1 overflow-y-auto">
                  {visibleOptions.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400 text-center">Sin opciones</p>
                  ) : (
                    visibleOptions.map(opt => {
                      const isChecked = pending.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => togglePending(opt.value)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5 ${
                            isChecked ? 'bg-[#1717AF]/5 text-[#1717AF] font-medium' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check size={10} className="text-white" />}
                          </div>
                          <span className={`flex-1 truncate ${opt.value === SIN_DATO ? 'italic text-slate-400' : ''}`}>
                            {labelForOption(dim, opt.value)}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">{opt.count}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer Cancelar / Filtrar */}
                <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-end gap-2">
                  <button
                    onClick={cancelFilter}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => applyFilter(dim.key)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1717AF] text-white hover:bg-[#02214A] transition-colors shadow-sm"
                  >
                    Filtrar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
