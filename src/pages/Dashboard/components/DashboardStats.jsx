import React from 'react';
import { Users, Clock, Bell, MessageCircle, UserPlus } from 'lucide-react';

const DashboardStats = ({ 
  statsData = {}, 
  activeFilter = 'todos', 
  onFilterChange, 
  onCrearLead,
  ventanasAbiertas = 0,
  nuevosLeads = 0,
  filtroWhatsApp = 'todos',
  onFiltroWhatsAppChange
}) => {
  const { total = 0, porEstado = {} } = statsData;

  // Mapear los estados de la BD a los keys del frontend
  const stats = {
    total,
    recordatorio_activo: porEstado.gestionado || 0, // gestionado en BD = recordatorio_activo en UI
  };

  // Configuración de estilos para cada stat card
  // Orden: Total leads, Nuevos leads, Ventanas abiertas, Recordatorio activo
  const statsConfig = [
    {
      key: 'todos',
      title: 'Total Leads',
      count: stats.total,
      icon: Users,
      gradient: 'from-[#02214A] to-[#1717AF]',
      bgGradient: 'from-[#02214A]/5 to-[#1717AF]/5',
      iconBg: 'bg-gradient-to-br from-[#02214A]/10 to-[#1717AF]/10',
      textColor: 'text-[#02214A]',
      clickable: true,
    },
    {
      key: 'nuevos_leads',
      title: 'Nuevos Leads',
      count: nuevosLeads,
      icon: Bell,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100',
      textColor: 'text-amber-600',
      clickable: false, // Solo informativo, no filtra
    },
    {
      key: 'ventanas_abiertas',
      title: 'Ventanas Abiertas',
      count: ventanasAbiertas,
      icon: MessageCircle,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-green-100',
      textColor: 'text-emerald-600',
      clickable: true, // Ahora filtra usando el filtro de WhatsApp
      isWhatsAppFilter: true, // Flag especial para manejar diferente
    },
    {
      key: 'gestionado', // Mantener key 'gestionado' para compatibilidad con BD
      title: 'Recordatorio Activo',
      count: stats.recordatorio_activo,
      icon: Clock,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-gradient-to-br from-violet-100 to-purple-100',
      textColor: 'text-violet-600',
      clickable: true,
    },
  ];

  // Handler para click en cards
  const handleStatClick = (stat) => {
    if (!stat.clickable) return;
    
    // Si es el filtro de WhatsApp, usar su propio handler
    if (stat.isWhatsAppFilter) {
      const nuevoFiltro = filtroWhatsApp === 'abierta' ? 'todos' : 'abierta';
      onFiltroWhatsAppChange?.(nuevoFiltro);
      return;
    }
    
    // Para otros filtros, usar el handler normal
    const isActive = activeFilter === stat.key;
    onFilterChange?.(isActive ? 'todos' : stat.key);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        const isActive = stat.isWhatsAppFilter 
          ? filtroWhatsApp === 'abierta' 
          : activeFilter === stat.key;
        const isClickable = stat.clickable;
        
        return (
          <button
            key={stat.key}
            onClick={() => handleStatClick(stat)}
            className={`
              relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300
              ${isActive && isClickable
                ? `bg-gradient-to-br ${stat.bgGradient} ring-2 ring-offset-2 ring-[#1717AF] shadow-lg scale-[1.02]` 
                : 'bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg shadow-sm'
              }
              ${isClickable ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}
              border border-slate-200/60
              group
            `}
          >
            {/* Decoración de fondo */}
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
            
            {/* Icono */}
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
              <Icon className={`w-5 h-5 ${stat.textColor}`} strokeWidth={2} />
            </div>
            
            {/* Número */}
            <div className={`text-3xl font-bold ${stat.textColor} mb-1 tabular-nums`}>
              {stat.count}
            </div>
            
            {/* Título */}
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {stat.title}
            </div>
            
            {/* Indicador de activo */}
            {isActive && isClickable && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-[#1717AF] animate-pulse" />
              </div>
            )}
            
            {/* Indicador de solo lectura para cards no clickeables */}
            {!isClickable && (
              <div className="absolute top-3 right-3">
                <div className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Info
                </div>
              </div>
            )}
          </button>
        );
      })}

      {/* Tarjeta especial para crear leads */}
      <button
        onClick={onCrearLead}
        className="relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg hover:scale-[1.02] shadow-sm border border-slate-200/60 border-dashed group cursor-pointer"
      >
        {/* Decoración de fondo */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-5 group-hover:opacity-15 transition-opacity" />
        
        {/* Icono centrado */}
        <div className="flex flex-col items-center justify-center h-full py-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
            <UserPlus className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          
          {/* Título */}
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-center">
            Crear Lead(s)
          </div>
        </div>
      </button>
    </div>
  );
};

export default DashboardStats;
