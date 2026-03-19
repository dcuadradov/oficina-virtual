import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar, CalendarRange, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X, Search, MessageSquare, Tag, Loader2, Globe, UserPlus, Smartphone, Settings, Check } from 'lucide-react';

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
  filtroGestionWA,
  onFiltroGestionWAChange,
  showComercialFilter = false,
  showOnlyComercial = false,
  searchQuery = '',
  onSearchChange,
  onRefreshComerciales,
  dateFilterField = 'created_at',
  onDateFilterFieldChange,
  showDateFilterToggle = true,
  puedeVerTodos = false,
  monthConfigs = {},
  onSaveMonthConfig,
  showTagFilter = true,
  showFuenteFilter = true,
  showReferidoFilter = true,
  showGestionWAFilter = true
}) => {
  const [comercialOpen, setComercialOpen] = useState(false);
  const [mesOpen, setMesOpen] = useState(false);
  const [configMonth, setConfigMonth] = useState(null);
  const [configCalMonth, setConfigCalMonth] = useState(null);
  const [configRange, setConfigRange] = useState({ start: null, end: null });
  const [configStep, setConfigStep] = useState('start');
  const [savingConfig, setSavingConfig] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [diaOpen, setDiaOpen] = useState(false);
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [fuenteOpen, setFuenteOpen] = useState(false);
  const [referidoOpen, setReferidoOpen] = useState(false);
  const [gestionWAOpen, setGestionWAOpen] = useState(false);
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
      if (!e.target.closest('.filter-dropdown') && !e.target.closest('.month-config-modal')) {
        setComercialOpen(false);
        setMesOpen(false);
        setPeriodoOpen(false);
        setDiaOpen(false);
        setCategoriaOpen(false);
        setTagOpen(false);
        setFuenteOpen(false);
        setReferidoOpen(false);
        setGestionWAOpen(false);
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

  // Config month calendar helpers
  const openMonthConfig = (monthValue) => {
    const existing = monthConfigs[monthValue];
    const [y, m] = monthValue.split('-').map(Number);
    if (existing) {
      setConfigRange({
        start: existing.fecha_inicio,
        end: existing.fecha_fin || null
      });
      setConfigStep(existing.fecha_fin ? 'done' : 'end');
    } else {
      const lastDay = new Date(y, m, 0).getDate();
      setConfigRange({
        start: `${monthValue}-01`,
        end: `${monthValue}-${String(lastDay).padStart(2, '0')}`
      });
      setConfigStep('done');
    }
    setConfigMonth(monthValue);
    setConfigCalMonth(new Date(y, m - 1, 1));
    setMesOpen(false);
  };

  const configMonthLabel = useMemo(() => {
    if (!configMonth) return '';
    const [y, m] = configMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const name = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [configMonth]);

  const configCalendarDays = useMemo(() => {
    if (!configCalMonth) return [];
    const y = configCalMonth.getFullYear();
    const month = configCalMonth.getMonth();
    const firstDay = new Date(y, month, 1);
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek -= 1;
    const daysInMonth = new Date(y, month + 1, 0).getDate();
    const prevMonthDays = new Date(y, month, 0).getDate();
    const days = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(y, month - 1, prevMonthDays - i), isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(y, month, d), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: new Date(y, month + 1, d), isCurrentMonth: false });
    }
    return days;
  }, [configCalMonth]);

  const configCalMonthLabel = useMemo(() => {
    if (!configCalMonth) return '';
    const name = configCalMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [configCalMonth]);

  const isInConfigRange = (date) => {
    if (!configRange.start) return false;
    const s = new Date(configRange.start + 'T00:00:00');
    if (!configRange.end) return formatDateValue(date) === configRange.start;
    const e = new Date(configRange.end + 'T00:00:00');
    return date >= s && date <= e;
  };

  const isConfigStart = (date) => configRange.start && formatDateValue(date) === configRange.start;
  const isConfigEnd = (date) => configRange.end && formatDateValue(date) === configRange.end;

  const handleConfigDayClick = (date, isCurrentMonth) => {
    if (!isCurrentMonth) {
      setConfigCalMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    const val = formatDateValue(date);
    if (configStep === 'start' || configStep === 'done') {
      setConfigRange({ start: val, end: null });
      setConfigStep('end');
    } else if (configStep === 'end') {
      if (val < configRange.start) {
        setConfigRange({ start: val, end: configRange.start });
      } else {
        setConfigRange(prev => ({ ...prev, end: val }));
      }
      setConfigStep('done');
    }
  };

  const handleSaveConfig = async () => {
    if (!configMonth || !configRange.start || !onSaveMonthConfig) return;
    setSavingConfig(true);
    await onSaveMonthConfig(configMonth, configRange.start, configRange.end);
    setSavingConfig(false);
    setConfigMonth(null);
  };

  const isCurrentMonthConfig = useMemo(() => {
    if (!configMonth) return false;
    const today = new Date();
    const cur = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return configMonth === cur;
  }, [configMonth]);

  const renderMonthConfigModal = () => {
    if (!configMonth) return null;
    const hasExisting = !!monthConfigs[configMonth];
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setConfigMonth(null)}>
        <div className="month-config-modal bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-[340px]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Configurar {configMonthLabel}</h3>
            <button onClick={() => setConfigMonth(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={16} />
            </button>
          </div>

          {configRange.start && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-center">
                <span className="text-slate-400 block">Inicio</span>
                <span className="font-semibold text-slate-700">{configRange.start}</span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-center">
                <span className="text-slate-400 block">Fin</span>
                <span className="font-semibold text-slate-700">{configRange.end || (isCurrentMonthConfig ? 'Abierto' : '—')}</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 text-center mb-2">
            {configStep === 'start' || configStep === 'done' ? 'Selecciona fecha de inicio' : 'Selecciona fecha de fin'}
          </div>

          {/* Calendar with navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setConfigCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-slate-700">{configCalMonthLabel}</span>
            <button
              onClick={() => setConfigCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-slate-400 py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {configCalendarDays.map((dayInfo, index) => {
              const inRange = isInConfigRange(dayInfo.date);
              const isStart = isConfigStart(dayInfo.date);
              const isEnd = isConfigEnd(dayInfo.date);
              return (
                <button
                  key={index}
                  onClick={() => handleConfigDayClick(dayInfo.date, dayInfo.isCurrentMonth)}
                  className={`
                    w-9 h-8 text-xs font-medium transition-all duration-150 relative cursor-pointer
                    ${!dayInfo.isCurrentMonth ? 'text-slate-300' : ''}
                    ${inRange && !isStart && !isEnd ? 'bg-[#1717AF]/10 text-[#1717AF]' : ''}
                    ${isStart ? 'bg-[#1717AF] text-white rounded-l-lg' : ''}
                    ${isEnd ? 'bg-[#1717AF] text-white rounded-r-lg' : ''}
                    ${isStart && isEnd ? 'rounded-lg' : ''}
                    ${!inRange && dayInfo.isCurrentMonth ? 'text-slate-600 hover:bg-slate-100 rounded-lg' : ''}
                    ${!inRange && !dayInfo.isCurrentMonth ? 'hover:bg-slate-50 rounded-lg' : ''}
                  `}
                >
                  {dayInfo.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {isCurrentMonthConfig && configStep === 'done' && configRange.end && (
              <button
                onClick={() => setConfigRange(prev => ({ ...prev, end: null }))}
                className="flex-1 px-3 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Dejar fin abierto
              </button>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={!configRange.start || savingConfig || (configStep === 'end')}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !configRange.start || savingConfig || configStep === 'end'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1717AF] text-white hover:bg-[#1717AF]/90 shadow-md'
              }`}
            >
              {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {hasExisting ? 'Actualizar' : 'Configurar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (showOnlyComercial) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {showComercialFilter && comerciales.length > 0 && (
          <div className="relative filter-dropdown">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setComercialOpen(!comercialOpen);
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
                <div className="px-4 pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700">Configuración de Comerciales</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Gestiona disponibilidad y performance</p>
                </div>
                <button
                  onClick={() => { onComercialChange(null); setComercialOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors mt-2 ${!selectedComercial ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2"><Users size={14} /><span>Todos los comerciales</span></div>
                </button>
                <div className="h-px bg-slate-100 my-2" />
                <div className="space-y-1">
                  {comerciales.map((comercial) => {
                    const online = isUserOnline(comercial.ultima_conexion);
                    const connectionStatus = formatLastConnection(comercial.ultima_conexion);
                    return (
                      <button
                        key={comercial.email}
                        onClick={() => { onComercialChange(comercial.email); setComercialOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${selectedComercial === comercial.email ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div>
                          <span className="font-medium">{comercial.nombre}</span>
                          <div className={`text-xs ${online ? 'text-emerald-600' : 'text-slate-400'}`}>{connectionStatus}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Fila 1: Búsqueda + Filtros de fecha + Pill */}
      <div className="flex flex-wrap items-center gap-3">
      {/* Campo de búsqueda */}
      {(
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

      {/* Filtro de Mes */}
      {(
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
                const hasConfig = !!monthConfigs[month.value];
                return (
                  <div
                    key={month.value}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      selectedMes === month.value
                        ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onMesChange(month.value);
                        setMesOpen(false);
                      }}
                      className="flex-1 text-left flex items-center gap-2"
                    >
                      <span>{month.label}</span>
                      {isCurrentMonth && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          Actual
                        </span>
                      )}
                      {hasConfig && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1717AF]" title="Rango personalizado" />
                      )}
                    </button>
                    {puedeVerTodos && onSaveMonthConfig && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMonthConfig(month.value);
                        }}
                        className="p-1 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors ml-1"
                        title="Configurar rango del mes"
                      >
                        <Settings size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtro de Periodo (Martes a Martes) */}
      {(
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

      {/* Filtro de Día con Calendario */}
      {(
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

      {/* Toggle Creación / Actualización */}
      {showDateFilterToggle && onDateFilterFieldChange && (
        <div className="relative group">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => onDateFilterFieldChange('created_at')}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
                dateFilterField === 'created_at'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Creación
            </button>
            <button
              onClick={() => onDateFilterFieldChange('updated_at')}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
                dateFilterField === 'updated_at'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Actualización
            </button>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="relative bg-slate-800 text-white text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium shadow-lg">
              Filtrar fechas por {dateFilterField === 'created_at' ? 'creación' : 'última actualización'}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Fila 2: Comerciales + Tags + Fuente + Referido + Gestión WA */}
      <div className="flex flex-wrap items-center gap-3">
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
              <div className="px-4 pb-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700">Configuración de Comerciales</h4>
                <p className="text-xs text-slate-400 mt-0.5">Gestiona disponibilidad y performance</p>
              </div>
              
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
              
              <div className="space-y-1">
                {comerciales.map((comercial, index) => {
                  const online = isUserOnline(comercial.ultima_conexion);
                  const connectionStatus = formatLastConnection(comercial.ultima_conexion);
                  const isDisponible = comercial.disponibilidad === 'Inactivo' ? false : 
                                       comercial.disponibilidad === false ? false : true;
                  const currentPerformance = comercial.performance || 'Top';
                  const performanceOption = performanceOptions.find(p => p.value === currentPerformance) || performanceOptions[0];
                  const isUpdatingDisp = updatingComercial === `${comercial.card_id}-disponibilidad`;
                  const isUpdatingPerf = updatingComercial === `${comercial.card_id}-performance`;
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
                      
                      <div className="flex flex-col gap-2 ml-4 mt-1">
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

      {/* Filtro de Categoría de Seguimiento */}
      {categorias.length > 0 && (
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

      {/* Filtro por Tag (multi-select) */}
      {showTagFilter && tags.length > 0 && (
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
              selectedTag.length > 0
                ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-600'
            }`}
          >
            <Tag size={16} />
            <span className="max-w-[150px] truncate">
              {selectedTag.length > 0 ? `Tags (${selectedTag.length})` : 'Tags'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${tagOpen ? 'rotate-180' : ''}`} />
            {selectedTag.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTagChange([]);
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
                onClick={() => onTagChange([])}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedTag.length === 0
                    ? 'bg-violet-100 text-violet-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos los tags
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {tags.map((tag) => {
                const isChecked = selectedTag.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isChecked) {
                        onTagChange(selectedTag.filter(t => t !== tag));
                      } else {
                        onTagChange([...selectedTag, tag]);
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
                      isChecked
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                    }`}>
                      {isChecked && <Check size={10} className="text-white" />}
                    </div>
                    <Tag size={12} />
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtro por Fuente (multi-select) */}
      {showFuenteFilter && fuentes.length > 0 && (
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
              selectedFuente.length > 0
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <Globe size={16} />
            <span className="max-w-[150px] truncate">
              {selectedFuente.length > 0 ? `Fuente (${selectedFuente.length})` : 'Fuente'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${fuenteOpen ? 'rotate-180' : ''}`} />
            {selectedFuente.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFuenteChange([]);
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
                onClick={() => onFuenteChange([])}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedFuente.length === 0
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas las fuentes
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {fuentes.map((fuente) => {
                const isChecked = selectedFuente.includes(fuente);
                return (
                  <button
                    key={fuente}
                    onClick={() => {
                      if (isChecked) {
                        onFuenteChange(selectedFuente.filter(f => f !== fuente));
                      } else {
                        onFuenteChange([...selectedFuente, fuente]);
                      }
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
                    <Globe size={12} />
                    {fuente}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtro por Referido */}
      {showReferidoFilter && referidos.length > 0 && (
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
              setGestionWAOpen(false);
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
      
      {/* Filtro por Gestión WhatsApp */}
      {showGestionWAFilter && (
        <div className="relative filter-dropdown">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setGestionWAOpen(!gestionWAOpen);
              setComercialOpen(false);
              setMesOpen(false);
              setPeriodoOpen(false);
              setDiaOpen(false);
              setCategoriaOpen(false);
              setTagOpen(false);
              setFuenteOpen(false);
              setReferidoOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              filtroGestionWA
                ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
            }`}
          >
            <Smartphone size={16} />
            <span className="max-w-[200px] truncate">
              {filtroGestionWA === 'respond' ? 'Respond' : filtroGestionWA === 'personal' ? 'WA Business del Comercial' : 'Gestión WhatsApp'}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${gestionWAOpen ? 'rotate-180' : ''}`} />
            {filtroGestionWA && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFiltroGestionWAChange(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            )}
          </button>
          
          {gestionWAOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <button
                onClick={() => {
                  onFiltroGestionWAChange(null);
                  setGestionWAOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  !filtroGestionWA 
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  onFiltroGestionWAChange('respond');
                  setGestionWAOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  filtroGestionWA === 'respond'
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone size={12} />
                Respond
              </button>
              <button
                onClick={() => {
                  onFiltroGestionWAChange('personal');
                  setGestionWAOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  filtroGestionWA === 'personal'
                    ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" stroke="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Business del Comercial
              </button>
            </div>
          )}
        </div>
      )}
      </div>
      
      {/* Toast de notificación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Modal de configuración de mes */}
      {renderMonthConfigModal()}
    </div>
  );
};

export default DashboardFilters;
