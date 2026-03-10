import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, MessageCirclePlus, ClipboardList, Clock, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ArrowUpDown, RotateCcw, Flame, Plus, Tag, Sparkles, Loader2, X } from 'lucide-react';
import { getCountryFlag } from '../../../utils/countryFlags';
import CrearRespondModal from './CrearRespondModal';

/**
 * Calcula las horas restantes de la ventana de 24h de WhatsApp
 * @param {string} timestamp - timestamp_ultimo_mensaje_whatsapp
 * @returns {object} { horasRestantes: number, activo: boolean }
 */
const calcularTiempoWhatsApp = (timestamp) => {
  if (!timestamp) return { horasRestantes: null, activo: false };
  
  const ultimoMensaje = new Date(timestamp);
  const ahora = new Date();
  const diffMs = ahora - ultimoMensaje;
  const diffHoras = diffMs / (1000 * 60 * 60);
  
  if (diffHoras >= 24) {
    return { horasRestantes: 0, activo: false };
  }
  
  const horasRestantes = Math.ceil(24 - diffHoras);
  return { horasRestantes, activo: true };
};

/**
 * Componente botón de WhatsApp con contador de ventana 24h
 * @param {object} lead - Datos del lead
 * @param {number} size - Tamaño del ícono
 * @param {function} onCrearRespond - Callback para abrir modal de crear en Respond
 */
const WhatsAppButton = ({ lead, size = 18, onCrearRespond }) => {
  const [tiempoWhatsApp, setTiempoWhatsApp] = useState(() => 
    calcularTiempoWhatsApp(lead.timestamp_ultimo_mensaje_whatsapp)
  );

  useEffect(() => {
    // Recalcular cuando cambie el timestamp
    setTiempoWhatsApp(calcularTiempoWhatsApp(lead.timestamp_ultimo_mensaje_whatsapp));
    
    // Actualizar cada minuto
    const interval = setInterval(() => {
      setTiempoWhatsApp(calcularTiempoWhatsApp(lead.timestamp_ultimo_mensaje_whatsapp));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [lead.timestamp_ultimo_mensaje_whatsapp]);

  const tieneUrl = !!lead.respond_io_url;
  const { horasRestantes, activo } = tiempoWhatsApp;
  const mostrarContador = horasRestantes !== null;

  // Si no tiene URL, mostrar botón para crear en Respond
  if (!tieneUrl) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCrearRespond?.(lead);
        }}
        className="relative p-2.5 rounded-xl transition-all duration-200 text-[#1717AF] hover:bg-[#1717AF]/10 hover:scale-110 cursor-pointer"
        title="Crear en Respond.io"
      >
        <MessageCirclePlus size={size} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        window.open(lead.respond_io_url, '_blank');
      }}
      className={`relative p-2.5 rounded-xl transition-all duration-200 ${
        activo
          ? 'text-emerald-600 hover:bg-emerald-50 hover:scale-110 cursor-pointer'
          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:scale-110 cursor-pointer'
      }`}
      title={
        activo 
          ? `Ventana activa: ${horasRestantes}h restantes` 
          : "Ventana de 24h expirada"
      }
    >
      <MessageCircle size={size} strokeWidth={2} />
      
      {/* Badge contador */}
      {mostrarContador && (
        <span 
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
            activo 
              ? 'bg-emerald-500 text-white' 
              : 'bg-amber-200 text-amber-700'
          }`}
        >
          {horasRestantes}h
        </span>
      )}
    </button>
  );
};

// Etapas del funnel por defecto (fallback si no se cargan de la BD)
const etapasFunnelDefault = [
  { id: 'Validación de contacto', label: 'Validación de contacto' },
  { id: 'Perfilamiento', label: 'Perfilamiento' },
  { id: 'Pitch agendado', label: 'Pitch agendado' },
  { id: 'Pitch', label: 'Pitch' },
  { id: 'Posible matrícula', label: 'Posible matrícula' },
  { id: 'Pendiente de pago', label: 'Pendiente de pago' },
];

// Función para calcular tiempo relativo
const getTimeAgo = (dateString) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return '1 día';
  if (diffDays < 30) return `${diffDays} días`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
  return `${Math.floor(diffDays / 365)} años`;
};

// Función para calcular tiempo detallado (para seguimiento)
const getTimeAgoDetailed = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;

  if (diffDays >= 1) {
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''} ${remainingHours}h y ${remainingMins}min`;
  }
  if (diffHours >= 1) {
    return `Hace ${diffHours}h y ${remainingMins}min`;
  }
  return `Hace ${diffMins}min`;
};

// Función para formatear fecha en 2 líneas: { fecha: "16 Dic 2025", hora: "05:00 pm" }
const formatFecha2Lineas = (dateString) => {
  if (!dateString) return { fecha: '-', hora: '' };
  
  const date = new Date(dateString);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();
  
  let horas = date.getHours();
  const minutos = date.getMinutes().toString().padStart(2, '0');
  const ampm = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12 || 12;
  
  return {
    fecha: `${dia} ${mes} ${año}`,
    hora: `${horas}:${minutos} ${ampm}`
  };
};

// Mapear estado_gestion de BD a estilos visuales
const statusStyles = {
  'gestionado': 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-200',
  'atrasado': 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-200',
  'sin_gestionar': 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-amber-200',
  'matriculado': 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-blue-200',
  'caido': 'bg-slate-300',
};

// Componente para la celda de fase con dropdown
const FaseCell = ({ lead, funnelSteps, noRevisado, coloresFases = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [faseLocal, setFaseLocal] = useState(lead.fase_nombre_pipefy);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // Sincronizar con el lead
  useEffect(() => {
    setFaseLocal(lead.fase_nombre_pipefy);
  }, [lead.fase_nombre_pipefy]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCambiarFase = async (nuevaFase) => {
    if (cambiando || nuevaFase === faseLocal) return;
    
    setCambiando(true);
    setIsOpen(false);
    
    const faseAnterior = faseLocal;
    setFaseLocal(nuevaFase);
    
    try {
      const response = await fetch('https://api.mdenglish.us/webhook/actualizar_fase_desde_el_portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: lead.card_id,
          fase_destino: nuevaFase
        })
      });
      
      if (!response.ok) throw new Error('Error en webhook');
      
      setToast({ type: 'success', message: `Fase actualizada` });
      setTimeout(() => setToast(null), 3000);
      
    } catch (error) {
      console.error('Error cambiando fase:', error);
      setFaseLocal(faseAnterior);
      setToast({ type: 'error', message: 'Error al cambiar fase' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {(() => {
        // Obtener los colores de la fase actual
        const faseConfig = coloresFases[lead.fase_id_pipefy] || { color: '#64748B', color_letra: '#000000' };
        const bgColor = faseConfig.color || '#64748B'; // Gris por defecto
        const textColor = faseConfig.color_letra || '#000000'; // Negro por defecto
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            disabled={cambiando}
            className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 font-medium ${
              cambiando ? 'opacity-50 cursor-wait' : 'hover:opacity-90'
            }`}
            style={{ 
              backgroundColor: bgColor,
              color: textColor
            }}
          >
            {cambiando ? (
              <RotateCcw size={12} className="animate-spin" />
            ) : (
              <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
            {faseLocal || 'Sin etapa'}
          </button>
        );
      })()}
      
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 max-h-64 overflow-y-auto">
          {funnelSteps.map((fase) => (
            <button
              key={fase.id}
              onClick={(e) => {
                e.stopPropagation();
                handleCambiarFase(fase.label || fase.id);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                faseLocal === (fase.label || fase.id)
                  ? 'bg-[#1717AF]/5 text-[#1717AF] font-medium'
                  : 'text-slate-700'
              }`}
            >
              {fase.label || fase.id}
            </button>
          ))}
        </div>
      )}
      
      {/* Toast mini */}
      {toast && (
        <div className={`absolute left-0 -top-10 z-50 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

const LeadsTable = ({ 
  leads = [], 
  statsData = {},
  etapasFunnel = { etapas: [], grupos: [] },
  onOpenModal, 
  onOpenReminder, 
  onOpenSeguimiento,
  onMarcarNoRevisado,
  onToggleHot,
  onToggleGestionWA,
  activeEtapa, 
  onEtapaChange,
  activeFilter,
  ultimosSeguimientos = {},
  // Props de paginación
  currentPage = 0,
  totalPages = 1,
  totalLeads = 0,
  showingFrom = 0,
  showingTo = 0,
  onNextPage,
  onPrevPage,
  isEmbedded = false,
  // Props de filtro WhatsApp (controlado desde Dashboard)
  filtroWhatsApp: filtroWhatsAppProp,
  onFiltroWhatsAppChange,
  // Props de filtro Nuevos Leads
  filtroNuevosLeads = false,
  nuevosLeadsCardIds = [],
  // Props de filtro HOT (controlado desde Dashboard)
  filtroHot: filtroHotProp,
  onFiltroHotChange,
  // Props de filtro Emdi (recordatorios automáticos)
  filtroEmdi: filtroEmdiProp,
  onFiltroEmdiChange,
  filtroGestionWA: filtroGestionWAProp,
  onFiltroGestionWAChange,
  // Props de ordenamiento
  sortConfig = { field: 'updated_at', ascending: false },
  onSortChange,
  // Configuración de colores de tags
  configTags = {},
  // Colores de las fases para indicador visual
  coloresFases = {},
  // Callback para refrescar datos después de acciones
  onRefreshData
}) => {
  // Extraer etapas y grupos del prop
  const { etapas: todasLasEtapas = [], grupos: todosLosGrupos = [] } = etapasFunnel;
  
  // Estado para el tab activo del funnel (inicializar con el primer grupo)
  const [activeFunnelTab, setActiveFunnelTab] = useState(null);
  
  // Estado para filtro de ventana WhatsApp (usa prop si está disponible, sino estado local)
  const [filtroWhatsAppLocal, setFiltroWhatsAppLocal] = useState('todos');
  const filtroWhatsApp = filtroWhatsAppProp !== undefined ? filtroWhatsAppProp : filtroWhatsAppLocal;
  const setFiltroWhatsApp = onFiltroWhatsAppChange || setFiltroWhatsAppLocal;
  
  // Estado para filtro de leads HOT (usa prop si está disponible, sino estado local)
  const [filtroHotLocal, setFiltroHotLocal] = useState(false);
  const filtroHot = filtroHotProp !== undefined ? filtroHotProp : filtroHotLocal;
  const setFiltroHot = onFiltroHotChange || setFiltroHotLocal;
  
  // Estado para filtro de Emdi (recordatorios automáticos)
  const [filtroEmdiLocal, setFiltroEmdiLocal] = useState(null); // null, 'activo', 'inactivo'
  const filtroEmdi = filtroEmdiProp !== undefined ? filtroEmdiProp : filtroEmdiLocal;
  const setFiltroEmdi = onFiltroEmdiChange || setFiltroEmdiLocal;
  
  // Estado para modal de Crear en Respond
  const [crearRespondModalOpen, setCrearRespondModalOpen] = useState(false);
  const [leadParaRespond, setLeadParaRespond] = useState(null);
  
  // Estado para modal de Activar Recordatorios Automáticos
  const [activarRecordatorioModalOpen, setActivarRecordatorioModalOpen] = useState(false);
  const [leadParaRecordatorio, setLeadParaRecordatorio] = useState(null);
  const [activandoRecordatorio, setActivandoRecordatorio] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Fases que aplican para recordatorios automáticos
  const FASES_RECORDATORIO_AUTO = ['340832804', '339756097', '341769991'];
  
  // Función para verificar si un lead tiene recordatorio automático activo
  const tieneRecordatorioActivo = (lead) => {
    if (!lead.fecha_recordatorio_automatico) return false;
    const fechaRecordatorio = new Date(lead.fecha_recordatorio_automatico);
    const ahora = new Date();
    return fechaRecordatorio >= ahora;
  };
  
  // Función para verificar si la fase aplica para recordatorios automáticos
  const faseAplicaParaRecordatorio = (lead) => {
    const faseId = String(lead.fase_id_pipefy);
    return FASES_RECORDATORIO_AUTO.includes(faseId);
  };
  
  // Handler para activar recordatorios automáticos
  const handleActivarRecordatorio = async () => {
    if (!leadParaRecordatorio) return;
    
    setActivandoRecordatorio(true);
    try {
      const response = await fetch('https://api.mdenglish.us/webhook/iniciar_recordatorio_automatico_desde_el_portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: leadParaRecordatorio.card_id })
      });
      
      const result = await response.json();
      
      if (result?.result === 'ok') {
        setToastMessage(`Los recordatorios automáticos para ${leadParaRecordatorio.nombre} se han activado.`);
        setTimeout(() => setToastMessage(null), 4000);
        onRefreshData?.();
      }
    } catch (error) {
      console.error('Error activando recordatorio:', error);
      setToastMessage('Error al activar recordatorios automáticos');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setActivandoRecordatorio(false);
      setActivarRecordatorioModalOpen(false);
      setLeadParaRecordatorio(null);
    }
  };
  
  // Handler para abrir modal de Crear en Respond
  const handleCrearRespond = (lead) => {
    setLeadParaRespond(lead);
    setCrearRespondModalOpen(true);
  };
  
  // Handler para éxito al crear en Respond (actualiza el lead en la lista)
  const handleRespondSuccess = (respondIoUrl, telefono) => {
    setCrearRespondModalOpen(false);
    setLeadParaRespond(null);
    // Refrescar datos para actualizar el UI
    onRefreshData?.();
  };
  
  // Toggle del filtro WhatsApp (click en el mismo lo desactiva)
  const handleFiltroWhatsApp = (filtro) => {
    setFiltroWhatsApp(prev => prev === filtro ? 'todos' : filtro);
  };
  
  // Toggle del filtro HOT
  const handleFiltroHot = () => {
    setFiltroHot(prev => !prev);
  };
  
  // Toggle del filtro Emdi (recordatorios automáticos)
  const handleFiltroEmdi = (tipo) => {
    setFiltroEmdi(prev => prev === tipo ? null : tipo);
  };
  
  // Si no hay tab activo y hay grupos, seleccionar el primero
  React.useEffect(() => {
    if (!activeFunnelTab && todosLosGrupos.length > 0) {
      setActiveFunnelTab(todosLosGrupos[0].id);
    }
  }, [todosLosGrupos, activeFunnelTab]);
  
  // Usar etapas de la BD o fallback al default
  const etapasAUsar = todasLasEtapas.length > 0 ? todasLasEtapas : etapasFunnelDefault;
  
  // Filtrar etapas según el tab seleccionado
  const etapasParaMostrar = etapasAUsar.filter(e => {
    if (!activeFunnelTab) return true;
    return e.grupo === activeFunnelTab;
  });
  
  const { porEtapa = {} } = statsData;
  
  // Calcular conteo por grupo (suma de etapas de cada grupo)
  const conteoPorGrupo = todosLosGrupos.reduce((acc, grupo) => {
    const etapasDelGrupo = etapasAUsar.filter(e => e.grupo === grupo.id);
    acc[grupo.id] = etapasDelGrupo.reduce((sum, etapa) => sum + (porEtapa[etapa.id] || 0), 0);
    return acc;
  }, {});

  return (
    <div className={isEmbedded ? '' : 'bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden'}>
      
      {/* Header de la tabla */}
      <div className="px-4 sm:px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-4">
          {/* Título y Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex-shrink-0">Funnel</h2>
            
            {/* Tabs dinámicos con contador - scroll horizontal en mobile */}
            {todosLosGrupos.length > 1 && (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 min-w-max">
                  {todosLosGrupos.map((grupo) => {
                    const count = conteoPorGrupo[grupo.id] || 0;
                    return (
                  <button
                    key={grupo.id}
                    onClick={() => setActiveFunnelTab(grupo.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                      activeFunnelTab === grupo.id
                        ? 'bg-white text-[#1717AF] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {grupo.nombre}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          activeFunnelTab === grupo.id
                            ? 'bg-[#1717AF]/10 text-[#1717AF]'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {count}
                        </span>
                  </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Chips de filtro por etapa del funnel */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {etapasParaMostrar.map((etapa) => {
              // Obtener conteo desde statsData (datos globales)
              const count = porEtapa[etapa.id] || 0;
              return (
                <button
                  key={etapa.id}
                  onClick={() => onEtapaChange?.(activeEtapa === etapa.id ? null : etapa.id)}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border ${
                    activeEtapa === etapa.id
                      ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
                  }`}
                >
                  {etapa.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider w-24">
                <button
                  onClick={() => onSortChange?.({
                    field: 'created_at',
                    ascending: sortConfig.field === 'created_at' ? !sortConfig.ascending : false
                  })}
                  className="flex items-center gap-1 hover:text-slate-600 transition-colors group"
                >
                  Creación
                  {sortConfig.field === 'created_at' ? (
                    sortConfig.ascending
                      ? <ChevronUp className="w-3.5 h-3.5 text-[#1717AF]" />
                      : <ChevronDown className="w-3.5 h-3.5 text-[#1717AF]" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                  )}
                </button>
              </th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider w-24">
                <button
                  onClick={() => onSortChange?.({
                    field: 'updated_at',
                    ascending: sortConfig.field === 'updated_at' ? !sortConfig.ascending : false
                  })}
                  className="flex items-center gap-1 hover:text-slate-600 transition-colors group"
                >
                  Actualización
                  {sortConfig.field === 'updated_at' ? (
                    sortConfig.ascending
                      ? <ChevronUp className="w-3.5 h-3.5 text-[#1717AF]" />
                      : <ChevronDown className="w-3.5 h-3.5 text-[#1717AF]" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                  )}
                </button>
              </th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Contacto</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider min-w-[280px]">Seguimiento</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Etapa</th>
              <th className="text-right py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">
                <div className="flex items-center justify-end gap-2">
                  {/* Filtros: WhatsApp abierta, WhatsApp cerrada, HOT, Emdi */}
                  <div className="flex items-center gap-1">
                    {/* WhatsApp verde - Ventana abierta */}
                    <button
                      onClick={() => handleFiltroWhatsApp('abierta')}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        filtroWhatsApp === 'abierta'
                          ? 'text-emerald-500'
                          : 'text-emerald-300 hover:text-emerald-400'
                      }`}
                      title="Ventana abierta (< 24h)"
                    >
                      <MessageCircle size={20} fill={filtroWhatsApp === 'abierta' ? 'currentColor' : 'none'} />
                    </button>
                    
                    {/* WhatsApp naranja - Ventana cerrada */}
                    <button
                      onClick={() => handleFiltroWhatsApp('cerrada')}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        filtroWhatsApp === 'cerrada'
                          ? 'text-amber-500'
                          : 'text-amber-300 hover:text-amber-400'
                      }`}
                      title="Ventana cerrada (> 24h)"
                    >
                      <MessageCircle size={20} fill={filtroWhatsApp === 'cerrada' ? 'currentColor' : 'none'} />
                    </button>
                    
                    {/* Fuego - Leads HOT */}
                    <button
                      onClick={handleFiltroHot}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        filtroHot
                          ? 'text-orange-500'
                          : 'text-orange-300 hover:text-orange-400'
                      }`}
                      title="Leads HOT"
                    >
                      <Flame size={20} fill={filtroHot ? 'currentColor' : 'none'} />
                    </button>
                    
                    {/* Sparkles activo - Con recordatorio automático */}
                    <button
                      onClick={() => handleFiltroEmdi('activo')}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        filtroEmdi === 'activo'
                          ? 'text-violet-500'
                          : 'text-violet-300 hover:text-violet-400'
                      }`}
                      title="Con recordatorio automático"
                    >
                      <Sparkles size={20} fill={filtroEmdi === 'activo' ? 'currentColor' : 'none'} />
                    </button>
                    
                    {/* Sparkles inactivo - Sin recordatorio automático */}
                    <button
                      onClick={() => handleFiltroEmdi('inactivo')}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        filtroEmdi === 'inactivo'
                          ? 'text-slate-500'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                      title="Sin recordatorio automático"
                    >
                      <Sparkles size={20} strokeDasharray={filtroEmdi === 'inactivo' ? '0' : '2 2'} />
                    </button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads
              .map((lead, index) => {
              // Usar el campo estado_gestion directamente de la BD
              const status = lead.estado_gestion || 'sin_gestionar';
              const noRevisado = lead.revisado === false;
              const isHot = lead.is_hot === true;
              
              return (
                <tr 
                  key={lead.id || lead.card_id || index}
                  onClick={() => onOpenModal?.(lead)}
                  className={`group transition-all duration-300 cursor-pointer relative ${
                    noRevisado 
                      ? 'bg-gradient-to-r from-blue-100 via-indigo-100/70 to-blue-50/50 hover:from-blue-200 hover:via-indigo-200/70' 
                      : 'hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent'
                  }`}
                  style={isHot ? { boxShadow: 'inset 4px 0 0 0 #f97316' } : {}}
                >
                  {/* Creación - 2 líneas */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-1.5 h-10 rounded-full shadow-sm" 
                        style={{ 
                          backgroundColor: coloresFases[lead.fase_id_pipefy]?.color || '#94A3B8' // Color por defecto gris
                        }} 
                      />
                      <div className="flex flex-col">
                        <span className={`text-xs ${noRevisado ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                          {formatFecha2Lineas(lead.created_at).fecha}
                        </span>
                        <span className={`text-xs ${noRevisado ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formatFecha2Lineas(lead.created_at).hora}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actualización - 2 líneas */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className={`text-xs ${noRevisado ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                        {formatFecha2Lineas(lead.updated_at).fecha}
                      </span>
                      <span className={`text-xs ${noRevisado ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatFecha2Lineas(lead.updated_at).hora}
                      </span>
                    </div>
                  </td>

                  {/* Contacto con bandera */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar con bandera */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg shadow-sm">
                          {getCountryFlag(lead.pais)}
                        </div>
                        {/* Indicador de lead HOT 🔥 */}
                        {isHot && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-300">
                            <Flame size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Nombre, Tag y Comercial */}
                      <div className="min-w-0">
                        <p className={`truncate max-w-[140px] lg:max-w-[180px] group-hover:text-slate-900 transition-colors ${
                          noRevisado ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        }`}>
                          {lead.nombre || 'Sin nombre'}
                        </p>
                        {/* Tag del lead con colores dinámicos */}
                        {lead.label && (() => {
                          const tagConfig = configTags[lead.label];
                          const bgColor = tagConfig?.color_tag || '#8B5CF6'; // Violeta por defecto
                          const textColor = tagConfig?.color_letra_tag || '#FFFFFF'; // Blanco por defecto
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5"
                              style={{ backgroundColor: bgColor, color: textColor }}
                            >
                              <Tag size={8} />
                              {lead.label}
                            </span>
                          );
                        })()}
                        <p className={`text-xs truncate max-w-[140px] ${noRevisado ? 'text-slate-500 font-medium' : 'text-slate-400'} ${lead.label ? 'mt-0.5' : ''}`}>
                          {lead.comercial_email ? lead.comercial_email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Sin comercial'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Seguimiento - ancho amplio con truncado - click abre tab Seguimiento */}
                  <td 
                    className="py-4 px-4 max-w-[320px] cursor-pointer hover:bg-slate-50/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSeguimiento?.(lead);
                    }}
                  >
                    {(() => {
                      const seguimiento = ultimosSeguimientos[lead.card_id];
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 max-w-[280px]">
                            {seguimiento ? (
                              <>
                                <p className={`text-sm truncate ${noRevisado ? 'text-slate-700' : 'text-slate-600'}`} title={`${seguimiento.categoria || 'Otro'}: ${seguimiento.texto}`}>
                                  <span className="text-[#1717AF] font-medium">{seguimiento.categoria || 'Otro'}</span>
                                  <span className="text-slate-400 mx-1">•</span>
                                  {seguimiento.texto}
                                </p>
                                <p className="text-xs text-slate-400">
                                  <span className="font-bold text-slate-600">{getTimeAgoDetailed(seguimiento.created_at)}</span>
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 italic">Este lead no tiene seguimiento</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSeguimiento?.(lead);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#1717AF] hover:bg-[#1717AF]/10 transition-all duration-200 flex-shrink-0"
                            title="Agregar seguimiento"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Etapa con dropdown */}
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <FaseCell 
                      lead={lead} 
                      funnelSteps={etapasAUsar} 
                      noRevisado={noRevisado}
                      coloresFases={coloresFases}
                    />
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp con contador de ventana 24h */}
                      <WhatsAppButton lead={lead} size={18} onCrearRespond={handleCrearRespond} />

                      {/* Marcar como pendiente */}
                      {onMarcarNoRevisado && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.revisado !== false) {
                              onMarcarNoRevisado?.(lead);
                            }
                          }}
                          disabled={lead.revisado === false}
                          className={`p-2.5 rounded-xl transition-all duration-200 ${
                            lead.revisado === false
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 hover:scale-110'
                          }`}
                          title={lead.revisado === false ? "Este lead ya está pendiente" : "Marcar como no leído"}
                        >
                          <RotateCcw size={18} strokeWidth={2} />
                        </button>
                      )}

                      {/* Recordatorios Automáticos (Emdi) - Solo para fases que aplican */}
                      {faseAplicaParaRecordatorio(lead) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const activo = tieneRecordatorioActivo(lead);
                            if (activo) {
                              // Si está activo, abrir sidebar en tab Emdi
                              onOpenModal?.(lead, 'tici');
                            } else {
                              // Si no está activo, mostrar modal de confirmación
                              setLeadParaRecordatorio(lead);
                              setActivarRecordatorioModalOpen(true);
                            }
                          }}
                          className={`p-2.5 rounded-xl transition-all duration-200 ${
                            tieneRecordatorioActivo(lead)
                              ? 'text-violet-500 hover:text-violet-600 hover:bg-violet-50'
                              : 'text-slate-300 hover:text-violet-400 hover:bg-violet-50'
                          }`}
                          title={tieneRecordatorioActivo(lead) ? "Ver recordatorio programado" : "Activar recordatorios automáticos"}
                        >
                          <Sparkles size={18} strokeWidth={2} fill={tieneRecordatorioActivo(lead) ? 'currentColor' : 'none'} />
                        </button>
                      )}

                      {/* Toggle HOT */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleHot?.(lead);
                        }}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          isHot
                            ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                            : 'text-slate-300 hover:text-orange-400 hover:bg-orange-50'
                        }`}
                        title={isHot ? "Quitar HOT" : "Marcar como HOT"}
                      >
                        <Flame size={18} strokeWidth={2} fill={isHot ? 'currentColor' : 'none'} />
                      </button>

                      {/* Toggle Gestión WhatsApp Personal */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const estabaActivo = lead.gestion_whatsapp_personal;
                          onToggleGestionWA?.(lead);
                          if (!estabaActivo) {
                            try {
                              const res = await fetch('https://api.mdenglish.us/webhook/actualizar_gestion_whatsapp', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  card_id: lead.card_id,
                                  gestion_whatsapp_personal: true,
                                  respond_io_url: lead.respond_io_url || null
                                })
                              });
                              if (res.ok) {
                                setToastMessage('Se actualizó la etiqueta de gestión por el WhatsApp del comercial en Respond');
                                setTimeout(() => setToastMessage(null), 4000);
                              }
                            } catch (err) {
                              console.error('Error notificando webhook gestión WA:', err);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          lead.gestion_whatsapp_personal
                            ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                            : 'text-slate-300 hover:text-green-400 hover:bg-green-50'
                        }`}
                        title={lead.gestion_whatsapp_personal ? "Gestión por WA Business del Comercial (activo)" : "Activar gestión por WA Business del Comercial"}
                      >
                        <svg viewBox="0 0 24 24" width={18} height={18} fill={lead.gestion_whatsapp_personal ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={lead.gestion_whatsapp_personal ? 0 : 1.5}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Estado vacío */}
        {leads.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <span className="text-3xl">📭</span>
            </div>
            <p className="text-slate-500 text-lg font-medium">No hay leads para mostrar</p>
            <p className="text-slate-400 text-sm mt-1">Los contactos aparecerán aquí cuando estén disponibles</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalLeads > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            {/* Info de paginación */}
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-medium text-slate-700">{showingFrom}</span> a{' '}
              <span className="font-medium text-slate-700">{showingTo}</span> de{' '}
              <span className="font-medium text-slate-700">{totalLeads}</span> leads
            </p>

            {/* Controles de paginación */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={currentPage === 0}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentPage === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-white hover:shadow-md hover:text-[#1717AF]'
                }`}
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Indicador de página */}
              <div className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-[#1717AF]">{currentPage + 1}</span>
                <span className="text-sm text-slate-400">/</span>
                <span className="text-sm text-slate-600">{totalPages}</span>
              </div>

              <button
                onClick={onNextPage}
                disabled={currentPage >= totalPages - 1}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentPage >= totalPages - 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-white hover:shadow-md hover:text-[#1717AF]'
                }`}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para crear lead en Respond.io */}
      <CrearRespondModal
        isOpen={crearRespondModalOpen}
        onClose={() => {
          setCrearRespondModalOpen(false);
          setLeadParaRespond(null);
        }}
        lead={leadParaRespond}
        onSuccess={handleRespondSuccess}
      />
      
      {/* Modal para activar recordatorios automáticos - renderizado en body */}
      {activarRecordatorioModalOpen && leadParaRecordatorio && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!activandoRecordatorio) {
                setActivarRecordatorioModalOpen(false);
                setLeadParaRecordatorio(null);
              }
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Sparkles size={20} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Recordatorios Automáticos</h3>
              </div>
              {!activandoRecordatorio && (
                <button
                  onClick={() => {
                    setActivarRecordatorioModalOpen(false);
                    setLeadParaRecordatorio(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">{leadParaRecordatorio.nombre}</span> no tiene la función de recordatorios automáticos activa. ¿Quieres activarla?
              </p>
            </div>
            
            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setActivarRecordatorioModalOpen(false);
                  setLeadParaRecordatorio(null);
                }}
                disabled={activandoRecordatorio}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={handleActivarRecordatorio}
                disabled={activandoRecordatorio}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {activandoRecordatorio ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Activando...</span>
                  </>
                ) : (
                  <span>Sí</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Toast de notificación - renderizado en body */}
      {toastMessage && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
            <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeadsTable;
