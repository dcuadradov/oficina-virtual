import { useEffect, useState } from 'react';
import { Briefcase, Cake, Check, ChevronDown, Globe, Search, Tag, Users, X } from 'lucide-react';
import { formatoConteoLeads } from '../../paisFilter';
import { SIN_DATO } from './informeFiltros';

const DIMS = [
  {
    key: 'ocupacion',
    label: 'Ocupación',
    todos: 'Todas las ocupaciones',
    placeholder: 'Buscar ocupación...',
    sinLabel: 'Sin ocupación',
    icon: Briefcase,
  },
  {
    key: 'label',
    label: 'Tags',
    todos: 'Todos los tags',
    placeholder: 'Buscar tag...',
    sinLabel: 'Sin tag',
    icon: Tag,
  },
  {
    key: 'fuente_dato',
    label: 'Fuente',
    todos: 'Todas las fuentes',
    placeholder: 'Buscar fuente...',
    sinLabel: 'Sin fuente',
    icon: Globe,
  },
  {
    key: 'sexo',
    label: 'Género',
    todos: 'Todos los géneros',
    placeholder: 'Buscar género...',
    sinLabel: 'Sin género',
    icon: Users,
  },
  {
    key: 'edad',
    label: 'Rango de edad',
    todos: 'Todos los rangos',
    placeholder: 'Buscar rango...',
    sinLabel: 'Sin dato',
    icon: Cake,
  },
];

function normalizar(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function InformeFacetFilters({
  value = {},
  options = {},
  onChange,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.informe-facet-filter')) setOpenKey(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openDropdown = (key, e) => {
    e.stopPropagation();
    setOpenKey((current) => (current === key ? null : key));
    setBusqueda('');
  };

  const setSelected = (key, next) => {
    onChange?.(key, next);
  };

  return (
    <>
      {DIMS.map((dim) => {
        const Icon = dim.icon;
        const selected = Array.isArray(value[dim.key]) ? value[dim.key] : [];
        const isOpen = openKey === dim.key;
        const term = normalizar(busqueda.trim());
        const etiqueta = (value) => (value === SIN_DATO ? dim.sinLabel : value);
        const visibles = (options[dim.key] || []).filter((item) => (
          !term || normalizar(etiqueta(item.value)).includes(term)
        ));

        return (
          <div key={dim.key} className="relative informe-facet-filter">
            <button
              type="button"
              onClick={(e) => openDropdown(dim.key, e)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selected.length > 0
                  ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
              }`}
            >
              <Icon size={16} />
              <span className="max-w-[160px] truncate">
                {selected.length > 0 ? `${dim.label} (${selected.length})` : dim.label}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(dim.key, []);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/20"
                  aria-label={`Limpiar ${dim.label}`}
                >
                  <X size={12} />
                </button>
              )}
            </button>

            {isOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 flex flex-col overflow-hidden"
                style={{ maxHeight: '320px' }}
              >
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={dim.placeholder}
                      autoFocus
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1717AF]/30 focus:border-[#1717AF]"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto py-1">
                  {!busqueda.trim() && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelected(dim.key, [])}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          selected.length === 0
                            ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {dim.todos}
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                    </>
                  )}
                  {visibles.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400 text-center">Sin resultados</p>
                  ) : (
                    visibles.map((item) => {
                      const isChecked = selected.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelected(
                              dim.key,
                              isChecked
                                ? selected.filter((v) => v !== item.value)
                                : [...selected, item.value],
                            );
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
                            isChecked
                              ? 'bg-[#1717AF]/5 text-[#1717AF] font-medium'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked ? 'bg-[#1717AF] border-[#1717AF]' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check size={10} className="text-white" />}
                          </div>
                          <span className={`truncate ${item.value === SIN_DATO ? 'italic text-slate-400' : ''}`}>
                            {etiqueta(item.value)}
                          </span>
                          <span className={`ml-auto shrink-0 tabular-nums text-xs ${isChecked ? 'text-[#1717AF]/70' : 'text-slate-400'}`}>
                            ({formatoConteoLeads(item.count)})
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
