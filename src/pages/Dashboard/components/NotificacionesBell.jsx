import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Calendar, CalendarPlus, CalendarClock, CalendarCheck, Flame, RotateCcw, UserPlus, UserCheck, Clock, Users, AlertCircle, CheckCheck, Megaphone, Star, Zap, MessageSquare, RefreshCw, Sparkles, Copy, FolderOpen } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const ICONOS = {
  calendar: Calendar,
  'calendar-plus': CalendarPlus,
  'calendar-clock': CalendarClock,
  'calendar-check': CalendarCheck,
  flame: Flame,
  refresh: RotateCcw,
  'rotate-ccw': RotateCcw,
  user: UserPlus,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  clock: Clock,
  users: Users,
  alert: AlertCircle,
  'alert-circle': AlertCircle,
  bell: Bell,
  'check-check': CheckCheck,
  megaphone: Megaphone,
  star: Star,
  zap: Zap,
  'message-square': MessageSquare,
  'folder-open': FolderOpen,
  'refresh-cw': RefreshCw,
  sparkles: Sparkles,
  copy: Copy
};


const NOTIFICACIONES_PER_PAGE = 10;

let audioContextInstance = null;
let ultimoSonidoTimestamp = 0;

const getAudioContext = () => {
  if (!audioContextInstance) {
    audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContextInstance;
};

const playNotificationSound = async () => {
  const ahora = Date.now();
  if (ahora - ultimoSonidoTimestamp < 2000) return;
  ultimoSonidoTimestamp = ahora;
  
  try {
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('No se pudo reproducir sonido:', error);
  }
};

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

  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState(null);

  // Acumula IDs de notificaciones 'nuevo' que se mostraron, para marcar solo esas al cerrar
  const notificacionesMostradasRef = useRef(new Set());

  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const contadorAnteriorRef = useRef(null);

  const fetchCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_notificaciones')
        .select('id, categoria, icono')
        .eq('activo', true);
      
      if (error) throw error;
      
      const catMap = {};
      (data || []).forEach(config => {
        const cat = config.categoria || 'Otros';
        if (!catMap[cat]) {
          catMap[cat] = { nombre: cat, icono: config.icono, configIds: [] };
        }
        catMap[cat].configIds.push(config.id);
      });
      
      return Object.values(catMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (error) {
      console.error('Error fetching categorias:', error);
      return [];
    }
  }, []);

  const fetchConteosCategorias = useCallback(async (cats) => {
    if (!userEmail || !cats.length) return cats;
    
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('config_id')
        .eq('comercial_email', userEmail)
        .eq('estado_lectura', 'nuevo');
      
      if (error) throw error;
      
      const countMap = {};
      (data || []).forEach(n => {
        countMap[n.config_id] = (countMap[n.config_id] || 0) + 1;
      });
      
      return cats.map(cat => ({
        ...cat,
        conteo: cat.configIds.reduce((sum, id) => sum + (countMap[id] || 0), 0)
      }));
    } catch (error) {
      console.error('Error fetching conteos:', error);
      return cats;
    }
  }, [userEmail]);

  const fetchNotificaciones = useCallback(async (pageNum = 0, append = false, configIds = null) => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('notificaciones')
        .select('*, config:config_notificaciones(tipo, icono, categoria)', { count: 'exact' })
        .eq('comercial_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (configIds && configIds.length > 0) {
        query = query.in('config_id', configIds);
      }
      
      query = query.range(pageNum * NOTIFICACIONES_PER_PAGE, (pageNum + 1) * NOTIFICACIONES_PER_PAGE - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      
      (data || []).forEach(n => {
        if (n.estado_lectura === 'nuevo') {
          notificacionesMostradasRef.current.add(n.id);
        }
      });
      
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
      
      if (contadorAnteriorRef.current !== null && nuevoContador > contadorAnteriorRef.current) {
        playNotificationSound();
      }
      
      contadorAnteriorRef.current = nuevoContador;
      setContadorNuevas(nuevoContador);
    } catch (error) {
      console.error('Error fetching contador:', error);
    }
  }, [userEmail]);

  const loadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    const currentCat = categorias.find(c => c.nombre === selectedCategoria);
    fetchNotificaciones(nextPage, true, currentCat?.configIds || null);
  };

  const marcarComoVisto = useCallback(async () => {
    if (!userEmail) return;
    
    const ids = Array.from(notificacionesMostradasRef.current);
    if (ids.length === 0) return;

    try {
      await supabase
        .from('notificaciones')
        .update({ estado_lectura: 'visto', visto_at: new Date().toISOString() })
        .in('id', ids);

      setNotificaciones(prev =>
        prev.map(n =>
          ids.includes(n.id)
            ? { ...n, estado_lectura: 'visto', visto_at: new Date().toISOString() }
            : n
        )
      );
      
      notificacionesMostradasRef.current = new Set();
      fetchContador();
    } catch (error) {
      console.error('Error marcando como visto:', error);
    }
  }, [userEmail, fetchContador]);

  const handleNotificacionClick = async (notificacion) => {
    if (notificacion.estado_lectura !== 'abierto') {
      try {
        await supabase
          .from('notificaciones')
          .update({ estado_lectura: 'abierto', abierto_at: new Date().toISOString() })
          .eq('id', notificacion.id);

        notificacionesMostradasRef.current.delete(notificacion.id);

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

    marcarComoVisto();
    setIsOpen(false);
    
    if (onOpenLead && notificacion.card_id) {
      onOpenLead(notificacion.card_id);
    }
  };

  const toggleDropdown = async () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
    } catch (e) { /* ignorar */ }
    
    if (!isOpen) {
      notificacionesMostradasRef.current = new Set();
      
      const cats = await fetchCategorias();
      const catsWithCounts = await fetchConteosCategorias(cats);
      setCategorias(catsWithCounts);
      
      const firstWithNotifs = catsWithCounts.find(c => c.conteo > 0);
      const selected = firstWithNotifs || catsWithCounts[0];
      setSelectedCategoria(selected?.nombre || null);
      
      setPage(0);
      fetchNotificaciones(0, false, selected?.configIds || null);
    } else {
      marcarComoVisto();
    }
    setIsOpen(!isOpen);
  };

  const handleCategoriaClick = (cat) => {
    if (cat.nombre === selectedCategoria) return;
    setSelectedCategoria(cat.nombre);
    setPage(0);
    fetchNotificaciones(0, false, cat.configIds);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        if (isOpen) marcarComoVisto();
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, marcarComoVisto]);

  useEffect(() => {
    if (!userEmail) return;
    fetchContador();
    const interval = setInterval(fetchContador, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    document.title = contadorNuevas > 0
      ? `Portal MD (${contadorNuevas > 99 ? '99+' : contadorNuevas})`
      : 'Portal MD';
  }, [contadorNuevas]);

  const getIcono = (iconoNombre) => ICONOS[iconoNombre] || Bell;

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
          className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 top-16 sm:top-full mt-2 w-[calc(100vw-32px)] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
          style={{ maxHeight: '540px' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-base font-bold text-slate-800">Notificaciones</h3>
            {contadorNuevas > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{contadorNuevas} sin leer</p>
            )}
          </div>

          {/* Filtros de categoría */}
          {categorias.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-center gap-2">
                {categorias.map((cat) => {
                  const IconCat = getIcono(cat.icono);
                  const isSelected = selectedCategoria === cat.nombre;
                  return (
                    <div key={cat.nombre} className="relative group">
                      <button
                        onClick={() => handleCategoriaClick(cat)}
                        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#1717AF] text-white shadow-md shadow-[#1717AF]/25 scale-105'
                            : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <IconCat size={19} strokeWidth={1.8} />
                        <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                          cat.conteo > 0
                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {cat.conteo}
                        </span>
                      </button>
                      {/* Tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        <div className="relative bg-slate-800 text-white text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium shadow-lg">
                          {cat.nombre}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                <p className="text-slate-500 text-sm">No hay notificaciones en esta categoría</p>
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
                          ? 'bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-l-[#1717AF]' 
                          : esVisto 
                            ? 'bg-slate-50 hover:bg-slate-100 border-l-4 border-l-slate-300'
                            : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          esNuevo 
                            ? 'bg-[#1717AF] text-white' 
                            : esVisto
                              ? 'bg-slate-200 text-slate-500'
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          <IconComponent size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${
                              esAbierto ? 'text-slate-500' : 'text-slate-800 font-medium'
                            }`}>
                              {notif.config?.tipo || 'Notificación'}
                            </p>
                            
                            {esNuevo && (
                              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#1717AF] bg-[#1717AF]/10 px-2 py-0.5 rounded-full">
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

                {loading && (
                  <div className="px-5 py-4 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-[#1717AF] rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </div>
                )}

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
