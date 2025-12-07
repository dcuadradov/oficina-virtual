import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar, CalendarRange, ChevronDown, X, Search } from 'lucide-react';

/**
 * Genera periodos de martes a martes para un rango de fechas (solo hasta el actual)
 * @param {number} monthsBack - Meses hacia atrás
 * @returns {Array} Lista de periodos
 */
const generateTuesdayPeriods = (monthsBack = 6) => {
  const periods = [];
  const today = new Date();
  
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - monthsBack);
  
  // Ajustar al primer martes del rango
  const startDay = startDate.getDay();
  const daysToTuesday = startDay <= 2 ? 2 - startDay : 9 - startDay;
  startDate.setDate(startDate.getDate() + daysToTuesday);
  
  let currentStart = new Date(startDate);
  
  // Solo generar hasta el periodo que contiene hoy (no futuros)
  while (currentStart <= today) {
    const periodEnd = new Date(currentStart);
    periodEnd.setDate(periodEnd.getDate() + 6); // Hasta el lunes siguiente (7 días - 1)
    
    const formatDate = (date) => {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short'
      });
    };
    
    const formatDateISO = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    periods.push({
      value: `${formatDateISO(currentStart)}_${formatDateISO(periodEnd)}`,
      label: `${formatDate(currentStart)} - ${formatDate(periodEnd)}`,
      start: new Date(currentStart),
      end: new Date(periodEnd),
      year: currentStart.getFullYear()
    });
    
    // Siguiente martes
    currentStart.setDate(currentStart.getDate() + 7);
  }
  
  return periods.reverse(); // Más recientes primero
};

/**
 * Genera opciones de meses para los últimos N meses
 * @param {number} monthsBack - Número de meses hacia atrás
 * @returns {Array} Lista de meses
 */
const generateMonthOptions = (monthsBack = 12) => {
  const months = [];
  const today = new Date();
  
  for (let i = 0; i <= monthsBack; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    
    months.push({
      value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
      month: date.getMonth(),
      year: year
    });
  }
  
  return months;
};

const DashboardFilters = ({
  comerciales = [],
  selectedComercial,
  onComercialChange,
  selectedMes,
  onMesChange,
  selectedPeriodo,
  onPeriodoChange,
  showComercialFilter = false,
  searchQuery = '',
  onSearchChange
}) => {
  const [comercialOpen, setComercialOpen] = useState(false);
  const [mesOpen, setMesOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchTimeoutRef = useRef(null);

  // Debounce para la búsqueda (esperar 400ms después de dejar de escribir)
  const handleSearchChange = (value) => {
    setLocalSearch(value);
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Crear nuevo timeout
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 400);
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Generar opciones
  const monthOptions = useMemo(() => generateMonthOptions(12), []);
  const periodOptions = useMemo(() => generateTuesdayPeriods(6, 4), []);

  // Encontrar el periodo actual (el que contiene la fecha de hoy)
  const currentPeriod = useMemo(() => {
    const today = new Date();
    return periodOptions.find(p => today >= p.start && today <= p.end);
  }, [periodOptions]);

  // Encontrar el mes actual
  const currentMonth = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        setComercialOpen(false);
        setMesOpen(false);
        setPeriodoOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Obtener label del comercial seleccionado
  const selectedComercialLabel = comerciales.find(c => c.email === selectedComercial)?.nombre || 'Todos los comerciales';
  
  // Obtener label del mes seleccionado
  const selectedMesLabel = monthOptions.find(m => m.value === selectedMes)?.label || 'Todos los meses';
  
  // Obtener label del periodo seleccionado
  const selectedPeriodoLabel = periodOptions.find(p => p.value === selectedPeriodo)?.label || 'Todos los periodos';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Campo de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-slate-400" />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar lead..."
          className={`pl-9 pr-8 py-2.5 w-56 rounded-xl text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 ${
            localSearch
              ? 'border-[#1717AF] bg-[#1717AF]/5 text-slate-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch('');
              onSearchChange?.('');
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtro de Comercial (solo si tiene permiso) */}
      {showComercialFilter && comerciales.length > 0 && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setComercialOpen(!comercialOpen);
              setMesOpen(false);
              setPeriodoOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedComercial
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <Users size={16} />
            <span className="max-w-[150px] truncate">{selectedComercialLabel}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${comercialOpen ? 'rotate-180' : ''}`} />
            {selectedComercial && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComercialChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {comercialOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onComercialChange(null);
                  setComercialOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !selectedComercial 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos los comerciales
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {comerciales.map((comercial) => (
                <button
                  key={comercial.email}
                  onClick={() => {
                    onComercialChange(comercial.email);
                    setComercialOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedComercial === comercial.email
                      ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{comercial.nombre}</div>
                  <div className="text-xs text-slate-400 truncate">{comercial.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtro de Mes */}
      <div className="relative filter-dropdown">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMesOpen(!mesOpen);
            setComercialOpen(false);
            setPeriodoOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
            selectedMes
              ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
              : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
          }`}
        >
          <Calendar size={16} />
          <span>{selectedMesLabel}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${mesOpen ? 'rotate-180' : ''}`} />
          {selectedMes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMesChange(null);
              }}
              className="ml-1 p-0.5 rounded-full hover:bg-white/20"
            >
              <X size={12} />
            </button>
          )}
        </button>
        
        {mesOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
            <button
              onClick={() => {
                onMesChange(null);
                setMesOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                !selectedMes 
                  ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos los meses
            </button>
            <div className="h-px bg-slate-100 my-1" />
            {monthOptions.map((month) => {
              const isCurrentMonth = month.value === currentMonth;
              return (
                <button
                  key={month.value}
                  onClick={() => {
                    onMesChange(month.value);
                    setMesOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    selectedMes === month.value
                      ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{month.label}</span>
                  {isCurrentMonth && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Actual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtro de Periodo (Martes a Martes) */}
      <div className="relative filter-dropdown">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPeriodoOpen(!periodoOpen);
            setComercialOpen(false);
            setMesOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
            selectedPeriodo
              ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
              : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
          }`}
        >
          <CalendarRange size={16} />
          <span>{selectedPeriodoLabel}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${periodoOpen ? 'rotate-180' : ''}`} />
          {selectedPeriodo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPeriodoChange(null);
              }}
              className="ml-1 p-0.5 rounded-full hover:bg-white/20"
            >
              <X size={12} />
            </button>
          )}
        </button>
        
        {periodoOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
            <button
              onClick={() => {
                onPeriodoChange(null);
                setPeriodoOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                !selectedPeriodo 
                  ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos los periodos
            </button>
            <div className="h-px bg-slate-100 my-1" />
            
            {/* Agrupar por año */}
            {Array.from(new Set(periodOptions.map(p => p.year))).map(year => (
              <div key={year}>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
                  {year}
                </div>
                {periodOptions.filter(p => p.year === year).map((period) => {
                  const isCurrent = currentPeriod?.value === period.value;
                  return (
                    <button
                      key={period.value}
                      onClick={() => {
                        onPeriodoChange(period.value);
                        setPeriodoOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        selectedPeriodo === period.value
                          ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{period.label}</span>
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          Actual
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFilters;
