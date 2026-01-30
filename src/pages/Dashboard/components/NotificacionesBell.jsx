import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Calendar, CalendarPlus, CalendarClock, Flame, RotateCcw, UserPlus, Clock, ExternalLink, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Mapeo de íconos por nombre
const ICONOS = {
  calendar: Calendar,
  'calendar-plus': CalendarPlus,
  'calendar-clock': CalendarClock,
  flame: Flame,
  refresh: RotateCcw,
  user: UserPlus,
  clock: Clock,
  users: Users,
  alert: AlertCircle,
  bell: Bell
};

// Número de notificaciones por página
const NOTIFICACIONES_PER_PAGE = 10;

// Variable global para el contador anterior (persistente entre renders)
let contadorAnteriorGlobal = null;

/**
 * Formatea el tiempo relativo (hace X minutos, horas, días)
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffSeconds = Math.floor((now - date) / 1000);
  
  if (diffSeconds < 60) return 'Ahora';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function NotificacionesBell({ userEmail, onOpenLead }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [contadorNuevas, setContadorNuevas] = useState(0);
  
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Fetch de notificaciones
  const fetchNotificaciones = useCallback(async (pageNum = 0, append = false) => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('notificaciones')
        .select(`
          *,
          config:config_notificaciones (
            tipo,
            icono
          )
        `, { count: 'exact' })
        .eq('comercial_email', userEmail)
        .order('created_at', { ascending: false })
        .range(pageNum * NOTIFICACIONES_PER_PAGE, (pageNum + 1) * NOTIFICACIONES_PER_PAGE - 1);

      if (error) throw error;

      if (append) {
        setNotificaciones(prev => [...prev, ...(data || [])]);
      } else {
        setNotificaciones(data || []);
      }
      
      setHasMore((data?.length || 0) === NOTIFICACIONES_PER_PAGE);
    } catch (error) {
      console.error('Error fetching notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Fetch contador + sonido si hay nuevas
  const fetchContador = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      const { count, error } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('comercial_email', userEmail)
        .eq('estado_lectura', 'nuevo');

      if (error) throw error;
      
      const nuevoContador = count || 0;
      
      // Si es carga inicial, solo guardar el contador
      if (contadorAnteriorGlobal === null) {
        contadorAnteriorGlobal = nuevoContador;
        setContadorNuevas(nuevoContador);
        console.log(`📊 Carga inicial: ${nuevoContador} notificaciones`);
        return;
      }
      
      // Si el contador aumentó, actualizar y sonar
      if (nuevoContador > contadorAnteriorGlobal) {
        console.log(`🔔 Nuevas: ${contadorAnteriorGlobal} → ${nuevoContador}`);
        
        // 1. Actualizar estado
        contadorAnteriorGlobal = nuevoContador;
        setContadorNuevas(nuevoContador);
        
        // 2. Reproducir sonido (beep simple)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.3;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          console.log('🔊 Sonido');
        } catch (e) {
          console.log('Sin sonido');
        }
      } else {
        // Solo actualizar si cambió (puede bajar)
        if (nuevoContador !== contadorAnteriorGlobal) {
          contadorAnteriorGlobal = nuevoContador;
          setContadorNuevas(nuevoContador);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [userEmail]);

  // Cargar más notificaciones (infinite scroll)
  const loadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotificaciones(nextPage, true);
  };

  // Marcar como visto (cuando cierra el dropdown)
  const marcarComoVisto = async () => {
    if (!userEmail) return;
    
    const notificacionesNuevas = notificaciones
      .filter(n => n.estado_lectura === 'nuevo')
      .map(n => n.id);
    
    if (notificacionesNuevas.length === 0) return;

    try {
      await supabase
        .from('notificaciones')
        .update({ 
          estado_lectura: 'visto',
          visto_at: new Date().toISOString()
        })
        .in('id', notificacionesNuevas);

      // Actualizar estado local
      setNotificaciones(prev => 
        prev.map(n => 
          notificacionesNuevas.includes(n.id) 
            ? { ...n, estado_lectura: 'visto', visto_at: new Date().toISOString() }
            : n
        )
      );
      
      fetchContador();
    } catch (error) {
      console.error('Error marcando como visto:', error);
    }
  };

  // Marcar como abierto y abrir lead
  const handleNotificacionClick = async (notificacion) => {
    // Marcar como abierto
    if (notificacion.estado_lectura !== 'abierto') {
      try {
        await supabase
          .from('notificaciones')
          .update({ 
            estado_lectura: 'abierto',
            abierto_at: new Date().toISOString()
          })
          .eq('id', notificacion.id);

        // Actualizar estado local
        setNotificaciones(prev => 
          prev.map(n => 
            n.id === notificacion.id 
              ? { ...n, estado_lectura: 'abierto', abierto_at: new Date().toISOString() }
              : n
          )
        );
        
        fetchContador();
      } catch (error) {
        console.error('Error marcando como abierto:', error);
      }
    }

    // Cerrar dropdown y abrir lead
    setIsOpen(false);
    if (onOpenLead && notificacion.card_id) {
      onOpenLead(notificacion.card_id);
    }
  };

  // Toggle dropdown
  const toggleDropdown = async () => {
    // Inicializar/desbloquear AudioContext al primer click (requerido por navegadores)
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (e) { /* ignorar */ }
    
    if (!isOpen) {
      setPage(0);
      fetchNotificaciones(0, false);
    } else {
      // Al cerrar, marcar como visto
      marcarComoVisto();
    }
    setIsOpen(!isOpen);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        if (isOpen) {
          marcarComoVisto();
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, notificaciones]);

  // Heartbeat: polling cada 10 segundos (actualiza contador + sonido si hay nuevas)
  // También hace el fetch inicial al montarse
  useEffect(() => {
    if (!userEmail) return;
    
    // Fetch inicial
    fetchContador();
    
    // Heartbeat cada 10 segundos
    const heartbeatInterval = setInterval(fetchContador, 10000);
    
    return () => clearInterval(heartbeatInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]); // Solo depende de userEmail, no de fetchContador

  // Obtener ícono del componente
  const getIcono = (iconoNombre) => {
    const IconComponent = ICONOS[iconoNombre] || Bell;
    return IconComponent;
  };

  return (
    <div className="relative">
      {/* Botón campanita */}
      <button
        ref={bellRef}
        onClick={toggleDropdown}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
          isOpen 
            ? 'bg-[#1717AF] text-white' 
            : 'text-slate-500 hover:text-[#1717AF] hover:bg-blue-50 border border-transparent hover:border-blue-100'
        }`}
        title="Notificaciones"
      >
        <Bell size={18} />
        
        {/* Badge contador */}
        {contadorNuevas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold bg-rose-500 text-white rounded-full px-1.5 shadow-lg shadow-rose-200">
            {contadorNuevas > 99 ? '99+' : contadorNuevas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 top-16 sm:top-full mt-2 w-[calc(100vw-32px)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-base font-bold text-slate-800">Notificaciones</h3>
            {contadorNuevas > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {contadorNuevas} sin leer
              </p>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div 
            className="overflow-y-auto"
            style={{ maxHeight: '380px' }}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.target;
              if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading) {
                loadMore();
              }
            }}
          >
            {notificaciones.length === 0 && !loading ? (
              <div className="px-5 py-12 text-center">
                <Bell size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <>
                {notificaciones.map((notif) => {
                  const IconComponent = getIcono(notif.config?.icono);
                  const esNuevo = notif.estado_lectura === 'nuevo';
                  const esVisto = notif.estado_lectura === 'visto';
                  const esAbierto = notif.estado_lectura === 'abierto';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificacionClick(notif)}
                      className={`px-5 py-4 border-b border-slate-100 cursor-pointer transition-all duration-200 ${
                        esNuevo 
                          ? 'bg-blue-100 hover:bg-blue-150 border-l-4 border-l-blue-500' 
                          : esVisto 
                            ? 'bg-slate-100 hover:bg-slate-150 border-l-4 border-l-slate-300'
                            : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Ícono */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          esNuevo 
                            ? 'bg-[#1717AF] text-white' 
                            : esVisto
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          <IconComponent size={18} />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${
                              esAbierto ? 'text-slate-500' : 'text-slate-800 font-medium'
                            }`}>
                              {notif.config?.tipo || 'Notificación'}
                            </p>
                            
                            {esNuevo && (
                              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#1717AF] bg-blue-100 px-2 py-0.5 rounded-full">
                                Nuevo
                              </span>
                            )}
                          </div>
                          
                          <p className={`text-sm mt-0.5 leading-snug ${
                            esAbierto ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {notif.descripcion || notif.nombre_lead}
                          </p>
                          
                          <p className="text-xs text-slate-400 mt-1.5">
                            {formatTimeAgo(notif.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading */}
                {loading && (
                  <div className="px-5 py-4 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-[#1717AF] rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </div>
                )}

                {/* No más notificaciones */}
                {!hasMore && notificaciones.length > 0 && (
                  <div className="px-5 py-4 text-center text-xs text-slate-400">
                    No hay más notificaciones
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

