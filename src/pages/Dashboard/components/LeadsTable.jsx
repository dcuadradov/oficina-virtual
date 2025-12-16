import React from 'react';
import { MessageCircle, ClipboardList, Clock, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { getCountryFlag } from '../../../utils/countryFlags';

// Etapas del funnel para los chips de filtro
const etapasFunnel = [
  { id: 'Sin contacto', label: 'Sin contacto' },
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

// Función para formatear fecha de asignación: "16 Dic 2025 05:00 pm"
const formatFechaAsignacion = (dateString) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();
  
  let horas = date.getHours();
  const minutos = date.getMinutes().toString().padStart(2, '0');
  const ampm = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12 || 12;
  
  return `${dia} ${mes} ${año} ${horas}:${minutos} ${ampm}`;
};

// Mapear estado_gestion de BD a estilos visuales
const statusStyles = {
  'gestionado': 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-200',
  'atrasado': 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-200',
  'sin_gestionar': 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-amber-200',
  'matriculado': 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-blue-200',
  'caido': 'bg-slate-300',
};

const LeadsTable = ({ 
  leads = [], 
  statsData = {},
  onOpenModal, 
  onOpenReminder, 
  onMarcarNoRevisado,
  activeEtapa, 
  onEtapaChange,
  activeFilter,
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
  
  const { porEtapa = {} } = statsData;

  return (
    <div className={isEmbedded ? '' : 'bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden'}>
      
      {/* Header de la tabla */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Gestión de Leads</h2>
          </div>
          
          {/* Chips de filtro por etapa del funnel */}
          <div className="flex flex-wrap gap-2">
            {etapasFunnel.map((etapa) => {
              // Obtener conteo desde statsData (datos globales)
              const count = porEtapa[etapa.id] || 0;
              return (
                <button
                  key={etapa.id}
                  onClick={() => onEtapaChange?.(activeEtapa === etapa.id ? null : etapa.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
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
              <th className="text-left py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">Actualizado</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Contacto</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Teléfono</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Fase</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">En gestión</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">En fase</th>
              <th className="text-right py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map((lead, index) => {
              // Usar el campo estado_gestion directamente de la BD
              const status = lead.estado_gestion || 'sin_gestionar';
              const noRevisado = lead.revisado === false;
              
              return (
                <tr 
                  key={lead.id || lead.card_id || index}
                  onClick={() => onOpenModal?.(lead)}
                  className={`group transition-all duration-300 cursor-pointer ${
                    noRevisado 
                      ? 'bg-gradient-to-r from-blue-100 via-indigo-100/70 to-blue-50/50 hover:from-blue-200 hover:via-indigo-200/70' 
                      : 'hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent'
                  }`}
                >
                  {/* Asignación con indicador de estado */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {/* Indicador de estado */}
                      <div className={`w-2 h-8 rounded-full ${statusStyles[status] || statusStyles['sin_gestionar']} shadow-sm`} />
                      
                      <span className={`text-xs ${noRevisado ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                        {formatFechaAsignacion(lead.fecha_asignacion)}
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
                      </div>
                      
                      {/* Nombre */}
                      <div className="min-w-0">
                        <p className={`truncate max-w-[140px] lg:max-w-[180px] group-hover:text-slate-900 transition-colors ${
                          noRevisado ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        }`}>
                          {lead.nombre || 'Sin nombre'}
                        </p>
                        <p className={`text-xs truncate max-w-[140px] ${noRevisado ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                          {lead.pais || 'País no especificado'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Teléfono */}
                  <td className="py-4 px-4">
                    <span className={`text-sm tabular-nums ${noRevisado ? 'text-slate-800 font-bold' : 'text-slate-600 font-medium'}`}>
                      {lead.telefono || '-'}
                    </span>
                  </td>

                  {/* Fase */}
                  <td className="py-4 px-4">
                    <span className={`text-sm ${noRevisado ? 'text-slate-800 font-bold' : 'text-slate-600'}`}>
                        {lead.fase_nombre_pipefy || 'Sin fase'}
                      </span>
                  </td>

                  {/* Tiempo en gestión */}
                  <td className="py-4 px-4 hidden lg:table-cell">
                    <span className={`text-sm ${noRevisado ? 'text-slate-700 font-bold' : 'text-slate-500 font-medium'}`}>
                        {getTimeAgo(lead.created_at)}
                      </span>
                  </td>

                  {/* Tiempo en fase */}
                  <td className="py-4 px-4 hidden lg:table-cell">
                    <span className={`text-sm ${noRevisado ? 'text-slate-700 font-bold' : 'text-slate-500 font-medium'}`}>
                      {getTimeAgo(lead.updated_at)}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (lead.respond_io_url) {
                            window.open(lead.respond_io_url, '_blank');
                          }
                        }}
                        disabled={!lead.respond_io_url}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          lead.respond_io_url 
                            ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:scale-110 cursor-pointer' 
                            : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title={lead.respond_io_url ? "Ir a la conversación de WhatsApp" : "Sin conversación disponible"}
                      >
                        <MessageCircle size={18} strokeWidth={2} />
                      </button>

                      {/* Modal Info */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModal?.(lead, 'formulario');
                        }}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                        title="Ver formulario del lead"
                      >
                        <ClipboardList size={18} strokeWidth={2} />
                      </button>

                      {/* Recordatorio */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReminder?.(lead);
                        }}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200 hover:scale-110"
                        title="Programar un recordatorio"
                      >
                        <Clock size={18} strokeWidth={2} />
                      </button>

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
