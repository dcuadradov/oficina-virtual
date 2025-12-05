import React from 'react';
import { MessageCircle, ClipboardList, Clock, ChevronRight } from 'lucide-react';

// Mapeo de países a banderas emoji
const countryFlags = {
  'Colombia': '🇨🇴',
  'colombia': '🇨🇴',
  'México': '🇲🇽',
  'Mexico': '🇲🇽',
  'méxico': '🇲🇽',
  'mexico': '🇲🇽',
  'España': '🇪🇸',
  'Espana': '🇪🇸',
  'españa': '🇪🇸',
  'Argentina': '🇦🇷',
  'argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'chile': '🇨🇱',
  'Perú': '🇵🇪',
  'Peru': '🇵🇪',
  'perú': '🇵🇪',
  'peru': '🇵🇪',
  'Ecuador': '🇪🇨',
  'ecuador': '🇪🇨',
  'Venezuela': '🇻🇪',
  'venezuela': '🇻🇪',
  'Estados Unidos': '🇺🇸',
  'USA': '🇺🇸',
  'Brasil': '🇧🇷',
  'brazil': '🇧🇷',
};

// Estilos modernos para cada fase
const faseStyles = {
  'Sin contacto': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Perfilamiento': { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  'Pitch agendado': { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-400' },
  'Pitch': { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
  'Posible matrícula': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  'Pendiente de pago': { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  'Nueva matrícula': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  'Matrícula caída': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
};

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

// Función para determinar el estado del lead
const getLeadStatus = (lead) => {
  const now = new Date();
  
  if (lead.fase_id_pipefy === "339756299" || lead.fase_id_pipefy === "341189602") {
    return 'none';
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

// Gradientes del indicador de estado
const statusStyles = {
  'gestionado': 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-200',
  'atrasado': 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-200',
  'sin-gestionar': 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-amber-200',
  'none': 'bg-slate-200',
};

const LeadsTable = ({ leads = [], onOpenModal, onOpenReminder }) => {
  
  const getLastReminder = (recordatorios) => {
    if (!recordatorios || recordatorios.length === 0) return null;
    const conFecha = recordatorios.filter(r => r.fecha_programada);
    if (conFecha.length === 0) return null;
    return conFecha.sort((a, b) => new Date(b.fecha_programada) - new Date(a.fecha_programada))[0];
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
      
      {/* Header de la tabla */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Gestión de Leads</h2>
            <p className="text-sm text-slate-400 mt-0.5">{leads.length} contactos en tu pipeline</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">Contacto</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Teléfono</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider">Fase</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">En gestión</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">En fase</th>
              <th className="text-left py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Recordatorio</th>
              <th className="text-center py-4 px-4 font-medium text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">#</th>
              <th className="text-right py-4 px-6 font-medium text-slate-400 text-xs uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map((lead, index) => {
              const status = getLeadStatus(lead);
              const lastReminder = getLastReminder(lead.recordatorios);
              const recordatoriosCount = lead.recordatorios?.length || 0;
              const faseStyle = faseStyles[lead.fase_nombre_pipefy] || { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' };
              
              return (
                <tr 
                  key={lead.id || index}
                  className="group hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent transition-all duration-300"
                >
                  {/* Contacto con bandera e indicador */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      {/* Indicador de estado con gradiente */}
                      <div className={`w-2 h-8 rounded-full ${statusStyles[status]} shadow-sm`} />
                      
                      {/* Avatar con bandera */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg shadow-sm">
                          {countryFlags[lead.pais] || '🌎'}
                        </div>
                      </div>
                      
                      {/* Nombre */}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate max-w-[140px] lg:max-w-[180px] group-hover:text-slate-900 transition-colors">
                          {lead.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">
                          {lead.pais || 'País no especificado'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Teléfono */}
                  <td className="py-4 px-4">
                    <span className="text-slate-600 text-sm font-medium tabular-nums">
                      {lead.telefono || '-'}
                    </span>
                  </td>

                  {/* Fase Badge moderno */}
                  <td className="py-4 px-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${faseStyle.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${faseStyle.dot}`} />
                      <span className={`text-xs font-semibold ${faseStyle.text}`}>
                        {lead.fase_nombre_pipefy || 'Sin fase'}
                      </span>
                    </div>
                  </td>

                  {/* Tiempo en gestión */}
                  <td className="py-4 px-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <span className="text-xs">📅</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">
                        {getTimeAgo(lead.created_at)}
                      </span>
                    </div>
                  </td>

                  {/* Tiempo en fase */}
                  <td className="py-4 px-4 hidden lg:table-cell">
                    <span className="text-sm text-slate-500 font-medium">
                      {getTimeAgo(lead.updated_at)}
                    </span>
                  </td>

                  {/* Último recordatorio */}
                  <td className="py-4 px-4 hidden md:table-cell">
                    <span className="text-sm text-slate-500">
                      {lastReminder ? getTimeAgo(lastReminder.fecha_programada) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  </td>

                  {/* # Recordatorios */}
                  <td className="py-4 px-4 text-center hidden md:table-cell">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">
                      {recordatoriosCount}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp */}
                      <button
                        onClick={() => {
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
                        title={lead.respond_io_url ? "Abrir chat en WhatsApp" : "Sin enlace de chat disponible"}
                      >
                        <MessageCircle size={18} strokeWidth={2} />
                      </button>

                      {/* Modal Info */}
                      <button
                        onClick={() => onOpenModal?.(lead)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                        title="Ver información"
                      >
                        <ClipboardList size={18} strokeWidth={2} />
                      </button>

                      {/* Recordatorio */}
                      <button
                        onClick={() => onOpenReminder?.(lead)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200 hover:scale-110"
                        title="Programar recordatorio"
                      >
                        <Clock size={18} strokeWidth={2} />
                      </button>

                      {/* Flecha para indicar que es clickeable */}
                      <ChevronRight size={16} className="text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Estado vacío elegante */}
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
    </div>
  );
};

export default LeadsTable;
