import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar, CalendarRange, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X, Search, MessageSquare, Tag } from 'lucide-react';

/**
 * Determina si un usuario está conectado basado en su última conexión
 * @param {string} ultimaConexion - Timestamp de última conexión
 * @returns {boolean} true si conectado (menos de 2 minutos)
 */
const isUserOnline = (ultimaConexion) => {
  if (!ultimaConexion) return false;
  const lastConnection = new Date(ultimaConexion);
  const now = new Date();
  const diffMinutes = (now - lastConnection) / (1000 * 60);
  return diffMinutes < 2;
};

/**
 * Formatea la última conexión de manera legible
 * @param {string} ultimaConexion - Timestamp de última conexión
 * @returns {string} Texto formateado
 */
const formatLastConnection = (ultimaConexion) => {
  if (!ultimaConexion) return 'Sin datos';
  
  const lastConnection = new Date(ultimaConexion);
  const now = new Date();
  const diffMs = now - lastConnection;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMinutes = diffMinutes % 60;
  
  if (diffMinutes < 2) {
    return 'Conectado ahora';
  }
  
  // Formatear tiempo transcurrido
  let tiempoTranscurrido = '';
  if (diffDays >= 1) {
    // Más de 24 horas: mostrar días, horas y minutos
    tiempoTranscurrido = `${diffDays} día${diffDays > 1 ? 's' : ''}, ${remainingHours}h y ${remainingMinutes}min`;
  } else if (diffHours >= 1) {
    // Entre 1 y 24 horas: mostrar horas y minutos
    tiempoTranscurrido = `${diffHours}h y ${remainingMinutes}min`;
  } else {
    // Menos de 1 hora: solo minutos
    tiempoTranscurrido = `${diffMinutes}min`;
  }
  
  return `Inactivo. Última conexión hace ${tiempoTranscurrido}`;
};

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
  selectedDia,
  onDiaChange,
  selectedCategoria,
  onCategoriaChange,
  categorias = [],
  selectedTag,
  onTagChange,
  tags = [],
  showComercialFilter = false,
  showOnlyComercial = false,
  searchQuery = '',
  onSearchChange
}) => {
  const [comercialOpen, setComercialOpen] = useState(false);
  const [mesOpen, setMesOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [diaOpen, setDiaOpen] = useState(false);
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
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
        setDiaOpen(false);
        setCategoriaOpen(false);
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
  
  // Obtener label del día seleccionado
  const selectedDiaLabel = useMemo(() => {
    if (!selectedDia) return 'Todos los días';
    const date = new Date(selectedDia + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  }, [selectedDia]);

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Día de la semana del primer día (0 = domingo, ajustar para lunes = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days = [];
    
    // Días del mes anterior para completar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Días del mes actual
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        day: d,
        isCurrentMonth: true,
        date: new Date(year, month, d)
      });
    }
    
    // Días del siguiente mes para completar la última semana
    const remainingDays = 42 - days.length; // 6 filas x 7 días
    for (let d = 1; d <= remainingDays; d++) {
      days.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(year, month + 1, d)
      });
    }
    
    return days;
  }, [calendarMonth]);

  // Verificar si una fecha es hoy
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Verificar si una fecha es futura
  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  // Verificar si una fecha es la seleccionada
  const isSelectedDate = (date) => {
    if (!selectedDia) return false;
    const selected = new Date(selectedDia + 'T12:00:00');
    return date.getDate() === selected.getDate() && 
           date.getMonth() === selected.getMonth() && 
           date.getFullYear() === selected.getFullYear();
  };

  // Formatear fecha para el value
  const formatDateValue = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Campo de búsqueda - oculto si showOnlyComercial */}
      {!showOnlyComercial && (
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
      )}

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
              {comerciales.map((comercial) => {
                const online = isUserOnline(comercial.ultima_conexion);
                const connectionStatus = formatLastConnection(comercial.ultima_conexion);
                return (
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
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="font-medium">{comercial.nombre}</span>
                    </div>
                    <div className={`text-xs ml-4 ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {connectionStatus}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtro de Mes - oculto si showOnlyComercial */}
      {!showOnlyComercial && (
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
      )}

      {/* Filtro de Periodo (Martes a Martes) - oculto si showOnlyComercial */}
      {!showOnlyComercial && (
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
      )}

      {/* Filtro de Día con Calendario - oculto si showOnlyComercial */}
      {!showOnlyComercial && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDiaOpen(!diaOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              // Resetear calendario al mes actual o al mes del día seleccionado
              if (selectedDia) {
                setCalendarMonth(new Date(selectedDia + 'T12:00:00'));
              } else {
                setCalendarMonth(new Date());
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedDia
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <CalendarDays size={16} />
            <span>{selectedDiaLabel}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${diaOpen ? 'rotate-180' : ''}`} />
            {selectedDia && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDiaChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {diaOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
              {/* Header del calendario */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  {calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                    // No permitir ir a meses futuros
                    if (nextMonth <= new Date()) {
                      setCalendarMonth(nextMonth);
                    }
                  }}
                  disabled={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1) > new Date()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1) > new Date()
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayInfo, index) => {
                  const isFuture = isFutureDate(dayInfo.date);
                  const isSelected = isSelectedDate(dayInfo.date);
                  const isTodayDate = isToday(dayInfo.date);
                  
                  return (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFuture && dayInfo.isCurrentMonth) {
                          onDiaChange(formatDateValue(dayInfo.date));
                          setDiaOpen(false);
                        }
                      }}
                      disabled={isFuture || !dayInfo.isCurrentMonth}
                      className={`
                        w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200
                        ${!dayInfo.isCurrentMonth ? 'text-slate-300 cursor-not-allowed' : ''}
                        ${isFuture && dayInfo.isCurrentMonth ? 'text-slate-300 cursor-not-allowed' : ''}
                        ${dayInfo.isCurrentMonth && !isFuture && !isSelected && !isTodayDate ? 'text-slate-700 hover:bg-slate-100' : ''}
                        ${isTodayDate && !isSelected ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : ''}
                        ${isSelected ? 'bg-[#1717AF] text-white shadow-md shadow-[#1717AF]/30' : ''}
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  );
                })}
              </div>
              
              {/* Botones de acción rápida */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDiaChange(null);
                    setDiaOpen(false);
                  }}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Todos los días
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const today = new Date();
                    onDiaChange(formatDateValue(today));
                    setDiaOpen(false);
                  }}
                  className="flex-1 py-2 text-xs font-medium text-[#1717AF] bg-[#1717AF]/10 hover:bg-[#1717AF]/20 rounded-lg transition-colors"
                >
                  Hoy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtro de Categoría de Seguimiento - oculto si showOnlyComercial */}
      {!showOnlyComercial && categorias.length > 0 && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCategoriaOpen(!categoriaOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedCategoria
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <MessageSquare size={16} />
            <span className="max-w-[150px] truncate">
              {selectedCategoria || 'Categoría seguimiento'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${categoriaOpen ? 'rotate-180' : ''}`} />
            {selectedCategoria && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCategoriaChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {categoriaOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onCategoriaChange(null);
                  setCategoriaOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !selectedCategoria 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas las categorías
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onCategoriaChange(cat.categoria);
                    setCategoriaOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedCategoria === cat.categoria
                      ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.categoria}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtro por Tag */}
      {tags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => {
              setTagOpen(!tagOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
              setCategoriaOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedTag
                ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-600'
            }`}
          >
            <Tag size={16} />
            <span className="max-w-[150px] truncate">
              {selectedTag || 'Tags'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${tagOpen ? 'rotate-180' : ''}`} />
            {selectedTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTagChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {tagOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onTagChange(null);
                  setTagOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !selectedTag 
                    ? 'bg-violet-100 text-violet-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos los tags
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onTagChange(tag);
                    setTagOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    selectedTag === tag
                      ? 'bg-violet-100 text-violet-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Tag size={12} />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
