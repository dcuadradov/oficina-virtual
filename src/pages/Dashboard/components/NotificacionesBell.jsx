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

/**
 * Reproduce un sonido de notificación usando un Audio element (más simple y rápido)
 */
const playNotificationSound = () => {
  try {
    // Crear un beep simple usando un data URI de audio
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZaYl5KMhHp0d3+Ij5SWl5WRi4N7dXZ9hYySlpeTkYmBenZ3foeOk5aTkYeCenZ4gIiQlJWTj4eBenZ5goqRlJOPjIF5dXmCio+TkpCLgXl1eYKKj5KRjoqAdnV6g4uQkY+MhX53eICHjZCPjYmDfHd5f4aNj46MiIN8d3l/hYuOjYuIg3x3eX+Fi42Mi4eDfHd5f4WLjIuKhoJ7d3l/hYuMi4qGgnt3eX+Fi4yLioaCe3d5f4WLjIuKhoJ7d3l/hYqLioqGgnt3eX+EiouKiYWBe3d5f4SKi4qJhYF7d3l/hIqLiomFgXt3eX+EiouKiYWBe3d5f4SKi4qJhYF7eHmAhIqKiYmFgXt4eYCEioqJiYWBe3h5gISKiomJhYF7eHmAhIqJiYmFgHt4eYCEiomJiYWAe3h5gISKiYmJhYB7eHmAhIqJiYmFgHt4eYCEiYmJiIV/e3h5gISJiYmIhX97eHmAhImJiYiFf3t4eYCEiYmJiIV/e3h5gISJiYiIhX97eHl/hImJiIiFf3t4eX+EiYmIiIV/e3h5f4SJiYiIhH97eHl/hImIiIiEf3t4eX+EiYiIiIR/e3h5f4SJiIiIhH97eHl/hImIiIiEf3t4eX+EiIiIh4R+e3h5f4SIiIiHhH57eHl/hIiIiIeEfnt4eX+EiIiIh4R+e3h5f4SIiIeHhH57eHl/hIiIh4eEfnt3eX+EiIiHh4R+e3d5f4SIiIeHhH57d3l/g4iHh4eEfnt3eX+DiIeHh4R+e3d5f4OIh4eHhH57d3l/g4iHh4eEfnt3eX+DiIeHh4N+e3d5f4OIh4eHg357d3h/g4eHh4eDfnt3eH+Dh4eHh4N+e3d4f4OHh4eHg357d3h/g4eHh4eDfnt3eH+Dh4eHhoN+e3d4f4OHh4eGg357d3h/g4eHhoaDfXt3eH+Dh4eGhoN9e3d4f4OHhoaGg317d3h/g4eGhoaDfXt3eH+DhoaGhoN9e3d4f4OGhoaGg317d3h/g4aGhoaDfXt2eH+DhoaGhoN9e3Z4foOGhoaGg317dnh+g4aGhoaDfXt2eH6DhoaGhoN9e3Z4foOGhoaGg317dnh+g4aGhoaDfHt2eH6DhoaGhoN8e3Z4foOGhoaFg3x7dnh+g4aGhoWDfHt2eH6DhoaGhYN8e3Z4foOGhoWFg3x7dnh+g4aGhYWDfHt2eH6DhoWFhYN8e3Z4foOGhYWFg3x7dnh+g4aFhYWDfHt2eH6DhoWFhYN8e3Z3foOFhYWFgnx7dnd+g4WFhYWCfHt2d36DhYWFhYJ8e3Z3foOFhYWFgnx7dnd+g4WFhYWCfHt2d36DhYWFhYJ8e3Z3foOFhYWFgnx7dnd+g4WFhYWCfHt2d36DhYWFhIJ8e3Z3foOFhYWEgnx7dnd+g4WFhYSCfHt2d36DhYWFhIJ8e3Z3foOFhYSEgnx7dnd+g4WFhISCe3t2d36DhYSEhIJ7e3Z3foOFhISEgnt7dnd+g4WEhISCe3t2d36DhYSEhIJ7e3Z3foKEhISEgnt7dnd+goSEhISCe3t2d36ChISEhIJ7e3Z3foKEhISEgnt7dnd+goSEhISCe3t2d36ChISEg4J7e3Z3foKEhISDgnt6dnd+goSEhIOCe3p2d36ChISEg4J7enZ3foKEhISDgnt6dnd+goSEhIOCe3p2dn6ChISEg4J7enZ2fn6EhISDgnt6dnZ+foSEg4OCe3p2dn5+hISDg4J7enZ2fn6Eg4ODgnt6dnZ+foSDg4OCe3p2dn5+hIODg4J7enZ2fn6Eg4ODgnt6dnV+foSDg4OCe3p1dX5+hIODg4J6enV1fn6Eg4ODgnp6dXV+foSDg4OCenp1dX5+hIODgoJ6enV1fn6Eg4OCgnp6dXV+foSDg4KCenp1dX5+g4OCgoJ6enV1fn6Dg4KCgnp6dXV+foODgoKCenp1dX5+g4OCgoJ6enV1fn6Dg4KCgnp6dXV9foODgoKCenp1dX1+g4KCgoJ6enV1fX6DgoKCgnp6dXV9foOCgoKCenp1dX1+g4KCgoJ6enV1fX6DgoKCgnp6dXV9foOCgoKCenl1dX1+g4KCgoJ6eXV1fX6CgoKCgnp5dXV9foKCgoKCenl1dX1+goKCgoJ6eXV1fX6CgoKCgnp5dXV9foKCgoKCenl1dX1+goKCgoJ6eXV1fX6CgoKCgnp5dXV9foKCgoKCenl1dX1+goKCgoF6eXV1fX6CgoKCgXp5dXV9foKCgoKBenl1dX1+goKCgoF6eXV1fX6CgoKCgXp5dXV9foKCgoKBenl1dX1+goKCgYF6eXV0fX6CgoKBgXp5dXR9foKCgoGBenl1dH1+goKCgYF6eXV0fX6CgoKBgXp5dXR9foKCgoGBenl1dH1+goKBgYF6eXV0fX6CgoGBgXp5dXR9foKCgYGBenl1dH1+goKBgYF6eXV0fX6CgoGBgXp5dXR9foKBgYGBenl1dH1+goGBgYF6eXV0fX6CgYGBgXp5dHR9foKBgYGBenl0dH1+goGBgYF6eXR0fX6CgYGBgXp5dHR9foKBgYGBenl0dH19goGBgYF6eXR0fX2CgYGBgXp5dHR9fYKBgYGBenl0dH19goGBgYF6eXR0fX2CgYGBgXp5dHR9fYKBgYGBenh0dH19goGBgYF6eHR0fX2BgYGBgXp4dHR9fYGBgYGBenh0dH19gYGBgYF6eHR0fX2BgYGBgXp4dHR9fYGBgYGBenh0dH19gYGBgYF6eHR0fX2BgYGBgXp4c3R9fYGBgYGBeXhzdH19gYGBgYF5eHN0fX2BgYGBgXl4c3R9fYGBgYGBeXhzdH19gYGBgYF5eHN0fX2BgYGBgXl4c3R9fYGBgYGBeXhzdH19gYGBgYF5eHN0fX2BgYGBgHl4c3R8fYGBgYGAeXhzdHx9gYGBgYB5eHN0fH2BgYGBgHl4c3R8fYGBgYGAeXhzdHx9gYGBgYB5eHN0fH2BgYGBgHl4c3R8fYGBgYCAeXhzdHx9gYGAgIB5eHN0fH2BgYCAgHl4c3R8fYGBgICAeXhzdHx9gYGAgIB5eHN0fH2BgYCAgHl4cnR8fYGBgICAeXhydHx9gYCAgIB5eHJ0fH2BgICAgHl4cnR8fYGAgICAeXhydHx9gYCAgIB5eHJ0fH2BgICAgHl4cnR8fYGAgICAeXhydHx9gYCAgIB5eHJ0fH2AgICAgHl3cnR8fYCAgICAeXdydHx9gICAgIB5d3J0fH2AgICAgHl3cnR8fYCAgICAeXdydHx9gICAgIB5d3J0fH2AgICAgHl3cnR8fYCAgIB/eXdydHx8gICAgH95d3J0fHyAgICAf3l3cnR8fICAgIB/eXdydHx8gICAgH95d3J0fHyAgICAf3l3cnR8fICAgIB/eXdydHx8gICAgH95d3J0fHyAgICAf3l3cnR8fICAgIB/eXdycnx8gICAgH95d3JyfHyAgIB/f3l3cnJ8fICAgH9/eXdycnx8gICAf395d3JyfHyAgIB/f3l3cnJ8fICAgH9/eXdycnx8gICAf395d3JyfHyAgIB/f3l3cnJ8fICAgH9/eXdycnx8gICAf395dnJyfHyAgIB/f3l2cnJ8fICAgH9/eXZycnx8gIB/f395dnJyfHyAgH9/f3l2cnJ8fICAfn9/eXZycnx8gIB+f395dnJyfHyAgH5/f3l2cnJ8fICAfn9/eXZycnx8gIB+f395dnJyfHyAgH5/f3l2cnJ8fICAf39/eXZycnx8gIB/f395dnJyfHyAgH9/f3l2cnJ8fICAf39/eXZycnx8gIB/f395dnJyfHyAgH9/f3l2cnJ8e4CAf39/eXZycnx7gIB/f395dnJyfHuAgH9/f3l2cnJ8e4CAf39/eXZycnx7gIB/f395dnJyfHuAgH9/f3l2cnJ8e4CAf39/eXZycXx7gIB/f395dnJxfHuAgH9/f3l2cnF8e4CAf39/eXZycXx7gIB/f395dnJxfHuAgH9/f3l2cnF8e4CAf39/eXZycXx7gIB/f395dnJxfHuAgH9/f3l2cnF8e4CAf39/eXZycXx7gIB/f395dnJxfHuAgH9/f3l2cnF8e4CAf39/eXZycXt7gIB/f395dnFxe3uAgH9/f3l2cXF7e4CAf39/eXZxcXt7gIB/f395dnFxe3uAgH9/f3l2cXF7e4CAf39/eXZxcXt7gIB/f395dnFxe3uAgH9/f3l2cXF7e4CAf39/eHZxcXt7gIB/f394dnFxe3uAgH9/f3h2cXF7e4CAf39/eHZxcXt7gIB/f394dnFxe3uAgH9/f3h2cXF7e4CAf39/eHZxcXt7gIB/f394dnFxe3uAgH9/f3h2cXF7e4CAf39/eHZxcXt7f4B/f394dnFxe3t/gH9/f3h2cXF7e3+Af39/eHZxcXt7f4B/f394dnFxe3t/gH9/f3h2cXF7e3+Af39/eHVxcXt7f4B/f394dXFxe3t/gH9/f3h1cXF7e3+Af39/eHVxcXt7f4B/f394dXFxe3t/gH9/f3h1cXF7e3+Af39/eHVxcXt7f4B/f394dXFxe3t/gH9/f3h1cXF7e3+Af39/eHVxcXt7f4B/f394dXFxe3t/gH9/f3h1cXF7e3+Af39/eHVxcHt7f4B/f394dXFwe3t/gH9/f3h1cXB7e3+Af39/eHVxcHt7f4B/f394dXFwe3t/gH9/f3h1cXB7e3+Af39/eHVxcHt7f4B/f394dXFwe3t/gH9/f3h1cXB7e3+Af39/eHVxcHt7f39/f394dXFwe3t/f39/f3h1cXB7e39/f39/eHVxcHt7f39/f394dXFwe3t/f39/f3h1cXB7e39/f39/eHVxcHt7f39/f394dXFwe3t/f39/f3h1cXB7e39/f39/eHVxcHt7f39/f394dXFwe3t/f39/f3h1cHB7e39/f39/eHVwcHt7f39/f394dXBwe3t/f39/f3h1cHB7e39/f39/eHVwcHt7f39/f394dXBwe3t/f39/f3h1cHB7e39/f39/eHVwcHt7f39/f394dXBwe3t/f39/f3h1cHB6e39/f39/eHVwcHp7f39/f394dXBwent/f39/f3h1cHB6e39/f39/eHVwcHp7f39/f394dXBwent/f39/f3h1cHB6e39/f39/eHVwcHp7f39/f394dXBwent/f39/f3h0cHB6e39/f39/eHRwcHp7f39/f394dHBwent/f39/f3h0cHB6e39/f39/eHRwcHp7f39/f394dHBwent/f39/f3h0cHB6e39/f39/eHRwcHp7f39/f394dHBwent/f39/f3h0cHB6e39/f39/eHRwcHp7f39/f394dHBwent/f39/f3h0cHB6e39/f35/eHRwcHp7f39/fn94dHBwent/f39+f3h0cHB6e39/f35/eHRwcHp7f39/fn94dHBwent/f39+f3h0cHB6e39/f35/eHRwcHp7f39/fn94dHBwent/f35+f3h0cHB6e39/fn5/eHRwb3p7f39+fn94dHBvent/f35+f3h0cG96e39/fn5/eHRwb3p7f39+fn94dHBvent/f35+f3h0cG96e39/fn5/eHRwb3p7f39+fn94dHBvent/fn5+f3h0cG96e39+fn5/eHRwb3p7f35+fn94dHBvent/fn5+f3h0cG96e39+fn5/eHRwb3p7f35+fn94dHBvent/fn5+f3h0cG96e39+fn5/eHRwb3p7f35+fn94dHBvent+fn5+f3h0cG96e35+fn5/eHRwb3p7fn5+fn94dHBvent+fn5+f3h0cG96e35+fn5/eHRwb3p7fn5+fn94dHBvent+fn5+f3h0cG96e35+fn5/eHRwb3p7fn5+fn94dHBvent+fn5+f3h0cG96e35+fn5/eHRvb3p7fn5+fn94dG9vent+fn5+f3h0b296e35+fn5/eHRvb3p7fn5+fn94dG9vent+fn5+f3h0b296e35+fn5/eHRvb3p7fn5+fn94dG9vent+fn5+f3h0b296e35+fn5/eHRvb3p7fn5+fn94dG9vent+fn5+f3h0b296e35+fn5+eHRvb3p7fn5+fn54dG9vent+fn5+fnh0b296e35+fn5+eHRvb3p7fn5+fn54dG9vent+fn5+fnh0b296e35+fn5+eHRvb3p7fn5+fn54dG9vent+fn5+fnh0b296e35+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54dG9venp+fn5+fnh0b296en5+fn5+eHRvb3p6fn5+fn54c29venp+fn5+fndz');
    audio.volume = 0.5;
    audio.play();
    console.log('🔊 Sonido reproducido');
  } catch (error) {
    console.log('No se pudo reproducir sonido:', error);
  }
};

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

  // Ref para guardar el contador anterior (para detectar nuevas notificaciones)
  const contadorAnteriorRef = useRef(null);

  // Fetch contador de nuevas (solo estado "nuevo", no "visto")
  // Si el contador aumenta, reproduce el sonido inmediatamente
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
      
      // Si el contador aumentó (y no es la carga inicial), reproducir sonido
      if (contadorAnteriorRef.current !== null && nuevoContador > contadorAnteriorRef.current) {
        console.log(`🔔 Nuevas notificaciones: ${contadorAnteriorRef.current} → ${nuevoContador}`);
        playNotificationSound();
      }
      
      // Actualizar ref y estado al mismo tiempo
      contadorAnteriorRef.current = nuevoContador;
      setContadorNuevas(nuevoContador);
    } catch (error) {
      console.error('Error fetching contador:', error);
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

