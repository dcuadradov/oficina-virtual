import { useEffect, useState } from 'react';
import { ChevronDown, UserPlus } from 'lucide-react';
import { COHORTE_OPCIONES, COHORTE_TODOS } from './contactoReglas';

export default function ContactoCohorteFilter({ value = COHORTE_TODOS, onChange }) {
  const [open, setOpen] = useState(false);
  const actual = COHORTE_OPCIONES.find((opt) => opt.id === value) || COHORTE_OPCIONES[0];
  const activo = value !== COHORTE_TODOS;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.contacto-cohorte-filter')) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative contacto-cohorte-filter">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
          activo
            ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
        }`}
      >
        <UserPlus size={16} />
        <span>{value === COHORTE_TODOS ? 'Nuevos / En gestión' : actual.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {COHORTE_OPCIONES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange?.(opt.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.id === value
                  ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
