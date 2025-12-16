import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin,
  Briefcase,
  BarChart3,
  Star,
  Sparkles,
  MessageCircle,
  ClipboardList,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  Copy,
  Check,
  Send,
  Loader2,
  CalendarPlus,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Bell,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { getCountryFlag } from '../../../utils/countryFlags';
import { supabase } from '../../../supabaseClient';

// Configuración del stepper del funnel
const funnelSteps = [
  { id: 'Sin contacto', label: 'Sin contacto', shortLabel: 'Contacto' },
  { id: 'Perfilamiento', label: 'Perfilamiento', shortLabel: 'Perfil' },
  { id: 'Pitch agendado', label: 'Pitch agendado', shortLabel: 'Agendado' },
  { id: 'Pitch', label: 'Pitch', shortLabel: 'Pitch' },
  { id: 'Posible matrícula', label: 'Posible matrícula', shortLabel: 'Posible' },
  { id: 'Pendiente de pago', label: 'Pendiente de pago', shortLabel: 'Pago' },
  { id: '¡Nueva matrícula!', label: '¡Nueva matrícula!', shortLabel: '¡Matrícula!' },
  { id: 'Matrícula caída', label: 'Matrícula caída', shortLabel: 'Caída' },
];

// Función para determinar el estado de gestión del lead
const getGestionStatus = (lead) => {
  const now = new Date();
  
  if (lead.fase_nombre_pipefy === "¡Nueva matrícula!" || lead.etapa_funnel === "¡Nueva matrícula!") {
    return 'matriculado';
  }
  if (lead.fase_nombre_pipefy === "Matrícula caída" || lead.etapa_funnel === "Matrícula caída") {
    return 'caido';
  }

  const recordatorios = lead.recordatorios || [];
  if (recordatorios.length === 0) return 'sin-gestionar';
  
  const recordatoriosConFecha = recordatorios.filter(r => r.fecha_programada);
  if (recordatoriosConFecha.length === 0) return 'sin-gestionar';

  const tieneVigente = recordatoriosConFecha.some(r => new Date(r.fecha_programada) >= now);
  if (tieneVigente) return 'gestionado';

  const masReciente = recordatoriosConFecha
    .map(r => new Date(r.fecha_programada))
    .sort((a, b) => b - a)[0];
  
  const horasDiferencia = (now - masReciente) / (1000 * 60 * 60);
  return horasDiferencia > 48 ? 'atrasado' : 'sin-gestionar';
};

// Badges de estado
const statusBadges = {
  'gestionado': { label: 'Gestionado', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'atrasado': { label: 'Atrasado', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'sin-gestionar': { label: 'Sin gestionar', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'matriculado': { label: 'Matriculado', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'caido': { label: 'Matrícula caída', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
};

// Tabs disponibles
const tabs = [
  { id: 'info', label: 'Info general', icon: ClipboardList },
  { id: 'seguimiento', label: 'Seguimiento', icon: BarChart3 },
  { id: 'recordatorio', label: 'Recordatorio', icon: Clock },
  { id: 'formulario', label: 'Formulario', icon: FileText },
];

// Fases donde se muestra el botón de agendar
const FASES_LISTO_AGENDAR = ['339756287', '340855086'];

// Fases donde se muestra el banner de "Pitch agendado"
const FASES_PITCH_AGENDADO = ['339756098', '340566951', '340859031'];

const RECORDATORIOS_PER_PAGE = 10;

const LeadSidebar = ({ lead, isOpen, onClose, initialTab = 'info', onMarcarNoRevisado, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  
  // Estados para recordatorios
  const [recordatorios, setRecordatorios] = useState([]);
  const [loadingRecordatorios, setLoadingRecordatorios] = useState(false);
  const [hasMoreRecordatorios, setHasMoreRecordatorios] = useState(true);
  const [recordatoriosPage, setRecordatoriosPage] = useState(0);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  
  // Filtros de comentarios
  const [filtroEtapa, setFiltroEtapa] = useState(null);
  const [filtroFase, setFiltroFase] = useState(null);
  
  // Estados para el tab Recordatorios
  const [mesActual, setMesActual] = useState(new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState('09:00');
  const [textoRecordatorio, setTextoRecordatorio] = useState('');
  const [programandoRecordatorio, setProgramandoRecordatorio] = useState(false);
  const [recordatoriosDelLead, setRecordatoriosDelLead] = useState([]);
  const [loadingRecordatoriosCalendario, setLoadingRecordatoriosCalendario] = useState(false);
  const [errorRecordatorio, setErrorRecordatorio] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [fechaRecordatorioCreado, setFechaRecordatorioCreado] = useState(null);
  const [subTabRecordatorio, setSubTabRecordatorio] = useState('programar'); // 'programar' | 'historial'
  
  // Estados para historial de recordatorios
  const [historialRecordatorios, setHistorialRecordatorios] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const [totalHistorial, setTotalHistorial] = useState(0);
  const [cancelandoRecordatorio, setCancelandoRecordatorio] = useState(null);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(null); // Guarda el recordatorio a cancelar
  const [recordatorioActivo, setRecordatorioActivo] = useState(null); // Recordatorio activo actual
  const [loadingRecordatorioActivo, setLoadingRecordatorioActivo] = useState(false);
  
  // Estados para booking
  const [urlBooking, setUrlBooking] = useState(null);
  const [loadingUrls, setLoadingUrls] = useState(false);
  
  // Estados para resumen IA
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [resumenIA, setResumenIA] = useState(null);
  const [resumenIAFecha, setResumenIAFecha] = useState(null);
  
  // Determinar si mostrar botón de agendar basado en la fase del lead
  const mostrarBotonAgendar = lead?.fase_id_pipefy && FASES_LISTO_AGENDAR.includes(String(lead.fase_id_pipefy));
  
  // Determinar si mostrar banner de pitch agendado
  const mostrarPitchAgendado = lead?.fase_id_pipefy && FASES_PITCH_AGENDADO.includes(String(lead.fase_id_pipefy));
  
  // Formatear fecha del pitch (sin conversión de zona horaria, soporta formato con T o espacio)
  const formatFechaPitch = (fechaPitch) => {
    if (!fechaPitch) return 'fecha por confirmar';
    // Extraer componentes de la fecha sin conversión de zona horaria
    // Soporta "2025-12-03T18:00:00" o "2025-12-03 18:00:00+00"
    const match = fechaPitch.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return 'fecha por confirmar';
    
    const [, year, month, day, hour, minute] = match;
    const fecha = new Date(year, month - 1, day);
    
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    let h = parseInt(hour);
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12 || 12;
    
    return `${dias[fecha.getDay()]}, ${parseInt(day)} de ${meses[parseInt(month) - 1]}, ${h}:${minute} ${ampm}`;
  };
  
  const recordatoriosContainerRef = useRef(null);
  const userEmail = localStorage.getItem('user_email');
  const userName = localStorage.getItem('user_name') || 'Usuario';

  // Función para copiar al portapapeles
  const handleCopy = async (text, field) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Cargar resumen IA guardado cuando cambia el lead
  useEffect(() => {
    if (lead?.resumen_ia) {
      setResumenIA(lead.resumen_ia);
      setResumenIAFecha(lead.resumen_ia_fecha || null);
    } else {
      setResumenIA(null);
      setResumenIAFecha(null);
    }
  }, [lead?.card_id, lead?.resumen_ia, lead?.resumen_ia_fecha]);

  // Función para generar resumen con IA
  const handleGenerarResumen = async () => {
    if (!lead?.card_id) return;
    
    try {
      setGenerandoResumen(true);
      
      // 1. Obtener comentarios del lead
      const { data: comentarios } = await supabase
        .from('comentarios')
        .select('texto, created_at, origen, fase, etapa_funnel')
        .eq('lead_id', lead.card_id)
        .order('created_at', { ascending: false });
      
      // 2. Obtener recordatorios del lead
      const { data: recordatoriosData } = await supabase
        .from('recordatorios')
        .select('fecha_programada, observacion, estado, fase, etapa_funnel, created_at')
        .eq('lead_id', lead.card_id)
        .order('created_at', { ascending: false });
      
      // 3. Construir el payload con toda la información
      const payload = {
        lead: {
          card_id: lead.card_id,
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          pais: lead.pais,
          ocupacion: lead.ocupacion,
          nivel_ingles: lead.nivel_ingles,
          motivacion: lead.motivacion,
          es_reincidente: lead.es_reincidente,
          pitch_con: lead.pitch_con,
          fase_actual: lead.fase_nombre_pipefy,
          etapa_funnel: lead.etapa_funnel,
          estado_gestion: lead.estado_gestion,
          created_at: lead.created_at,
          updated_at: lead.updated_at
        },
        comentarios: comentarios || [],
        recordatorios: recordatoriosData || []
      };
      
      // 4. Enviar al webhook de n8n
      const response = await fetch('https://api.mdenglish.us/webhook/generar-resumen-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Error al generar resumen');
      }
      
      const result = await response.json();
      
      // 5. Guardar el resumen en la base de datos
      const resumenGenerado = result.resumen_ia || result.resumen;
      const fechaGeneracion = new Date().toISOString();
      
      if (resumenGenerado) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            resumen_ia: resumenGenerado,
            resumen_ia_fecha: fechaGeneracion
          })
          .eq('card_id', lead.card_id);
        
        if (updateError) throw updateError;
        
        setResumenIA(resumenGenerado);
        setResumenIAFecha(fechaGeneracion);
        
        // Refrescar datos del dashboard silenciosamente
        onRefreshData?.();
      } else {
        throw new Error('No se recibió resumen de la IA');
      }
      
    } catch (error) {
      console.error('Error generando resumen:', error);
      alert('No se pudo generar el resumen. Intenta nuevamente.');
    } finally {
      setGenerandoResumen(false);
    }
  };

  // Cargar comentarios de seguimiento
  const fetchRecordatorios = useCallback(async (page = 0, reset = false) => {
    if (!lead?.card_id) return;
    
    try {
      setLoadingRecordatorios(true);
      
      const from = page * RECORDATORIOS_PER_PAGE;
      const to = from + RECORDATORIOS_PER_PAGE - 1;
      
      // Traer comentarios con el nombre del autor desde la tabla usuarios
      const { data, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuarios:autor_email (nombre)
        `, { count: 'exact' })
        .eq('lead_id', lead.card_id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      if (reset) {
        setRecordatorios(data || []);
      } else {
        setRecordatorios(prev => [...prev, ...(data || [])]);
      }
      
      setRecordatoriosPage(page);
      setHasMoreRecordatorios((data?.length || 0) === RECORDATORIOS_PER_PAGE);
      
    } catch (error) {
      console.error('Error cargando comentarios:', error.message);
    } finally {
      setLoadingRecordatorios(false);
    }
  }, [lead?.card_id]);

  // Cargar más recordatorios (infinite scroll)
  const loadMoreRecordatorios = () => {
    if (!loadingRecordatorios && hasMoreRecordatorios) {
      fetchRecordatorios(recordatoriosPage + 1);
    }
  };

  // Enviar nuevo mensaje
  const handleEnviarMensaje = async () => {
    console.log('Intentando enviar...', { 
      mensaje: nuevoMensaje.trim(), 
      card_id: lead?.card_id, 
      enviando: enviandoMensaje,
      userEmail 
    });
    
    if (!nuevoMensaje.trim()) {
      console.log('Mensaje vacío');
      return;
    }
    if (!lead?.card_id) {
      console.log('No hay card_id');
      return;
    }
    if (enviandoMensaje) {
      console.log('Ya está enviando');
      return;
    }
    
    try {
      setEnviandoMensaje(true);
      
      const nuevoComentario = {
        lead_id: lead.card_id,
        texto: nuevoMensaje.trim(),
        autor_email: userEmail || 'unknown',
        origen: 'Seguimiento',
        fase: lead.fase_nombre_pipefy || null,
        etapa_funnel: lead.etapa_funnel || null
      };
      
      console.log('Enviando comentario:', nuevoComentario);
      
      const { data, error } = await supabase
        .from('comentarios')
        .insert([nuevoComentario])
        .select()
        .single();
      
      console.log('Respuesta:', { data, error });
      
      if (error) throw error;
      
      // Agregar al inicio de la lista con el nombre y fecha
      const comentarioConNombre = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
        usuarios: { nombre: userName }
      };
      setRecordatorios(prev => [comentarioConNombre, ...prev]);
      setNuevoMensaje('');
      
    } catch (error) {
      console.error('Error enviando comentario:', error);
      alert('Error al enviar: ' + error.message);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Manejar scroll para infinite scroll (con flex-col-reverse, scrollTop negativo indica arriba)
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Con flex-col-reverse: scrollTop cercano a -(scrollHeight - clientHeight) = arriba (mensajes antiguos)
    // Cargar más cuando esté cerca del tope (scroll hacia arriba)
    if (Math.abs(scrollTop) + clientHeight >= scrollHeight - 100) {
      loadMoreRecordatorios();
    }
  };

  // Cargar recordatorios cuando cambia el lead o se abre el tab
  useEffect(() => {
    if (isOpen && lead?.card_id && activeTab === 'seguimiento') {
      setRecordatorios([]);
      setRecordatoriosPage(0);
      setHasMoreRecordatorios(true);
      setFiltroEtapa(null);
      setFiltroFase(null);
      fetchRecordatorios(0, true);
    }
  }, [isOpen, lead?.card_id, activeTab, fetchRecordatorios]);

  // Cargar URL de booking del usuario
  const fetchBookingUrl = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      setLoadingUrls(true);
      
      // Usar el comercial asignado al lead, no el usuario logueado
      const comercialEmail = lead?.comercial_email;
      if (!comercialEmail) {
        setUrlBooking(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('url_booking')
        .eq('email', comercialEmail)
        .single();
      
      if (error) throw error;
      
      setUrlBooking(data?.url_booking || null);
    } catch (error) {
      console.error('Error cargando URL de booking:', error.message);
      setUrlBooking(null);
    } finally {
      setLoadingUrls(false);
    }
  }, [lead?.comercial_email]);

  // Cargar URL de booking cuando se abre el sidebar y el lead está listo para agendar
  useEffect(() => {
    if (isOpen && mostrarBotonAgendar && lead?.comercial_email) {
      fetchBookingUrl();
    }
  }, [isOpen, mostrarBotonAgendar, lead?.comercial_email, fetchBookingUrl]);

  // Cargar recordatorios del lead para el calendario
  const fetchRecordatoriosCalendario = useCallback(async () => {
    if (!lead?.card_id) return;
    
    try {
      setLoadingRecordatoriosCalendario(true);
      const { data, error } = await supabase
        .from('recordatorios')
        .select('*')
        .eq('lead_id', lead.card_id)
        .order('fecha_programada', { ascending: true });
      
      if (error) throw error;
      setRecordatoriosDelLead(data || []);
    } catch (error) {
      console.error('Error cargando recordatorios:', error.message);
    } finally {
      setLoadingRecordatoriosCalendario(false);
    }
  }, [lead?.card_id]);

  // Función para verificar si hay recordatorio activo
  const fetchRecordatorioActivo = useCallback(async () => {
    if (!lead?.card_id) return;
    
    try {
      setLoadingRecordatorioActivo(true);
      
      const { data, error } = await supabase
        .from('recordatorios')
        .select('*')
        .eq('lead_id', lead.card_id)
        .eq('estado', 'Programado')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error verificando recordatorio activo:', error);
      }
      
      setRecordatorioActivo(data || null);
    } catch (error) {
      console.error('Error:', error);
      setRecordatorioActivo(null);
    } finally {
      setLoadingRecordatorioActivo(false);
    }
  }, [lead?.card_id]);

  // Cargar recordatorios cuando se abre el tab
  useEffect(() => {
    if (isOpen && lead?.card_id && activeTab === 'recordatorio') {
      fetchRecordatoriosCalendario();
      fetchRecordatorioActivo();
      // Resetear formulario y sub-tab
      setFechaSeleccionada(null);
      setHoraSeleccionada('09:00');
      setTextoRecordatorio('');
      setErrorRecordatorio(null);
      setSubTabRecordatorio('programar'); // Siempre iniciar en "Programar"
    }
  }, [isOpen, lead?.card_id, activeTab, fetchRecordatoriosCalendario, fetchRecordatorioActivo]);

  // Función para programar recordatorio
  const handleProgramarRecordatorio = async () => {
    if (!fechaSeleccionada || !textoRecordatorio.trim() || !lead?.card_id) return;
    
    try {
      setProgramandoRecordatorio(true);
      setErrorRecordatorio(null);
      
      // Combinar fecha y hora
      const [hora, minutos] = horaSeleccionada.split(':');
      const fechaCompleta = new Date(fechaSeleccionada);
      fechaCompleta.setHours(parseInt(hora), parseInt(minutos), 0, 0);
      
      // 1. Crear comentario en tabla comentarios
      const nuevoComentario = {
        lead_id: lead.card_id,
        texto: textoRecordatorio.trim(),
        autor_email: userEmail || 'unknown',
        origen: 'Recordatorio',
        fase: lead.fase_nombre_pipefy || null,
        etapa_funnel: lead.etapa_funnel || null
      };
      
      const { error: errorComentario } = await supabase
        .from('comentarios')
        .insert([nuevoComentario]);
      
      if (errorComentario) throw errorComentario;
      
      // 2. Crear recordatorio
      const nuevoRecordatorioData = {
        lead_id: lead.card_id,
        fecha_programada: fechaCompleta.toISOString(),
        observacion: textoRecordatorio.trim(),
        creado_por: userName,
        estado: 'Programado',
        fase: lead.fase_nombre_pipefy || null,
        etapa_funnel: lead.etapa_funnel || null
      };
      
      const { error: errorRecordatorioInsert } = await supabase
        .from('recordatorios')
        .insert([nuevoRecordatorioData]);
      
      if (errorRecordatorioInsert) throw errorRecordatorioInsert;
      
      // 3. Contar recordatorios del lead en la fase actual
      const { count: conteoFaseActual, error: errorConteo } = await supabase
        .from('recordatorios')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', lead.card_id)
        .eq('fase', lead.fase_nombre_pipefy || '');
      
      if (errorConteo) throw errorConteo;
      
      // 4. Actualizar lead con el conteo correcto y activar recordatorio
      const { error: errorLead } = await supabase
        .from('leads')
        .update({
          fecha_programada_recordatorio: fechaCompleta.toISOString(),
          estado_gestion: 'gestionado',
          conteo_recordatorios: conteoFaseActual || 0,
          recordatorio_activo: true
        })
        .eq('card_id', lead.card_id);
      
      if (errorLead) throw errorLead;
      
      // Éxito - guardar fecha para mostrar en modal y limpiar formulario
      setFechaRecordatorioCreado(fechaCompleta);
      setMostrarConfirmacion(true);
      setFechaSeleccionada(null);
      setTextoRecordatorio('');
      setHoraSeleccionada('09:00');
      fetchRecordatoriosCalendario();
      fetchRecordatorioActivo(); // Actualizar estado de recordatorio activo
      
      // Refrescar dashboard silenciosamente
      onRefreshData?.();
      
    } catch (error) {
      console.error('Error programando recordatorio:', error);
      setErrorRecordatorio('No se pudo programar el recordatorio, intente nuevamente');
    } finally {
      setProgramandoRecordatorio(false);
    }
  };

  // Función para cargar historial de recordatorios
  const HISTORIAL_PER_PAGE = 10;
  
  const fetchHistorialRecordatorios = useCallback(async (page = 0) => {
    if (!lead?.card_id) return;
    
    try {
      setLoadingHistorial(true);
      
      const from = page * HISTORIAL_PER_PAGE;
      const to = from + HISTORIAL_PER_PAGE - 1;
      
      const { data, error, count } = await supabase
        .from('recordatorios')
        .select('*', { count: 'exact' })
        .eq('lead_id', lead.card_id)
        .order('fecha_programada', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      setHistorialRecordatorios(data || []);
      setTotalHistorial(count || 0);
      setHistorialPage(page);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [lead?.card_id]);

  // Función para cancelar un recordatorio
  const handleCancelarRecordatorio = async (recordatorioId) => {
    if (!recordatorioId || !lead?.card_id) return;
    
    try {
      setCancelandoRecordatorio(recordatorioId);
      setConfirmarCancelacion(null); // Cerrar modal de confirmación
      
      // 1. Actualizar estado del recordatorio a "Cancelado"
      const { error: errorUpdate } = await supabase
        .from('recordatorios')
        .update({ estado: 'Cancelado' })
        .eq('id', recordatorioId);
      
      if (errorUpdate) throw errorUpdate;
      
      // 2. Actualizar lead (solo puede haber 1 recordatorio activo por lead)
      const { error: errorLead, data: dataLead } = await supabase
        .from('leads')
        .update({ 
          recordatorio_activo: false,
          estado_gestion: 'sin_gestionar',
          revisado: false,
          fecha_asignacion: new Date().toISOString()
        })
        .eq('card_id', lead.card_id)
        .select();
      
      console.log('Update lead resultado:', { dataLead, errorLead, card_id: lead.card_id });
      
      if (errorLead) {
        console.error('Error actualizando lead:', errorLead);
      }
      
      // 3. Recargar historial, calendario y limpiar estado activo
      fetchHistorialRecordatorios(historialPage);
      fetchRecordatoriosCalendario();
      setRecordatorioActivo(null); // Ya no hay recordatorio activo
      
      // Refrescar dashboard silenciosamente
      onRefreshData?.();
      
    } catch (error) {
      console.error('Error cancelando recordatorio:', error);
    } finally {
      setCancelandoRecordatorio(null);
    }
  };

  // Cargar historial cuando se cambia a ese sub-tab
  useEffect(() => {
    if (subTabRecordatorio === 'historial' && lead?.card_id) {
      fetchHistorialRecordatorios(0);
    }
  }, [subTabRecordatorio, lead?.card_id, fetchHistorialRecordatorios]);

  // Helpers para el calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const isDateValid = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today && checkDate <= maxDate;
  };

  const hasRecordatorio = (day) => {
    const checkDate = new Date(mesActual.getFullYear(), mesActual.getMonth(), day);
    return recordatoriosDelLead.some(r => {
      const rDate = new Date(r.fecha_programada);
      return rDate.getFullYear() === checkDate.getFullYear() &&
             rDate.getMonth() === checkDate.getMonth() &&
             rDate.getDate() === checkDate.getDate();
    });
  };

  const getRecordatorioForDay = (day) => {
    const checkDate = new Date(mesActual.getFullYear(), mesActual.getMonth(), day);
    return recordatoriosDelLead.find(r => {
      const rDate = new Date(r.fecha_programada);
      return rDate.getFullYear() === checkDate.getFullYear() &&
             rDate.getMonth() === checkDate.getMonth() &&
             rDate.getDate() === checkDate.getDate();
    });
  };

  // Formatear fecha para mostrar
  const formatearFechaRecordatorio = (fecha) => {
    if (!fecha) return 'Ahora';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return 'Ahora';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setActiveTab(initialTab); // Usar el tab inicial pasado como prop
      // Prevenir scroll del body cuando el sidebar está abierto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, lead]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Esperar a que termine la animación
  };

  if (!isOpen && !isAnimating) return null;
  if (!lead) return null;

  const gestionStatus = getGestionStatus(lead);
  const statusBadge = statusBadges[gestionStatus];
  const currentStepIndex = funnelSteps.findIndex(
    step => step.id === lead.etapa_funnel || step.id === lead.fase_nombre_pipefy
  );
  const isMatriculaCaida = lead.etapa_funnel === 'Matrícula caída' || lead.fase_nombre_pipefy === 'Matrícula caída';

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isAnimating && isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[650px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isAnimating && isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Contenedor con scroll */}
        <div className="h-full flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-start justify-between gap-4">
              {/* Info del lead */}
              <div className="flex items-center gap-4">
                {/* Avatar con bandera */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl shadow-lg">
                    {getCountryFlag(lead.pais)}
                  </div>
                </div>
                
                {/* Nombre y ocupación */}
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {lead.nombre || 'Sin nombre'}
                  </h2>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                    <Briefcase size={14} />
                    {lead.ocupacion || 'Ocupación no especificada'}
                  </p>
                  {/* Badge de estado */}
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full ${statusBadge.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    <span className={`text-xs font-semibold ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Acciones y cerrar */}
              <div className="flex items-center gap-2">
                {/* Acciones rápidas */}
                <div className="flex items-center gap-1 mr-2">
                  {/* Marcar como pendiente */}
                  {onMarcarNoRevisado && (
                    <button
                      onClick={() => lead.revisado !== false && onMarcarNoRevisado(lead)}
                      disabled={lead.revisado === false}
                      className={`p-2.5 rounded-xl transition-all duration-200 ${
                        lead.revisado === false
                          ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={lead.revisado === false ? "Este lead ya está pendiente" : "Marcar como no leído"}
                    >
                      <RotateCcw size={20} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => lead.respond_io_url && window.open(lead.respond_io_url, '_blank')}
                    disabled={!lead.respond_io_url}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      lead.respond_io_url 
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                        : 'text-slate-300 bg-slate-50 cursor-not-allowed'
                    }`}
                    title="Ir a la conversación de WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Banner "Listo para agendar" - solo cuando el lead está en fases de pitch */}
          {mostrarBotonAgendar && urlBooking && (
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <CalendarPlus size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">¡Listo para agendar!</p>
                    <p className="text-xs text-emerald-600">Este lead está listo para agendar un Pitch</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(urlBooking, '_blank')}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-all duration-200 shadow-lg shadow-emerald-200 flex items-center gap-2"
                >
                  <CalendarPlus size={16} />
                  Agendar
                </button>
              </div>
            </div>
          )}

          {/* Banner "Pitch agendado" - cuando el lead tiene pitch programado */}
          {mostrarPitchAgendado && (
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <CalendarCheck size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">¡Pitch agendado!</p>
                    <p className="text-xs text-amber-600">
                      Tienes un nuevo Pitch agendado para el <span className="font-semibold">{formatFechaPitch(lead?.fecha_pitch)}</span>
                    </p>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">¡Vamos por esa matrícula! 🎯</p>
                  </div>
                </div>
                {lead?.link_pitch && (
                  <button
                    onClick={() => window.open(lead.link_pitch, '_blank')}
                    className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-all duration-200 shadow-lg shadow-amber-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    <ExternalLink size={16} />
                    Ir al Pitch
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stepper del funnel */}
          <div className="flex-shrink-0 px-6 py-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              {funnelSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isFuture = index > currentStepIndex;
                const isLast = index === funnelSteps.length - 1;
                const isMatriculaCaidaStep = step.id === 'Matrícula caída';
                
                // Colores según estado
                let stepColor = 'bg-slate-200 text-slate-400';
                let lineColor = 'bg-slate-200';
                let dotColor = 'bg-slate-300';
                
                if (isMatriculaCaida) {
                  // Si está en matrícula caída, todo naranja
                  stepColor = 'bg-orange-100 text-orange-400';
                  lineColor = 'bg-orange-200';
                  dotColor = isMatriculaCaidaStep && isCurrent ? 'bg-orange-500' : 'bg-orange-300';
                } else if (isCompleted) {
                  stepColor = 'bg-emerald-100 text-emerald-600';
                  lineColor = 'bg-emerald-400';
                  dotColor = 'bg-emerald-500';
                } else if (isCurrent) {
                  stepColor = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200';
                  dotColor = 'bg-emerald-500';
                }

                return (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    {/* Step */}
                    <div className="flex flex-col items-center relative group">
                      {/* Círculo/Dot */}
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${stepColor}`}
                        title={step.label}
                      >
                        {isCompleted && !isMatriculaCaida ? (
                          <CheckCircle2 size={16} />
                        ) : isCurrent ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-current" />
                        ) : isMatriculaCaidaStep && isMatriculaCaida ? (
                          <XCircle size={16} />
                        ) : (
                          <Circle size={14} />
                        )}
                      </div>
                      
                      {/* Tooltip con fase actual del lead (solo en el paso actual) */}
                      {isCurrent && lead.fase_nombre_pipefy && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg max-w-[200px] text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                          {lead.fase_nombre_pipefy}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      )}
                      
                      {/* Label corto (visible para el actual) */}
                      <span className={`absolute -bottom-6 text-[10px] font-medium whitespace-nowrap transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0'
                      } ${isMatriculaCaida ? 'text-orange-600' : isCurrent ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {step.shortLabel}
                      </span>
                    </div>
                    
                    {/* Línea conectora */}
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                        isMatriculaCaida ? 'bg-orange-200' : 
                        isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-shrink-0 px-6 pt-4 border-b border-slate-100">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-white text-[#1717AF] border-t border-l border-r border-slate-200 -mb-px' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido del tab - con scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Datos de contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Teléfono */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Phone size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 font-medium">Teléfono</p>
                      <p className="text-sm font-semibold text-slate-700">{lead.telefono || 'No disponible'}</p>
                    </div>
                    {lead.telefono && (
                      <button
                        onClick={() => handleCopy(lead.telefono, 'telefono')}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          copiedField === 'telefono'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm opacity-0 group-hover:opacity-100'
                        }`}
                        title={copiedField === 'telefono' ? '¡Copiado!' : 'Copiar teléfono'}
                      >
                        {copiedField === 'telefono' ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Correo */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl group">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Mail size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 font-medium">Correo</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{lead.email || 'No disponible'}</p>
                    </div>
                    {lead.email && (
                      <button
                        onClick={() => handleCopy(lead.email, 'email')}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          copiedField === 'email'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm opacity-0 group-hover:opacity-100'
                        }`}
                        title={copiedField === 'email' ? '¡Copiado!' : 'Copiar correo'}
                      >
                        {copiedField === 'email' ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* País */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <MapPin size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">País</p>
                      <p className="text-sm font-semibold text-slate-700">{lead.pais || 'No especificado'}</p>
                    </div>
                  </div>
                  
                  {/* Nivel de inglés */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <BarChart3 size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Nivel de inglés</p>
                      <p className="text-sm font-semibold text-slate-700">{lead.nivel_ingles || 'No evaluado'}</p>
                    </div>
                  </div>
                </div>

                {/* Motivación */}
                <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={18} className="text-amber-500" />
                    <h4 className="font-semibold text-slate-700">Motivación</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {lead.motivacion || 'El cliente no ha especificado su motivación para aprender inglés.'}
                  </p>
                </div>

                {/* Resumen IA */}
                <div className="p-5 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-violet-500" />
                    <h4 className="font-semibold text-slate-700">Resumen inteligente</h4>
                    <span className="text-[10px] font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                      IA
                    </span>
                  </div>
                  
                  {resumenIA ? (
                    <div className="space-y-2">
                      <div className="w-full min-h-28 p-3 bg-white/70 border border-violet-200 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {resumenIA}
                      </div>
                      {resumenIAFecha && (
                        <p className="text-[11px] text-violet-400 italic text-right">
                          Generado el {new Date(resumenIAFecha).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })} a las {new Date(resumenIAFecha).toLocaleTimeString('es-ES', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-28 p-3 bg-white/70 border border-violet-200 rounded-xl text-sm text-slate-400 flex items-center justify-center">
                      {generandoResumen ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Generando resumen...
                        </span>
                      ) : (
                        'Haz clic en "Generar" para crear un resumen con IA'
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={handleGenerarResumen}
                      disabled={generandoResumen}
                      className={`px-4 py-2 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-200 flex items-center gap-2 ${
                        generandoResumen 
                          ? 'bg-violet-400 cursor-not-allowed' 
                          : 'bg-violet-600 hover:bg-violet-700'
                      }`}
                    >
                      {generandoResumen ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          {resumenIA ? 'Regenerar' : 'Generar'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguimiento' && (() => {
              // Obtener etapas y fases únicas de los comentarios
              const etapasUnicas = [...new Set(recordatorios.map(c => c.etapa_funnel).filter(Boolean))];
              const fasesUnicas = [...new Set(recordatorios.map(c => c.fase).filter(Boolean))];
              
              // Filtrar comentarios
              const comentariosFiltrados = recordatorios.filter(c => {
                if (filtroEtapa && c.etapa_funnel !== filtroEtapa) return false;
                if (filtroFase && c.fase !== filtroFase) return false;
                return true;
              });
              
              return (
              <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
                {/* Filtros sutiles */}
                {(etapasUnicas.length > 0 || fasesUnicas.length > 0) && (
                  <div className="flex-shrink-0 mb-3 flex flex-wrap gap-2">
                    {/* Filtro por etapa */}
                    {etapasUnicas.length > 0 && (
                      <select
                        value={filtroEtapa || ''}
                        onChange={(e) => setFiltroEtapa(e.target.value || null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] cursor-pointer"
                      >
                        <option value="">Todas las etapas</option>
                        {etapasUnicas.map(etapa => (
                          <option key={etapa} value={etapa}>{etapa}</option>
                        ))}
                      </select>
                    )}
                    
                    {/* Filtro por fase */}
                    {fasesUnicas.length > 0 && (
                      <select
                        value={filtroFase || ''}
                        onChange={(e) => setFiltroFase(e.target.value || null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] cursor-pointer"
                      >
                        <option value="">Todas las fases</option>
                        {fasesUnicas.map(fase => (
                          <option key={fase} value={fase}>{fase}</option>
                        ))}
                      </select>
                    )}
                    
                    {/* Botón limpiar filtros */}
                    {(filtroEtapa || filtroFase) && (
                      <button
                        onClick={() => { setFiltroEtapa(null); setFiltroFase(null); }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                )}
                
                {/* Lista de seguimientos con scroll - estilo WhatsApp */}
                <div 
                  ref={recordatoriosContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 pr-2 mb-4"
                >
                  {comentariosFiltrados.length === 0 && !loadingRecordatorios ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <MessageCircle size={28} className="text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        {(filtroEtapa || filtroFase) ? 'Sin resultados' : 'Sin seguimiento'}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {(filtroEtapa || filtroFase) 
                          ? 'No hay mensajes con los filtros seleccionados' 
                          : 'Aún no hay mensajes de seguimiento para este lead'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mensajes en orden inverso (más reciente abajo) */}
                      {comentariosFiltrados.map((comentario, index) => {
                        // Obtener nombre del autor (del join con usuarios o del email)
                        const nombreAutor = comentario.usuarios?.nombre || 
                          (comentario.autor_email === userEmail ? userName : comentario.autor_email?.split('@')[0]) || 
                          'Usuario';
                        
                        return (
                          <div 
                            key={comentario.id || index}
                            className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all duration-200"
                          >
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {comentario.texto}
                            </p>
                            
                            {/* Badge de fase y etapa (si existe) */}
                            {(comentario.fase || comentario.etapa_funnel) && (
                              <div className="mt-3 mb-2 flex flex-wrap gap-2">
                                {comentario.etapa_funnel && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {comentario.etapa_funnel}
                                  </span>
                                )}
                                {comentario.fase && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    {comentario.fase}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-2 text-xs text-slate-400 mt-2">
                              <span>{formatearFechaRecordatorio(comentario.created_at)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium text-slate-500">{nombreAutor}</span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Loader para infinite scroll (arriba al cargar más antiguos) */}
                      {loadingRecordatorios && (
                        <div className="flex justify-center py-4">
                          <Loader2 size={24} className="text-[#1717AF] animate-spin" />
                        </div>
                      )}
                      
                      {/* Mensaje de fin de lista (arriba) */}
                      {!hasMoreRecordatorios && recordatorios.length > 0 && (
                        <p className="text-center text-xs text-slate-400 py-2">
                          Inicio del historial
                        </p>
                      )}
                    </>
                  )}
                </div>
                
                {/* Campo para nuevo mensaje */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        value={nuevoMensaje}
                        onChange={(e) => setNuevoMensaje(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleEnviarMensaje();
                          }
                        }}
                        placeholder="Escribe acá el seguimiento del cliente..."
                        rows={1}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] resize-none transition-all duration-200"
                        style={{ minHeight: '42px', maxHeight: '120px' }}
                      />
                    </div>
                    <button
                      onClick={handleEnviarMensaje}
                      disabled={!nuevoMensaje.trim() || enviandoMensaje}
                      className={`p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                        nuevoMensaje.trim() && !enviandoMensaje
                          ? 'bg-[#1717AF] text-white hover:bg-[#02214A] shadow-lg shadow-[#1717AF]/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {enviandoMensaje ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Enter para enviar • Shift + Enter para nueva línea
                  </p>
                </div>
              </div>
              );
            })()}

            {activeTab === 'recordatorio' && (() => {
              const { daysInMonth, startingDay } = getDaysInMonth(mesActual);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              
              const canSubmit = fechaSeleccionada && textoRecordatorio.trim().length > 0 && !programandoRecordatorio;
              
              // Formatear fecha para historial
              const formatFechaHistorial = (dateString) => {
                if (!dateString) return '-';
                const fecha = new Date(dateString);
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const dia = fecha.getDate();
                const mes = meses[fecha.getMonth()];
                const año = fecha.getFullYear();
                let horas = fecha.getHours();
                const minutos = fecha.getMinutes().toString().padStart(2, '0');
                const ampm = horas >= 12 ? 'pm' : 'am';
                horas = horas % 12 || 12;
                return `${dia} ${mes} ${año}, ${horas}:${minutos} ${ampm}`;
              };
              
              // Estilos de estado para historial
              const estadoStyles = {
                'Programado': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
                'Vencido': { bg: 'bg-rose-100', text: 'text-rose-700' },
                'Cancelado': { bg: 'bg-slate-100', text: 'text-slate-500' }
              };
              
              const totalPagesHistorial = Math.ceil(totalHistorial / HISTORIAL_PER_PAGE);
              
              return (
                <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
                  {/* Sub-tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setSubTabRecordatorio('programar')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        subTabRecordatorio === 'programar'
                          ? 'bg-[#1717AF] text-white shadow-lg shadow-[#1717AF]/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Programar
                    </button>
                    <button
                      onClick={() => setSubTabRecordatorio('historial')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        subTabRecordatorio === 'historial'
                          ? 'bg-[#1717AF] text-white shadow-lg shadow-[#1717AF]/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Historial
                    </button>
                  </div>
                  
                  {/* Contenido de Historial */}
                  {subTabRecordatorio === 'historial' && (
                    <div className="flex-1 overflow-y-auto">
                      {loadingHistorial ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 size={24} className="animate-spin text-slate-400" />
                        </div>
                      ) : historialRecordatorios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <CalendarDays size={28} className="text-slate-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin historial</h3>
                          <p className="text-sm text-slate-400">Aún no has programado recordatorios para este lead</p>
                        </div>
                      ) : (
                        <>
                          {/* Lista de recordatorios */}
                          <div className="space-y-3">
                            {historialRecordatorios.map((rec) => {
                              const estilo = estadoStyles[rec.estado] || estadoStyles['Programado'];
                              const esProgramado = rec.estado === 'Programado';
                              const estaCancelando = cancelandoRecordatorio === rec.id;
                              
                              return (
                                <div 
                                  key={rec.id}
                                  className="bg-white rounded-xl border border-slate-200 p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {/* Fecha y estado */}
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-slate-700">
                                          {formatFechaHistorial(rec.fecha_programada)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estilo.bg} ${estilo.text}`}>
                                          {rec.estado}
                                        </span>
                                      </div>
                                      
                                      {/* Observación */}
                                      <p className="text-sm text-slate-500 line-clamp-2">
                                        {rec.observacion || 'Sin observación'}
                                      </p>
                                    </div>
                                    
                                    {/* Botón cancelar */}
                                    <button
                                      onClick={() => esProgramado && setConfirmarCancelacion(rec)}
                                      disabled={!esProgramado || estaCancelando}
                                      className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                                        esProgramado && !estaCancelando
                                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                          : 'text-slate-200 cursor-not-allowed'
                                      }`}
                                      title={esProgramado ? 'Cancelar recordatorio' : 'No se puede cancelar'}
                                    >
                                      {estaCancelando ? (
                                        <Loader2 size={18} className="animate-spin" />
                                      ) : (
                                        <XCircle size={18} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Paginación */}
                          {totalPagesHistorial > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                              <p className="text-xs text-slate-400">
                                {historialPage * HISTORIAL_PER_PAGE + 1} - {Math.min((historialPage + 1) * HISTORIAL_PER_PAGE, totalHistorial)} de {totalHistorial}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => fetchHistorialRecordatorios(historialPage - 1)}
                                  disabled={historialPage === 0}
                                  className={`p-2 rounded-lg transition-colors ${
                                    historialPage === 0 
                                      ? 'text-slate-300 cursor-not-allowed' 
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs text-slate-500">
                                  {historialPage + 1} / {totalPagesHistorial}
                                </span>
                                <button
                                  onClick={() => fetchHistorialRecordatorios(historialPage + 1)}
                                  disabled={historialPage >= totalPagesHistorial - 1}
                                  className={`p-2 rounded-lg transition-colors ${
                                    historialPage >= totalPagesHistorial - 1 
                                      ? 'text-slate-300 cursor-not-allowed' 
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Contenido de Programar (existente) */}
                  {subTabRecordatorio === 'programar' && (
                  <div className="flex-1 overflow-y-auto">
                  
                  {/* Empty state si ya hay recordatorio activo */}
                  {loadingRecordatorioActivo ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  ) : recordatorioActivo ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
                        <Bell size={36} className="text-amber-500" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3">
                        {lead.nombre?.split(' ')[0] || 'Este lead'} ya tiene un recordatorio activo
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        Programado para el{' '}
                        <span className="font-semibold text-slate-700">
                          {(() => {
                            const fecha = new Date(recordatorioActivo.fecha_programada);
                            const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                            const dia = fecha.getDate();
                            const mes = meses[fecha.getMonth()];
                            const año = fecha.getFullYear();
                            let horas = fecha.getHours();
                            const minutos = fecha.getMinutes().toString().padStart(2, '0');
                            const ampm = horas >= 12 ? 'pm' : 'am';
                            horas = horas % 12 || 12;
                            return `${dia} de ${mes} de ${año} a las ${horas}:${minutos} ${ampm}`;
                          })()}
                        </span>
                      </p>
                      <p className="text-sm text-slate-400 mb-6">
                        Si deseas programar otro, ve al historial, cancélalo, y programa uno nuevo.
                      </p>
                      <button
                        onClick={() => setSubTabRecordatorio('historial')}
                        className="px-6 py-3 rounded-xl bg-[#1717AF] text-white font-semibold hover:bg-[#02214A] transition-all duration-200 shadow-lg shadow-[#1717AF]/20"
                      >
                        Ir al Historial
                      </button>
                    </div>
                  ) : (
                  <>
                  {/* Calendario */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                    {/* Header del calendario */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronLeft size={20} className="text-slate-600" />
                      </button>
                      <h3 className="text-sm font-semibold text-slate-700">
                        {nombresMeses[mesActual.getMonth()]} {mesActual.getFullYear()}
                      </h3>
                      <button
                        onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronRight size={20} className="text-slate-600" />
                      </button>
                    </div>
                    
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {diasSemana.map(dia => (
                        <div key={dia} className="text-center text-xs font-medium text-slate-400 py-2">
                          {dia}
                        </div>
                      ))}
                    </div>
                    
                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Espacios vacíos */}
                      {Array.from({ length: startingDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-9" />
                      ))}
                      
                      {/* Días */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateToCheck = new Date(mesActual.getFullYear(), mesActual.getMonth(), day);
                        const isValid = isDateValid(dateToCheck);
                        const isSelected = fechaSeleccionada && 
                          fechaSeleccionada.getDate() === day && 
                          fechaSeleccionada.getMonth() === mesActual.getMonth() &&
                          fechaSeleccionada.getFullYear() === mesActual.getFullYear();
                        const hasRec = hasRecordatorio(day);
                        const recordatorioDelDia = hasRec ? getRecordatorioForDay(day) : null;
                        const isToday = today.getDate() === day && 
                                       today.getMonth() === mesActual.getMonth() && 
                                       today.getFullYear() === mesActual.getFullYear();
                        
                        return (
                          <div key={day} className="relative group">
                            <button
                              onClick={() => isValid && setFechaSeleccionada(dateToCheck)}
                              disabled={!isValid}
                              className={`w-full h-9 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                                isSelected
                                  ? 'bg-[#1717AF] text-white shadow-lg shadow-[#1717AF]/20'
                                  : isToday
                                    ? 'bg-slate-100 text-slate-700 ring-2 ring-[#1717AF]/30'
                                    : isValid
                                      ? 'text-slate-700 hover:bg-slate-100'
                                      : 'text-slate-300 cursor-not-allowed'
                              }`}
                            >
                              {day}
                              {/* Indicador de recordatorio */}
                              {hasRec && (
                                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-amber-500'
                                }`} />
                              )}
                            </button>
                            
                            {/* Tooltip para días con recordatorio */}
                            {hasRec && recordatorioDelDia && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-xl">
                                <p className="text-slate-300 mb-1 text-[10px] uppercase tracking-wide">Recordatorio</p>
                                <p className="font-medium truncate">
                                  {recordatorioDelDia.observacion?.substring(0, 50)}
                                  {recordatorioDelDia.observacion?.length > 50 ? '...' : ''}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('seguimiento');
                                  }}
                                  className="mt-2 text-white bg-[#1717AF] px-2 py-1 rounded-lg hover:bg-[#02214A] transition-colors pointer-events-auto text-[10px] font-medium"
                                >
                                  Ver Seguimiento →
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Leyenda */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Con recordatorio
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-[#1717AF]" />
                        Seleccionado
                      </div>
                    </div>
                  </div>
                  
                  {/* Formulario de programación */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Bell size={16} className="text-[#1717AF]" />
                      Programar recordatorio
                    </h4>
                    
                    {/* Fecha y hora seleccionadas */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                        <div className={`px-3 py-2 rounded-xl border text-sm ${
                          fechaSeleccionada 
                            ? 'border-[#1717AF] bg-[#1717AF]/5 text-slate-700' 
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}>
                          {fechaSeleccionada 
                            ? fechaSeleccionada.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Selecciona en el calendario'
                          }
                        </div>
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-slate-500 mb-1 block">Hora</label>
                        <select
                          value={horaSeleccionada}
                          onChange={(e) => setHoraSeleccionada(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF]"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={`${h.toString().padStart(2, '0')}:00`}>
                              {h.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Textarea */}
                    <div className="mb-3">
                      <label className="text-xs text-slate-500 mb-1 block">Detalle del recordatorio</label>
                      <textarea
                        value={textoRecordatorio}
                        onChange={(e) => setTextoRecordatorio(e.target.value)}
                        placeholder="Escribe el detalle del recordatorio..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] resize-none"
                      />
                    </div>
                    
                    {/* Error message */}
                    {errorRecordatorio && (
                      <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
                        {errorRecordatorio}
                      </div>
                    )}
                    
                    {/* Botón programar */}
                    <button
                      onClick={handleProgramarRecordatorio}
                      disabled={!canSubmit}
                      className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        canSubmit
                          ? 'bg-[#1717AF] text-white hover:bg-[#02214A] shadow-lg shadow-[#1717AF]/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {programandoRecordatorio ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Programando...
                        </>
                      ) : (
                        <>
                          <CalendarDays size={18} />
                          Programar
                        </>
                      )}
                    </button>
                    
                    {/* Nota sobre límite */}
                    <p className="text-xs text-slate-400 text-center mt-2">
                      Solo puedes programar hasta 30 días en el futuro
                    </p>
                  </div>
                  </>
                  )}
                  </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'formulario' && (
              <div className="h-full">
                {lead.url_formulario_fase ? (
                  <div className="h-[calc(100vh-320px)] min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white">
                    <iframe
                      src={lead.url_formulario_fase}
                      className="w-full h-full"
                      title="Formulario de Pipefy"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <FileText size={28} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin formulario</h3>
                    <p className="text-sm text-slate-400">Este lead no tiene un formulario asociado</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal de confirmación de recordatorio */}
      {mostrarConfirmacion && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300"
            onClick={() => setMostrarConfirmacion(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center mx-4">
              {/* Ícono de éxito */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              
              {/* Título */}
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                ¡Felicitaciones!
              </h3>
              
              {/* Mensaje */}
              <p className="text-slate-600 mb-6">
                Tu recordatorio fue creado de forma exitosa para el{' '}
                <span className="font-semibold text-slate-800">
                  {fechaRecordatorioCreado && (() => {
                    const fecha = new Date(fechaRecordatorioCreado);
                    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const dia = fecha.getDate();
                    const mes = meses[fecha.getMonth()];
                    const año = fecha.getFullYear();
                    let horas = fecha.getHours();
                    const minutos = fecha.getMinutes().toString().padStart(2, '0');
                    const ampm = horas >= 12 ? 'pm' : 'am';
                    horas = horas % 12 || 12;
                    return `${dia} de ${mes} de ${año} a las ${horas}:${minutos} ${ampm}`;
                  })()}
                </span>
              </p>
              
              {/* Botón */}
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-emerald-200"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación para cancelar recordatorio */}
      {confirmarCancelacion && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300"
            onClick={() => setConfirmarCancelacion(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center mx-4">
              {/* Ícono de advertencia */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                <XCircle size={40} className="text-white" />
              </div>
              
              {/* Título */}
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                ¿Cancelar recordatorio?
              </h3>
              
              {/* Mensaje */}
              <p className="text-slate-600 mb-2">
                Estás a punto de cancelar el recordatorio programado para:
              </p>
              <p className="font-semibold text-slate-800 mb-6">
                {confirmarCancelacion.fecha_programada && (() => {
                  const fecha = new Date(confirmarCancelacion.fecha_programada);
                  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                  const dia = fecha.getDate();
                  const mes = meses[fecha.getMonth()];
                  const año = fecha.getFullYear();
                  let horas = fecha.getHours();
                  const minutos = fecha.getMinutes().toString().padStart(2, '0');
                  const ampm = horas >= 12 ? 'pm' : 'am';
                  horas = horas % 12 || 12;
                  return `${dia} de ${mes} de ${año} a las ${horas}:${minutos} ${ampm}`;
                })()}
              </p>
              
              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmarCancelacion(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all duration-200"
                >
                  No, volver
                </button>
                <button
                  onClick={() => handleCancelarRecordatorio(confirmarCancelacion.id)}
                  disabled={cancelandoRecordatorio === confirmarCancelacion.id}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold hover:from-rose-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                >
                  {cancelandoRecordatorio === confirmarCancelacion.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Sí, cancelar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LeadSidebar;

