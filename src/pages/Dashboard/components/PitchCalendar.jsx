import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Loader2 } from 'lucide-react';
import { PITCH_STATES, getPitchState, getPitchCardClasses } from '../../../constants/pitchColors';

// Días de la semana abreviados (DOM=0 ... SAB=6, en orden JS)
const DAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Construye una Date local (00:00) a partir de una cadena 'YYYY-MM-DD'
const parseLocalDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Suma N días a una Date (sin mutar la original)
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// Devuelve el martes anterior (incluido si la fecha YA es martes)
// que ancla el periodo de 7 días Mar-Lun.
const getTuesdayWeekStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Tuesday=2 en JS (Sun=0)
  const offset = (d.getDay() - 2 + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
};

export default function PitchCalendar({
  selectedComercial,
  userEmail,
  onOpenLead,
  puedeVerTodos = false,
  selectedMes = null,
  selectedPeriodo = null,
  selectedDia = null,
  monthConfigs = {},
}) {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  // Set de IDs de PITCH_STATES seleccionados como filtro. Vacío = mostrar todos.
  const [selectedStateIds, setSelectedStateIds] = useState(() => new Set());
  const calendarScrollRef = useRef(null);

  const toggleStateFilter = (stateId) => {
    setSelectedStateIds(prev => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  };
  const clearStateFilters = () => setSelectedStateIds(new Set());

  // ----- Determinar modo y rango a partir de los filtros del Dashboard -----
  // Prioridad: día > periodo > mes > (default: periodo actual martes-lunes).
  // viewMode: 'day' | 'period' | 'month'.
  const { viewMode, rangeStart, rangeEnd, headerTitle } = useMemo(() => {
    if (selectedDia) {
      const start = parseLocalDate(selectedDia);
      return {
        viewMode: 'day',
        rangeStart: start,
        rangeEnd: start,
        headerTitle: `${start.getDate()} de ${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    if (selectedPeriodo) {
      const [ini, fin] = selectedPeriodo.split('_');
      const start = parseLocalDate(ini);
      const end = parseLocalDate(fin);
      return {
        viewMode: 'period',
        rangeStart: start,
        rangeEnd: end,
        headerTitle: `${start.getDate()} ${MONTH_LABELS[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTH_LABELS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`,
      };
    }
    if (selectedMes) {
      const cfg = monthConfigs?.[selectedMes];
      const [yStr, mStr] = selectedMes.split('-');
      const año = parseInt(yStr, 10);
      const mes = parseInt(mStr, 10);
      let start, end;
      if (cfg?.fecha_inicio) {
        start = parseLocalDate(cfg.fecha_inicio);
        end = cfg.fecha_fin ? parseLocalDate(cfg.fecha_fin) : new Date();
      } else {
        start = new Date(año, mes - 1, 1);
        end = new Date(año, mes, 0); // último día del mes
      }
      return {
        viewMode: 'month',
        rangeStart: start,
        rangeEnd: end,
        headerTitle: `${MONTH_LABELS[mes - 1]} ${año}`,
      };
    }
    // Default: periodo actual (martes a lunes que contiene hoy)
    const start = getTuesdayWeekStart(new Date());
    const end = addDays(start, 6);
    return {
      viewMode: 'period',
      rangeStart: start,
      rangeEnd: end,
      headerTitle: `${start.getDate()} ${MONTH_LABELS[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTH_LABELS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`,
    };
  }, [selectedDia, selectedPeriodo, selectedMes, monthConfigs]);

  // Días contenidos en el rango (para renders por columnas/secciones)
  const rangeDays = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const days = [];
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);
    let cursor = new Date(start);
    // Hard-cap defensivo: 366 iteraciones (en caso de mes mal configurado)
    let i = 0;
    while (cursor <= end && i < 366) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
      i++;
    }
    return days;
  }, [rangeStart, rangeEnd]);

  // Horas del día (12 AM a 11 PM)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  // Altura de cada slot de hora en píxeles (para auto-scroll a 7 AM)
  const HOUR_SLOT_HEIGHT = 70;

  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h} ${ampm}`;
  };

  const formatDay = (date) => DAY_LABELS[date.getDay()];

  const isToday = (date) => date.toDateString() === new Date().toDateString();

  // ----- Carga de datos: la vista vw_pitches_calendario ya aplica la regla
  // de negocio (una sola tarjeta por lead/fecha) -----
  useEffect(() => {
    const fetchPitches = async () => {
      setLoading(true);
      try {
        let query = supabase.from('vw_pitches_calendario').select('*');
        if (selectedComercial) {
          query = query.eq('comercial_email', selectedComercial);
        } else if (!puedeVerTodos && userEmail) {
          query = query.eq('comercial_email', userEmail);
        }
        const { data, error } = await query;
        if (error) throw error;

        // Filtrar por rango sin conversión de zona horaria
        const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);
        const filtered = (data || []).filter(p => {
          if (!p.fecha_pitch_calendario) return false;
          const m = p.fecha_pitch_calendario.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (!m) return false;
          const [, y, mo, d] = m;
          const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
          return dt >= start && dt <= end;
        });
        setPitches(filtered);
      } catch (error) {
        console.error('Error cargando pitches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPitches();
  }, [rangeStart, rangeEnd, selectedComercial, userEmail, puedeVerTodos]);

  // Auto-scroll a las 7 AM cuando termina de cargar (solo en vistas con grid horario)
  useEffect(() => {
    if (!loading && calendarScrollRef.current && viewMode !== 'month') {
      calendarScrollRef.current.scrollTop = 7 * HOUR_SLOT_HEIGHT;
    }
  }, [loading, viewMode]);

  // Extraer fecha/hora sin conversión de zona horaria
  const parseDateWithoutTimezone = (dateString) => {
    if (!dateString) return null;
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return {
      year: parseInt(year),
      month: parseInt(month) - 1,
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
    };
  };

  // Filtrado por estado (chips). Si no hay chips activos → no aplica filtro.
  const matchesStateFilter = (pitch) => {
    if (selectedStateIds.size === 0) return true;
    const state = getPitchState(pitch);
    return selectedStateIds.has(state.id);
  };

  // Pitches que caen en (date, hour)
  const getPitchesForSlot = (date, hour) => {
    return pitches.filter(pitch => {
      if (!matchesStateFilter(pitch)) return false;
      const parsed = parseDateWithoutTimezone(pitch.fecha_pitch_calendario);
      if (!parsed) return false;
      const sameDate = parsed.year === date.getFullYear() &&
                       parsed.month === date.getMonth() &&
                       parsed.day === date.getDate();
      const sameHour = parsed.hour === hour;
      return sameDate && sameHour;
    });
  };

  // Pitches del día completo (para vista mes - lista)
  const getPitchesForDay = (date) => {
    return pitches.filter(pitch => {
      if (!matchesStateFilter(pitch)) return false;
      const parsed = parseDateWithoutTimezone(pitch.fecha_pitch_calendario);
      if (!parsed) return false;
      return parsed.year === date.getFullYear() &&
             parsed.month === date.getMonth() &&
             parsed.day === date.getDate();
    }).sort((a, b) => {
      const pa = parseDateWithoutTimezone(a.fecha_pitch_calendario);
      const pb = parseDateWithoutTimezone(b.fecha_pitch_calendario);
      return (pa.hour * 60 + pa.minute) - (pb.hour * 60 + pb.minute);
    });
  };

  // Pitches visibles tras filtro (para footer)
  const visiblePitchesCount = useMemo(
    () => pitches.filter(matchesStateFilter).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pitches, selectedStateIds]
  );

  const formatTimeWithAmPm = (dateString) => {
    const parsed = parseDateWithoutTimezone(dateString);
    if (!parsed) return '';
    let hours = parsed.hour;
    const minutes = parsed.minute.toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const isPastPitch = (fecha_pitch) => {
    const parsed = parseDateWithoutTimezone(fecha_pitch);
    if (!parsed) return false;
    const pitchDate = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute);
    return pitchDate < new Date();
  };

  // ----- Render -----
  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Header del calendario: solo título (la navegación temporal vive
          en el DashboardFilters de arriba). */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {headerTitle}
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {viewMode === 'day' && 'Vista día'}
            {viewMode === 'period' && 'Vista periodo'}
            {viewMode === 'month' && 'Vista mes'}
          </span>
        </div>
      </div>

      {/* Barra de chips: leyenda + filtro multi-select. */}
      <div className="px-6 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mr-1">
            Estados
          </span>
          {PITCH_STATES.map(state => {
            const active = selectedStateIds.has(state.id);
            return (
              <button
                key={state.id}
                type="button"
                onClick={() => toggleStateFilter(state.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  active
                    ? `${state.chip} ${state.chipText} border-transparent shadow-sm`
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                title={active ? `Quitar filtro: ${state.label}` : `Filtrar: ${state.label}`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${state.chip} ${active ? 'ring-2 ring-white/40' : ''}`}
                />
                {state.label}
              </button>
            );
          })}
          {selectedStateIds.size > 0 && (
            <button
              type="button"
              onClick={clearStateFilters}
              className="ml-1 text-[11px] text-[#1717AF] hover:text-[#1717AF]/80 font-medium underline-offset-2 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido del calendario */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-[#1717AF] animate-spin" />
        </div>
      ) : viewMode === 'month' ? (
        // ===== Vista MES (lista) =====
        <MonthListView
          rangeDays={rangeDays}
          getPitchesForDay={getPitchesForDay}
          formatDay={formatDay}
          formatTimeWithAmPm={formatTimeWithAmPm}
          isPastPitch={isPastPitch}
          isToday={isToday}
          onOpenLead={onOpenLead}
          visiblePitchesCount={visiblePitchesCount}
        />
      ) : viewMode === 'day' ? (
        // ===== Vista DÍA (grid horario, 1 columna) =====
        <div ref={calendarScrollRef} className="overflow-auto max-h-[600px]">
          <div className="min-w-[400px]">
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className={`text-center ${isToday(rangeStart) ? 'text-[#1717AF]' : 'text-slate-600'}`}>
                <div className="text-sm font-medium">{formatDay(rangeStart)}</div>
                <div className={`text-3xl font-bold mt-1 ${
                  isToday(rangeStart)
                    ? 'w-12 h-12 rounded-full bg-[#1717AF] text-white flex items-center justify-center mx-auto'
                    : ''
                }`}>
                  {rangeStart.getDate()}
                </div>
              </div>
            </div>
            {hours.map((hour) => {
              const slotPitches = getPitchesForSlot(rangeStart, hour);
              return (
                <div key={hour} className="flex border-b border-slate-50 min-h-[70px]">
                  <div className="w-20 p-3 text-xs font-medium text-slate-400 border-r border-slate-100 text-right flex-shrink-0">
                    {formatHour(hour)}
                  </div>
                  <div className="flex-1 p-2 relative">
                    {slotPitches.map((pitch) => (
                      <div
                        key={pitch.pitch_resultado_id || `agendado-${pitch.card_id}`}
                        onClick={() => onOpenLead?.(pitch)}
                        className={`rounded-xl px-4 py-3 text-sm font-medium shadow-sm mb-2 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer border ${
                          getPitchCardClasses(pitch, isPastPitch(pitch.fecha_pitch_calendario))
                        }`}
                      >
                        <div className="font-semibold">{pitch.nombre}</div>
                        <div className="text-xs opacity-80 mt-1">
                          {formatTimeWithAmPm(pitch.fecha_pitch_calendario)} - 1 hora
                        </div>
                        <div className="text-xs opacity-60 mt-0.5">
                          {pitch.comercial_email?.split('@')[0] || 'Sin asignar'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ===== Vista PERIODO (grid horario, N columnas: 7 días Mar-Lun por defecto) =====
        <div ref={calendarScrollRef} className="overflow-auto max-h-[600px]">
          <div className="min-w-[800px]">
            <div
              className="grid border-b border-slate-100 sticky top-0 bg-white z-30"
              style={{ gridTemplateColumns: `80px repeat(${rangeDays.length}, minmax(0, 1fr))` }}
            >
              <div className="p-3 text-xs font-medium text-slate-400 border-r border-slate-100">
                GMT-05
              </div>
              {rangeDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-3 text-center border-r border-slate-100 last:border-r-0 ${
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
            {hours.map((hour) => (
              <div
                key={hour}
                className="grid border-b border-slate-50 min-h-[70px]"
                style={{ gridTemplateColumns: `80px repeat(${rangeDays.length}, minmax(0, 1fr))` }}
              >
                <div className="p-2 text-xs font-medium text-slate-400 border-r border-slate-100 text-right pr-3">
                  {formatHour(hour)}
                </div>
                {rangeDays.map((day, dayIndex) => {
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
                            key={pitch.pitch_resultado_id || `agendado-${pitch.card_id}`}
                            onClick={(e) => { e.stopPropagation(); onOpenLead?.(pitch); }}
                            className={`absolute rounded-lg px-1.5 py-1 text-xs font-medium shadow-sm transition-all hover:z-20 hover:scale-[1.03] hover:shadow-lg cursor-pointer border-2 ${
                              getPitchCardClasses(pitch, isPastPitch(pitch.fecha_pitch_calendario))
                            }`}
                            style={{
                              top: '2px',
                              left,
                              width,
                              height: 'calc(100% - 4px)',
                              zIndex: 10 + pitchIndex,
                            }}
                            title={`${pitch.nombre} - ${pitch.comercial_email?.split('@')[0] || ''} - Clic para ver detalles`}
                          >
                            <div className="truncate font-semibold text-[11px]">
                              {pitch.nombre?.split(' ')[0]}
                            </div>
                            <div className="truncate text-[9px] opacity-90">
                              {formatTimeWithAmPm(pitch.fecha_pitch_calendario)}
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
        </div>
      )}

      {/* Footer: contador de pitches visibles (post-filtro) */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
        <div className="text-xs text-slate-400">
          {visiblePitchesCount} pitch{visiblePitchesCount !== 1 ? 'es' : ''} en esta vista
          {selectedStateIds.size > 0 && (
            <span className="text-slate-500"> (filtrado)</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Vista MES como lista: cada día con pitches se muestra como una sección
// con encabezado de fecha y filas clickeables (abren el sidebar).
// ============================================================================
function MonthListView({
  rangeDays,
  getPitchesForDay,
  formatDay,
  formatTimeWithAmPm,
  isPastPitch,
  isToday,
  onOpenLead,
  visiblePitchesCount,
}) {
  // Construir grupos: solo días con pitches visibles tras filtros.
  const groups = useMemo(() => {
    return rangeDays
      .map(day => ({ day, items: getPitchesForDay(day) }))
      .filter(g => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, getPitchesForDay]);

  if (visiblePitchesCount === 0) {
    return (
      <div className="px-6 py-16 text-center text-slate-400">
        <div className="text-sm">No hay pitches en este mes</div>
        <div className="text-xs mt-1">Prueba con otro periodo o limpia los filtros de estado.</div>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px]">
      <div className="divide-y divide-slate-100">
        {groups.map(({ day, items }) => (
          <div key={day.toISOString()}>
            {/* Encabezado del día (sticky) */}
            <div className={`px-6 py-2 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100 ${
              isToday(day) ? 'bg-[#1717AF]/5' : 'bg-white/95'
            }`}>
              <div className="flex items-baseline gap-3">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  isToday(day) ? 'text-[#1717AF]' : 'text-slate-400'
                }`}>
                  {formatDay(day)}
                </span>
                <span className={`text-base font-bold ${
                  isToday(day) ? 'text-[#1717AF]' : 'text-slate-700'
                }`}>
                  {day.getDate()}
                </span>
                <span className="text-xs text-slate-400">
                  {items.length} pitch{items.length !== 1 ? 'es' : ''}
                </span>
              </div>
            </div>
            {/* Filas */}
            <div>
              {items.map(pitch => {
                const past = isPastPitch(pitch.fecha_pitch_calendario);
                const cls = getPitchCardClasses(pitch, past);
                return (
                  <div
                    key={pitch.pitch_resultado_id || `agendado-${pitch.card_id}`}
                    onClick={() => onOpenLead?.(pitch)}
                    className="group px-6 py-3 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 border-transparent hover:border-[#1717AF]/40"
                  >
                    {/* Hora */}
                    <div className="w-24 flex-shrink-0 text-sm font-mono text-slate-600 tabular-nums">
                      {formatTimeWithAmPm(pitch.fecha_pitch_calendario)}
                    </div>
                    {/* Chip de estado */}
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${cls}`}>
                      {(() => {
                        const st = getStateLabel(pitch);
                        return st;
                      })()}
                    </div>
                    {/* Nombre del lead */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {pitch.nombre || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {pitch.comercial_email?.split('@')[0] || 'Sin asignar'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper local: obtiene el label del estado para el chip de la lista.
const getStateLabel = (pitch) => {
  const state = getPitchState(pitch);
  return state?.label || 'Estado';
};
