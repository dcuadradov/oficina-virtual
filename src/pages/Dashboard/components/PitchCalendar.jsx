import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';

export default function PitchCalendar({ selectedComercial, userEmail, onOpenLead, puedeVerTodos = false }) {
  const [viewMode, setViewMode] = useState('week'); // 'week' o 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Obtener el inicio de la semana (domingo)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Obtener los días de la semana actual
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate]);

  // Horas del día (7 AM a 9 PM)
  const hours = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => i + 7); // 7 a 21
  }, []);

  // Formatear hora
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h} ${ampm}`;
  };

  // Formatear día
  const formatDay = (date) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return days[date.getDay()];
  };

  // Formatear mes
  const formatMonth = (date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Verificar si es hoy
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Cargar pitches
  useEffect(() => {
    const fetchPitches = async () => {
      setLoading(true);
      try {
        console.log('=== DEBUG PITCH CALENDAR ===');
        console.log('selectedComercial:', selectedComercial);
        console.log('userEmail:', userEmail);
        console.log('puedeVerTodos:', puedeVerTodos);
        
        let query = supabase
          .from('leads')
          .select('*')
          .not('fecha_pitch', 'is', null);

        // Filtrar por comercial
        // Si puede ver todos y no ha seleccionado comercial, mostrar todos
        // Si no puede ver todos, filtrar por su email
        if (selectedComercial) {
          query = query.eq('comercial_email', selectedComercial);
        } else if (!puedeVerTodos && userEmail) {
          query = query.eq('comercial_email', userEmail);
        }
        // Si puedeVerTodos y no hay selectedComercial, no filtramos (muestra todos)

        const { data, error } = await query;

        console.log('Pitches desde BD:', data);
        console.log('Error:', error);

        if (error) throw error;
        
        // Filtrar por fecha en el frontend (más confiable con formatos mixtos)
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        console.log('Semana actual:', weekStart.toDateString(), '-', weekEnd.toDateString());
        
        const filteredData = (data || []).filter(pitch => {
          if (!pitch.fecha_pitch) return false;
          
          // Extraer año, mes, día de la fecha del pitch
          const match = pitch.fecha_pitch.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (!match) {
            console.log('No match para:', pitch.fecha_pitch);
            return false;
          }
          
          const [, year, month, day] = match;
          const pitchDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          console.log('Pitch:', pitch.nombre, '| fecha_pitch:', pitch.fecha_pitch, '| pitchDate:', pitchDate.toDateString());
          
          if (viewMode === 'week') {
            const inRange = pitchDate >= weekStart && pitchDate <= weekEnd;
            console.log('  En rango semana?', inRange);
            return inRange;
          } else {
            const sameDay = pitchDate.toDateString() === currentDate.toDateString();
            console.log('  Mismo día?', sameDay);
            return sameDay;
          }
        });
        
        console.log('Pitches filtrados:', filteredData.length);
        setPitches(filteredData);
      } catch (error) {
        console.error('Error cargando pitches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();
  }, [currentDate, viewMode, selectedComercial, userEmail]);

  // Extraer fecha/hora sin conversión de zona horaria (soporta formato con T o espacio)
  const parseDateWithoutTimezone = (dateString) => {
    if (!dateString) return null;
    // Soporta "2025-12-03T18:00:00" o "2025-12-03 18:00:00+00"
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return {
      year: parseInt(year),
      month: parseInt(month) - 1, // 0-indexed
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute)
    };
  };

  // Obtener pitches para una fecha y hora específica
  const getPitchesForSlot = (date, hour) => {
    return pitches.filter(pitch => {
      const parsed = parseDateWithoutTimezone(pitch.fecha_pitch);
      if (!parsed) return false;
      // Comparar fecha (día/mes/año) y hora SIN conversión de zona horaria
      const sameDate = parsed.year === date.getFullYear() &&
                       parsed.month === date.getMonth() &&
                       parsed.day === date.getDate();
      const sameHour = parsed.hour === hour;
      return sameDate && sameHour;
    });
  };

  // Formatear hora con AM/PM para mostrar en tarjetas (sin conversión de zona horaria)
  const formatTimeWithAmPm = (dateString) => {
    const parsed = parseDateWithoutTimezone(dateString);
    if (!parsed) return '';
    let hours = parsed.hour;
    const minutes = parsed.minute.toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // Verificar si un pitch ya pasó (sin conversión de zona horaria)
  const isPastPitch = (fecha_pitch) => {
    const parsed = parseDateWithoutTimezone(fecha_pitch);
    if (!parsed) return false;
    const pitchDate = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute);
    return pitchDate < new Date();
  };

  // Navegación
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Click en día para ir a vista diaria
  const handleDayClick = (date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Header del calendario */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          {/* Navegación y título */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-[#1717AF] bg-[#1717AF]/10 rounded-xl hover:bg-[#1717AF]/20 transition-all"
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
                : formatMonth(weekDays[0])
              }
            </h2>
          </div>

          {/* Selector de vista */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-[#1717AF] shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-[#1717AF] shadow-sm'
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
          <Loader2 size={32} className="text-[#1717AF] animate-spin" />
        </div>
      ) : (
        <div className="overflow-auto max-h-[600px]">
          {viewMode === 'week' ? (
            /* Vista de semana */
            <div className="min-w-[800px]">
              {/* Header con días */}
              <div className="grid grid-cols-8 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="p-3 text-xs font-medium text-slate-400 border-r border-slate-100">
                  GMT-05
                </div>
                {weekDays.map((day, index) => (
                  <div 
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`p-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isToday(day) ? 'bg-[#1717AF]/5' : ''
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday(day) ? 'text-[#1717AF]' : 'text-slate-400'}`}>
                      {formatDay(day)}
                    </div>
                    <div className={`text-lg font-semibold mt-1 ${
                      isToday(day) 
                        ? 'w-8 h-8 rounded-full bg-[#1717AF] text-white flex items-center justify-center mx-auto' 
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
                    const slotPitches = getPitchesForSlot(day, hour);
                    return (
                      <div 
                        key={dayIndex} 
                        className={`border-r border-slate-50 last:border-r-0 p-1 relative ${
                          isToday(day) ? 'bg-[#1717AF]/[0.02]' : ''
                        }`}
                      >
                        {slotPitches.map((pitch, pitchIndex) => {
                          const total = slotPitches.length;
                          const width = total > 1 ? `calc(${100 / total}% - 2px)` : 'calc(100% - 8px)';
                          const left = total > 1 ? `calc(${(pitchIndex / total) * 100}% + 1px)` : '4px';
                          
                          return (
                            <div
                              key={pitch.card_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLead?.(pitch);
                              }}
                              className={`absolute rounded-lg px-1.5 py-1 text-xs font-medium shadow-sm transition-all hover:z-20 hover:scale-[1.03] hover:shadow-lg cursor-pointer border-2 ${
                                isPastPitch(pitch.fecha_pitch)
                                  ? 'bg-slate-200 text-slate-600 border-slate-400 hover:bg-slate-300'
                                  : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                              }`}
                              style={{
                                top: '2px',
                                left: left,
                                width: width,
                                height: 'calc(100% - 4px)',
                                zIndex: 10 + pitchIndex
                              }}
                              title={`${pitch.nombre} - ${pitch.comercial_email?.split('@')[0] || ''} - Clic para ver detalles`}
                            >
                              <div className="truncate font-semibold text-[11px]">
                                {pitch.nombre?.split(' ')[0]}
                              </div>
                              <div className="truncate text-[9px] opacity-90">
                                {formatTimeWithAmPm(pitch.fecha_pitch)}
                              </div>
                              {total === 1 && (
                                <div className="truncate text-[8px] opacity-75">
                                  {pitch.comercial_email?.split('@')[0] || ''}
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
              {/* Header del día */}
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className={`text-center ${isToday(currentDate) ? 'text-[#1717AF]' : 'text-slate-600'}`}>
                  <div className="text-sm font-medium">{formatDay(currentDate)}</div>
                  <div className={`text-3xl font-bold mt-1 ${
                    isToday(currentDate) 
                      ? 'w-12 h-12 rounded-full bg-[#1717AF] text-white flex items-center justify-center mx-auto' 
                      : ''
                  }`}>
                    {currentDate.getDate()}
                  </div>
                </div>
              </div>

              {/* Grid de horas */}
              {hours.map((hour) => {
                const slotPitches = getPitchesForSlot(currentDate, hour);
                return (
                  <div key={hour} className="flex border-b border-slate-50 min-h-[70px]">
                    <div className="w-20 p-3 text-xs font-medium text-slate-400 border-r border-slate-100 text-right flex-shrink-0">
                      {formatHour(hour)}
                    </div>
                    <div className="flex-1 p-2 relative">
                      {slotPitches.map((pitch) => (
                        <div
                          key={pitch.card_id}
                          onClick={() => onOpenLead?.(pitch)}
                          className={`rounded-xl px-4 py-3 text-sm font-medium shadow-sm mb-2 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                            isPastPitch(pitch.fecha_pitch)
                              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                              : 'bg-amber-400 text-amber-900 border border-amber-500 hover:bg-amber-500'
                          }`}
                        >
                          <div className="font-semibold">{pitch.nombre}</div>
                          <div className="text-xs opacity-80 mt-1">
                            {formatTimeWithAmPm(pitch.fecha_pitch)} - 1 hora
                          </div>
                          <div className="text-xs opacity-60 mt-0.5">
                            📧 {pitch.comercial_email?.split('@')[0] || 'Sin asignar'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer con leyenda */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500" />
          <span className="text-xs text-slate-600">Pitch programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
          <span className="text-xs text-slate-600">Pitch pasado</span>
        </div>
        <div className="ml-auto text-xs text-slate-400">
          {pitches.length} pitch{pitches.length !== 1 ? 'es' : ''} en esta vista
        </div>
      </div>
    </div>
  );
}

