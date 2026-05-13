import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Etapas que cuentan como "Agendado" (asignación automática del funnel)
const ETAPAS_AGENDADO = ['Agendado', 'Agendado (Pitch reprogramado)'];

export default function RecordatoriosCalendar({ selectedComercial, userEmail, onOpenLead, puedeVerTodos = false }) {
  const [viewMode, setViewMode] = useState('week'); // 'week' o 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarScrollRef = useRef(null);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const HOUR_SLOT_HEIGHT = 70;

  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h} ${ampm}`;
  };

  const formatDay = (date) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return days[date.getDay()];
  };

  const formatMonth = (date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Cargar recordatorios con datos del lead. Incluimos:
  //   - 'Programado' (futuros / pendientes)
  //   - 'Vencido'    (los que ya pasaron sin ejecutarse)
  // Los 'Cancelado' se omiten porque el usuario los descartó.
  useEffect(() => {
    const fetchRecordatorios = async () => {
      setLoading(true);
      try {
        // Join con leads trayendo todos los campos para que el sidebar reciba
        // el mismo objeto que recibe desde LeadsTable (etapa, botón a la
        // conversación, etc. dependen de campos completos del lead).
        let query = supabase
          .from('recordatorios')
          .select(`
            id,
            fecha_programada,
            observacion,
            estado,
            lead_id,
            leads:lead_id (*)
          `)
          .in('estado', ['Programado', 'Vencido'])
          .not('fecha_programada', 'is', null);

        const { data, error } = await query;
        if (error) throw error;

        // Filtrar por comercial del lead asociado
        let filtered = (data || []).filter(r => r.leads); // descartar huérfanos
        if (selectedComercial) {
          filtered = filtered.filter(r => r.leads.comercial_email === selectedComercial);
        } else if (!puedeVerTodos && userEmail) {
          filtered = filtered.filter(r => r.leads.comercial_email === userEmail);
        }

        // Filtrar por rango (semana o día visible)
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const inRange = filtered.filter(r => {
          const parsed = parseDateWithoutTimezone(r.fecha_programada);
          if (!parsed) return false;
          const recDate = new Date(parsed.year, parsed.month, parsed.day);
          if (viewMode === 'week') {
            return recDate >= weekStart && recDate <= weekEnd;
          }
          return recDate.toDateString() === currentDate.toDateString();
        });

        setRecordatorios(inRange);
      } catch (error) {
        console.error('Error cargando recordatorios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordatorios();
  }, [currentDate, viewMode, selectedComercial, userEmail, puedeVerTodos]);

  // Auto-scroll a las 7 AM cuando termina de cargar
  useEffect(() => {
    if (!loading && calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop = 7 * HOUR_SLOT_HEIGHT;
    }
  }, [loading]);

  // Parsea fecha de recordatorios.fecha_programada y devuelve componentes en hora LOCAL.
  // El insert se hace con `toISOString()` (UTC) → Postgres puede guardarlo en una columna
  // `timestamp without time zone`, y al devolverlo viene "2025-12-03 15:00:00" o
  // "2025-12-03T15:00:00" (sin marca de zona). Para mostrar correctamente, interpretamos
  // SIEMPRE el valor como UTC y lo convertimos a la hora local del navegador.
  const parseDateWithoutTimezone = (dateString) => {
    if (!dateString) return null;
    let normalized = String(dateString).trim().replace(' ', 'T');
    const hasTimezone = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(normalized);
    if (!hasTimezone) {
      normalized = normalized + 'Z';
    } else {
      normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes()
    };
  };

  const getRecordatoriosForSlot = (date, hour) => {
    return recordatorios.filter(rec => {
      const parsed = parseDateWithoutTimezone(rec.fecha_programada);
      if (!parsed) return false;
      const sameDate = parsed.year === date.getFullYear() &&
                       parsed.month === date.getMonth() &&
                       parsed.day === date.getDate();
      return sameDate && parsed.hour === hour;
    });
  };

  const formatTimeWithAmPm = (dateString) => {
    const parsed = parseDateWithoutTimezone(dateString);
    if (!parsed) return '';
    let hours = parsed.hour;
    const minutes = parsed.minute.toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const isPastRecordatorio = (fecha) => {
    const parsed = parseDateWithoutTimezone(fecha);
    if (!parsed) return false;
    const recDate = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute);
    return recDate < new Date();
  };

  // Categoría por recordatorio: 'pasado' | 'agendado' | 'otro'
  //   - 'Vencido' siempre cuenta como pasado (lo dice el estado)
  //   - 'Programado' con fecha < ahora también es pasado (transición todavía
  //     no procesada por el backend)
  const getCategoria = (rec) => {
    if (rec.estado === 'Vencido') return 'pasado';
    if (isPastRecordatorio(rec.fecha_programada)) return 'pasado';
    const etapa = rec.leads?.etapa_funnel || '';
    if (ETAPAS_AGENDADO.includes(etapa)) return 'agendado';
    return 'otro';
  };

  // Estilos por categoría
  const getCategoriaStyles = (categoria) => {
    switch (categoria) {
      case 'pasado':
        return {
          weekBg: 'bg-slate-200 text-slate-600 border-slate-400 hover:bg-slate-300',
          dayBg: 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200',
          legendBg: 'bg-slate-200 border border-slate-300',
          label: 'Pasado',
        };
      case 'agendado':
        return {
          weekBg: 'bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-500',
          dayBg: 'bg-amber-400 text-amber-900 border border-amber-500 hover:bg-amber-500',
          legendBg: 'bg-amber-400 border border-amber-500',
          label: 'Agendado',
        };
      case 'otro':
      default:
        return {
          weekBg: 'bg-violet-500 text-white border-violet-600 hover:bg-violet-600',
          dayBg: 'bg-violet-100 text-violet-900 border border-violet-300 hover:bg-violet-200',
          legendBg: 'bg-violet-500 border border-violet-600',
          label: 'Otra fase',
        };
    }
  };

  // Conteos para el footer
  const counts = useMemo(() => {
    const c = { pasado: 0, agendado: 0, otro: 0 };
    recordatorios.forEach(r => { c[getCategoria(r)]++; });
    return c;
  }, [recordatorios]);

  // Navegación
  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - (viewMode === 'week' ? 7 : 1));
    setCurrentDate(newDate);
  };
  const goToNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (viewMode === 'week' ? 7 : 1));
    setCurrentDate(newDate);
  };
  const handleDayClick = (date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  // Click sobre un recordatorio: abre el sidebar del lead
  const handleRecordatorioClick = (rec) => {
    if (!rec.leads) return;
    onOpenLead?.(rec.leads);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Header del calendario */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-violet-700 bg-violet-100 rounded-xl hover:bg-violet-200 transition-all"
            >
              Hoy
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <button
                onClick={goToNext}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              {viewMode === 'day'
                ? `${currentDate.getDate()} de ${formatMonth(currentDate)}`
                : formatMonth(weekDays[0])}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Día
            </button>
          </div>
        </div>
      </div>

      {/* Contenido del calendario */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-violet-600 animate-spin" />
        </div>
      ) : (
        <div ref={calendarScrollRef} className="overflow-auto max-h-[600px]">
          {viewMode === 'week' ? (
            <div className="min-w-[800px]">
              {/* Header con días */}
              <div className="grid grid-cols-8 border-b border-slate-100 sticky top-0 bg-white z-30">
                <div className="p-3 text-xs font-medium text-slate-400 border-r border-slate-100">
                  GMT-05
                </div>
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`p-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isToday(day) ? 'bg-violet-50' : ''
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday(day) ? 'text-violet-700' : 'text-slate-400'}`}>
                      {formatDay(day)}
                    </div>
                    <div className={`text-lg font-semibold mt-1 ${
                      isToday(day)
                        ? 'w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center mx-auto'
                        : 'text-slate-700'
                    }`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid de horas */}
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-slate-50 min-h-[70px]">
                  <div className="p-2 text-xs font-medium text-slate-400 border-r border-slate-100 text-right pr-3">
                    {formatHour(hour)}
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const slotRecs = getRecordatoriosForSlot(day, hour);
                    return (
                      <div
                        key={dayIndex}
                        className={`border-r border-slate-50 last:border-r-0 p-1 relative ${
                          isToday(day) ? 'bg-violet-50/40' : ''
                        }`}
                      >
                        {slotRecs.map((rec, recIndex) => {
                          const total = slotRecs.length;
                          const width = total > 1 ? `calc(${100 / total}% - 2px)` : 'calc(100% - 8px)';
                          const left = total > 1 ? `calc(${(recIndex / total) * 100}% + 1px)` : '4px';
                          const categoria = getCategoria(rec);
                          const styles = getCategoriaStyles(categoria);

                          return (
                            <div
                              key={rec.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordatorioClick(rec);
                              }}
                              className={`absolute rounded-lg px-1.5 py-1 text-xs font-medium shadow-sm transition-all hover:z-20 hover:scale-[1.03] hover:shadow-lg cursor-pointer border-2 ${styles.weekBg}`}
                              style={{
                                top: '2px',
                                left,
                                width,
                                height: 'calc(100% - 4px)',
                                zIndex: 10 + recIndex
                              }}
                              title={`${rec.leads?.nombre || 'Sin nombre'} • ${rec.leads?.etapa_funnel || ''} • ${formatTimeWithAmPm(rec.fecha_programada)}${rec.observacion ? ` — ${rec.observacion}` : ''}`}
                            >
                              <div className="truncate font-semibold text-[11px]">
                                {rec.leads?.nombre?.split(' ')[0] || 'Lead'}
                              </div>
                              <div className="truncate text-[9px] opacity-90">
                                {formatTimeWithAmPm(rec.fecha_programada)}
                              </div>
                              {total === 1 && (
                                <div className="truncate text-[8px] opacity-75">
                                  {rec.leads?.comercial_email?.split('@')[0] || ''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            /* Vista de día */
            <div className="min-w-[400px]">
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className={`text-center ${isToday(currentDate) ? 'text-violet-700' : 'text-slate-600'}`}>
                  <div className="text-sm font-medium">{formatDay(currentDate)}</div>
                  <div className={`text-3xl font-bold mt-1 ${
                    isToday(currentDate)
                      ? 'w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center mx-auto'
                      : ''
                  }`}>
                    {currentDate.getDate()}
                  </div>
                </div>
              </div>

              {hours.map((hour) => {
                const slotRecs = getRecordatoriosForSlot(currentDate, hour);
                return (
                  <div key={hour} className="flex border-b border-slate-50 min-h-[70px]">
                    <div className="w-20 p-3 text-xs font-medium text-slate-400 border-r border-slate-100 text-right flex-shrink-0">
                      {formatHour(hour)}
                    </div>
                    <div className="flex-1 p-2 relative">
                      {slotRecs.map((rec) => {
                        const categoria = getCategoria(rec);
                        const styles = getCategoriaStyles(categoria);
                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleRecordatorioClick(rec)}
                            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-sm mb-2 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${styles.dayBg}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{rec.leads?.nombre || 'Lead'}</span>
                              <span className="text-[10px] uppercase tracking-wide opacity-70">
                                {styles.label}
                              </span>
                            </div>
                            <div className="text-xs opacity-80 mt-1">
                              {formatTimeWithAmPm(rec.fecha_programada)}
                              {rec.leads?.etapa_funnel && (
                                <span className="ml-2">• {rec.leads.etapa_funnel}</span>
                              )}
                            </div>
                            {rec.observacion && (
                              <div className="text-xs opacity-70 mt-1 line-clamp-2">
                                {rec.observacion}
                              </div>
                            )}
                            <div className="text-xs opacity-60 mt-0.5">
                              📧 {rec.leads?.comercial_email?.split('@')[0] || 'Sin asignar'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer con leyenda (3 categorías) */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500" />
          <span className="text-xs text-slate-600">Agendado <span className="text-slate-400">({counts.agendado})</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-violet-500 border border-violet-600" />
          <span className="text-xs text-slate-600">Otra fase <span className="text-slate-400">({counts.otro})</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
          <span className="text-xs text-slate-600">Pasado <span className="text-slate-400">({counts.pasado})</span></span>
        </div>
        <div className="ml-auto text-xs text-slate-400">
          {recordatorios.length} recordatorio{recordatorios.length !== 1 ? 's' : ''} en esta vista
        </div>
      </div>
    </div>
  );
}
