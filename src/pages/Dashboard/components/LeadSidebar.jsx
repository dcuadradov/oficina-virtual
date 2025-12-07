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
  CalendarPlus
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

const RECORDATORIOS_PER_PAGE = 10;

const LeadSidebar = ({ lead, isOpen, onClose, initialTab = 'info' }) => {
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
  
  // Estados para booking
  const [urlBooking, setUrlBooking] = useState(null);
  const [loadingUrls, setLoadingUrls] = useState(false);
  
  // Determinar si mostrar botón de agendar basado en la fase del lead
  const mostrarBotonAgendar = lead?.fase_id_pipefy && FASES_LISTO_AGENDAR.includes(String(lead.fase_id_pipefy));
  
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
        origen: 'dashboard'
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
      fetchRecordatorios(0, true);
    }
  }, [isOpen, lead?.card_id, activeTab, fetchRecordatorios]);

  // Cargar URL de booking del usuario
  const fetchBookingUrl = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      setLoadingUrls(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('url_booking')
        .eq('email', userEmail)
        .single();
      
      if (error) throw error;
      
      setUrlBooking(data?.url_booking || null);
    } catch (error) {
      console.error('Error cargando URL de booking:', error.message);
    } finally {
      setLoadingUrls(false);
    }
  }, [userEmail]);

  // Cargar URL de booking cuando se abre el sidebar y el lead está listo para agendar
  useEffect(() => {
    if (isOpen && mostrarBotonAgendar) {
      fetchBookingUrl();
    }
  }, [isOpen, mostrarBotonAgendar, fetchBookingUrl]);

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
                  <button
                    onClick={() => lead.respond_io_url && window.open(lead.respond_io_url, '_blank')}
                    disabled={!lead.respond_io_url}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      lead.respond_io_url 
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                        : 'text-slate-300 bg-slate-50 cursor-not-allowed'
                    }`}
                    title="WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button
                    className="p-2.5 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all duration-200"
                    title="Recordatorio"
                  >
                    <Clock size={20} />
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
                  <textarea
                    className="w-full h-28 p-3 bg-white/70 border border-violet-200 rounded-xl text-sm text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
                    placeholder="El resumen generado por IA aparecerá aquí..."
                    readOnly
                  />
                  <div className="flex justify-end mt-3">
                    <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-all duration-200 shadow-lg shadow-violet-200 flex items-center gap-2">
                      <Sparkles size={14} />
                      Generar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguimiento' && (
              <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
                {/* Lista de seguimientos con scroll - estilo WhatsApp */}
                <div 
                  ref={recordatoriosContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 pr-2 mb-4"
                >
                  {recordatorios.length === 0 && !loadingRecordatorios ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <MessageCircle size={28} className="text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin seguimiento</h3>
                      <p className="text-sm text-slate-400">Aún no hay mensajes de seguimiento para este lead</p>
                    </div>
                  ) : (
                    <>
                      {/* Mensajes en orden inverso (más reciente abajo) */}
                      {recordatorios.map((comentario, index) => {
                        // Obtener nombre del autor (del join con usuarios o del email)
                        const nombreAutor = comentario.usuarios?.nombre || 
                          (comentario.autor_email === userEmail ? userName : comentario.autor_email?.split('@')[0]) || 
                          'Usuario';
                        
                        return (
                          <div 
                            key={comentario.id || index}
                            className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all duration-200"
                          >
                            <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">
                              {comentario.texto}
                            </p>
                            <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
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
            )}

            {activeTab === 'recordatorio' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Clock size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Recordatorios</h3>
                <p className="text-sm text-slate-400">Esta sección estará disponible próximamente</p>
              </div>
            )}

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
    </>
  );
};

export default LeadSidebar;
