import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ClipboardList, Clock, ChevronRight, ChevronLeft, ChevronDown, RotateCcw, Flame, Plus, Tag } from 'lucide-react';
import { getCountryFlag } from '../../../utils/countryFlags';

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
 */
const WhatsAppButton = ({ lead, size = 18 }) => {
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

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (tieneUrl) {
          window.open(lead.respond_io_url, '_blank');
        }
      }}
      disabled={!tieneUrl}
      className={`relative p-2.5 rounded-xl transition-all duration-200 ${
        tieneUrl 
          ? activo
            ? 'text-emerald-600 hover:bg-emerald-50 hover:scale-110 cursor-pointer'
            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:scale-110 cursor-pointer'
          : 'text-slate-200 cursor-not-allowed'
      }`}
      title={
        !tieneUrl 
          ? "Sin conversación disponible" 
          : activo 
            ? `Ventana activa: ${horasRestantes}h restantes` 
            : "Ventana de 24h expirada"
      }
    >
      <MessageCircle size={size} strokeWidth={2} />
      
      {/* Badge contador */}
      {mostrarContador && tieneUrl && (
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
const FaseCell = ({ lead, funnelSteps, noRevisado }) => {
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={cambiando}
        className={`text-sm px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 ${
          cambiando 
            ? 'text-slate-400 cursor-wait'
            : noRevisado 
              ? 'text-slate-800 font-bold hover:bg-slate-100' 
              : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {cambiando ? (
          <RotateCcw size={12} className="animate-spin" />
        ) : (
          <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
        {faseLocal || 'Sin etapa'}
      </button>
      
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
  isEmbedded = false
}) => {
  // Extraer etapas y grupos del prop
  const { etapas: todasLasEtapas = [], grupos: todosLosGrupos = [] } = etapasFunnel;
  
  // Estado para el tab activo del funnel (inicializar con el primer grupo)
  const [activeFunnelTab, setActiveFunnelTab] = useState(null);
  
  // Estado para filtro de ventana WhatsApp
  const [filtroWhatsApp, setFiltroWhatsApp] = useState('todos'); // 'todos' | 'abierta' | 'cerrada'
  
  // Estado para filtro de leads HOT
  const [filtroHot, setFiltroHot] = useState(false);
  
  // Toggle del filtro WhatsApp (click en el mismo lo desactiva)
  const handleFiltroWhatsApp = (filtro) => {
    setFiltroWhatsApp(prev => prev === filtro ? 'todos' : filtro);
  };
  
  // Toggle del filtro HOT
  const handleFiltroHot = () => {
    setFiltroHot(prev => !prev);
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
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider w-24">Creación</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider w-24">Actualización</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Contacto</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider min-w-[280px]">Seguimiento</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Etapa</th>
              <th className="text-right py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">
                <div className="flex items-center justify-end gap-3">
                  <span>Acciones</span>
                  
                  {/* Filtros: WhatsApp abierta, WhatsApp cerrada, HOT */}
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
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads
              .filter((lead) => {
                // Filtro de leads HOT
                if (filtroHot && lead.is_hot !== true) return false;
                
                // Filtro de ventana WhatsApp
                if (filtroWhatsApp === 'todos') return true;
                
                const timestamp = lead.timestamp_ultimo_mensaje_whatsapp;
                if (!timestamp) {
                  // Sin timestamp = ventana cerrada
                  return filtroWhatsApp === 'cerrada';
                }
                
                const diffHoras = (new Date() - new Date(timestamp)) / (1000 * 60 * 60);
                const ventanaAbierta = diffHoras < 24;
                
                if (filtroWhatsApp === 'abierta') return ventanaAbierta;
                if (filtroWhatsApp === 'cerrada') return !ventanaAbierta;
                return true;
              })
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
                      <div className={`w-1.5 h-10 rounded-full ${statusStyles[status] || statusStyles['sin_gestionar']} shadow-sm`} />
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
                        {/* Tag del lead */}
                        {lead.label && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 mt-0.5">
                            <Tag size={8} />
                            {lead.label}
                          </span>
                        )}
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
                    />
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp con contador de ventana 24h */}
                      <WhatsAppButton lead={lead} size={18} />

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

                      {/* Flecha */}
                      <ChevronRight size={16} className="text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
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
      
    </div>
  );
};

export default LeadsTable;
