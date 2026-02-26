import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar, CalendarRange, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X, Search, MessageSquare, Tag, Loader2, Globe, UserPlus } from 'lucide-react';

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
  selectedFuente,
  onFuenteChange,
  fuentes = [],
  selectedReferido,
  onReferidoChange,
  referidos = [],
  showComercialFilter = false,
  showOnlyComercial = false,
  searchQuery = '',
  onSearchChange,
  onRefreshComerciales
}) => {
  const [comercialOpen, setComercialOpen] = useState(false);
  const [mesOpen, setMesOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [diaOpen, setDiaOpen] = useState(false);
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [fuenteOpen, setFuenteOpen] = useState(false);
  const [referidoOpen, setReferidoOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchTimeoutRef = useRef(null);
  
  // Estados para configuración de comerciales
  const [updatingComercial, setUpdatingComercial] = useState(null); // card_id del comercial que se está actualizando
  const [performanceDropdownOpen, setPerformanceDropdownOpen] = useState(null); // card_id del dropdown abierto
  const [toastMessage, setToastMessage] = useState(null);
  
  // Opciones de performance (colores igual que en Métricas)
  const performanceOptions = [
    { value: 'Top', label: 'Top', color: 'emerald', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { value: 'Successful', label: 'Successful', color: 'orange', bg: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    { value: 'Low', label: 'Low', color: 'violet', bg: 'bg-violet-500', bgLight: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' }
  ];
  
  // Función para actualizar configuración del comercial via webhook
  const handleComercialConfigUpdate = async (comercial, tipo, valor) => {
    if (!comercial?.card_id) return;
    
    setUpdatingComercial(`${comercial.card_id}-${tipo}`);
    
    try {
      // Para disponibilidad, convertir boolean a "Activo"/"Inactivo"
      const valorFinal = tipo === 'disponibilidad' 
        ? (valor ? 'Activo' : 'Inactivo') 
        : valor;
      
      const response = await fetch('https://api.mdenglish.us/webhook/cambiar_de_estado_a_los_comerciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: comercial.card_id,
          tipo: tipo, // 'disponibilidad' o 'performance'
          valor: valorFinal
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar');
      }
      
      const result = await response.json();
      
      if (result) {
        // Refrescar lista de comerciales
        onRefreshComerciales?.();
        
        // Mostrar toast de éxito
        const mensaje = tipo === 'disponibilidad' 
          ? `${comercial.nombre} ahora está ${valorFinal}`
          : `Performance de ${comercial.nombre} actualizado a ${valorFinal}`;
        setToastMessage(mensaje);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error actualizando comercial:', error);
      setToastMessage('Error al actualizar configuración');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setUpdatingComercial(null);
      setPerformanceDropdownOpen(null);
    }
  };

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
        setTagOpen(false);
        setFuenteOpen(false);
        setReferidoOpen(false);
        setPerformanceDropdownOpen(null);
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
            <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 max-h-[480px] overflow-y-auto">
              {/* Header con título */}
              <div className="px-4 pb-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700">Configuración de Comerciales</h4>
                <p className="text-xs text-slate-400 mt-0.5">Gestiona disponibilidad y performance</p>
              </div>
              
              {/* Opción "Todos los comerciales" */}
              <button
                onClick={() => {
                  onComercialChange(null);
                  setComercialOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors mt-2 ${
                  !selectedComercial 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>Todos los comerciales</span>
                </div>
              </button>
              <div className="h-px bg-slate-100 my-2" />
              
              {/* Lista de comerciales con controles */}
              <div className="space-y-1">
                {comerciales.map((comercial, index) => {
                  const online = isUserOnline(comercial.ultima_conexion);
                  const connectionStatus = formatLastConnection(comercial.ultima_conexion);
                  // Manejar disponibilidad como string ("Activo"/"Inactivo") o boolean, default: Activo
                  const isDisponible = comercial.disponibilidad === 'Inactivo' ? false : 
                                       comercial.disponibilidad === false ? false : true;
                  const currentPerformance = comercial.performance || 'Top'; // Default Top
                  const performanceOption = performanceOptions.find(p => p.value === currentPerformance) || performanceOptions[0];
                  const isUpdatingDisp = updatingComercial === `${comercial.card_id}-disponibilidad`;
                  const isUpdatingPerf = updatingComercial === `${comercial.card_id}-performance`;
                  // Si es uno de los últimos 2 comerciales, abrir dropdown hacia arriba
                  const isNearBottom = index >= comerciales.length - 2;
                  
                  return (
                    <div
                      key={comercial.email}
                      className={`px-4 py-3 transition-colors ${
                        selectedComercial === comercial.email
                          ? 'bg-[#1717AF]/5'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Fila principal: nombre y filtro */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            onComercialChange(comercial.email);
                            setComercialOpen(false);
                          }}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div>
                            <span className={`font-medium text-sm ${selectedComercial === comercial.email ? 'text-[#1717AF]' : 'text-slate-700'}`}>
                              {comercial.nombre}
                            </span>
                            <div className={`text-xs ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {connectionStatus}
                            </div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Controles apilados verticalmente */}
                      <div className="flex flex-col gap-2 ml-4 mt-1">
                        {/* Toggle de disponibilidad */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-24">Disponibilidad:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComercialConfigUpdate(comercial, 'disponibilidad', !isDisponible);
                            }}
                            disabled={isUpdatingDisp}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                              isDisponible ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${isUpdatingDisp ? 'opacity-50' : ''}`}
                          >
                            {isUpdatingDisp ? (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Loader2 size={12} className="animate-spin text-white" />
                              </span>
                            ) : (
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  isDisponible ? 'translate-x-5' : 'translate-x-1'
                                }`}
                              />
                            )}
                          </button>
                          <span className={`text-xs font-medium ${isDisponible ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isDisponible ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        
                        {/* Dropdown de Performance */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-24">Performance:</span>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPerformanceDropdownOpen(performanceDropdownOpen === comercial.card_id ? null : comercial.card_id);
                              }}
                              disabled={isUpdatingPerf}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${performanceOption.bgLight} ${performanceOption.text} ${performanceOption.border} ${isUpdatingPerf ? 'opacity-50' : 'hover:shadow-sm'}`}
                            >
                              {isUpdatingPerf ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <>
                                  <span className={`w-2 h-2 rounded-full ${performanceOption.bg}`} />
                                  <span>{performanceOption.label}</span>
                                  <ChevronDown size={10} className={`transition-transform ${performanceDropdownOpen === comercial.card_id ? 'rotate-180' : ''}`} />
                                </>
                              )}
                            </button>
                            
                            {/* Dropdown de opciones - abre hacia arriba si está cerca del final */}
                            {performanceDropdownOpen === comercial.card_id && (
                              <div className={`absolute left-0 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[60] min-w-[140px] ${
                                isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'
                              }`}>
                                {performanceOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (option.value !== currentPerformance) {
                                        handleComercialConfigUpdate(comercial, 'performance', option.value);
                                      } else {
                                        setPerformanceDropdownOpen(null);
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                                      option.value === currentPerformance 
                                        ? `${option.bgLight} ${option.text}` 
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className={`w-2.5 h-2.5 rounded-full ${option.bg}`} />
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagOpen(!tagOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
              setCategoriaOpen(false);
              setFuenteOpen(false);
              setReferidoOpen(false);
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

      {/* Filtro por Fuente */}
      {!showOnlyComercial && fuentes.length > 0 && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFuenteOpen(!fuenteOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
              setCategoriaOpen(false);
              setTagOpen(false);
              setReferidoOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedFuente
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <Globe size={16} />
            <span className="max-w-[150px] truncate">
              {selectedFuente || 'Fuente'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${fuenteOpen ? 'rotate-180' : ''}`} />
            {selectedFuente && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFuenteChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {fuenteOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onFuenteChange(null);
                  setFuenteOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !selectedFuente 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas las fuentes
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {fuentes.map((fuente) => (
                <button
                  key={fuente}
                  onClick={() => {
                    onFuenteChange(fuente);
                    setFuenteOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    selectedFuente === fuente
                      ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Globe size={12} />
                  {fuente}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtro por Referido */}
      {!showOnlyComercial && referidos.length > 0 && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReferidoOpen(!referidoOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
              setCategoriaOpen(false);
              setTagOpen(false);
              setFuenteOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              selectedReferido
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <UserPlus size={16} />
            <span className="max-w-[150px] truncate">
              {selectedReferido || 'Referido por'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${referidoOpen ? 'rotate-180' : ''}`} />
            {selectedReferido && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReferidoChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {referidoOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onReferidoChange(null);
                  setReferidoOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !selectedReferido 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos los referidos
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {referidos.map((referido) => (
                <button
                  key={referido}
                  onClick={() => {
                    onReferidoChange(referido);
                    setReferidoOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    selectedReferido === referido
                      ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus size={12} />
                  {referido}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Toast de notificación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
