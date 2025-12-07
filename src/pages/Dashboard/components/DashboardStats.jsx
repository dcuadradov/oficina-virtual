import React from 'react';
import { Users, Clock, AlertCircle, CheckCircle, UserPlus, UserX } from 'lucide-react';

const DashboardStats = ({ statsData = {}, activeFilter = 'todos', onFilterChange }) => {
  const { total = 0, porEstado = {} } = statsData;

  // Mapear los estados de la BD a los keys del frontend
  const stats = {
    total,
    sin_gestionar: porEstado.sin_gestionar || 0,
    atrasado: porEstado.atrasado || 0,
    gestionado: porEstado.gestionado || 0,
    matriculado: porEstado.matriculado || 0,
    caido: porEstado.caido || 0,
  };

  // Configuración de estilos para cada stat card
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
    },
    {
      key: 'sin_gestionar',
      title: 'Sin gestionar',
      count: stats.sin_gestionar,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100',
      textColor: 'text-amber-600',
    },
    {
      key: 'atrasado',
      title: 'Atrasado',
      count: stats.atrasado,
      icon: AlertCircle,
      gradient: 'from-rose-500 to-red-600',
      bgGradient: 'from-rose-50 to-red-50',
      iconBg: 'bg-gradient-to-br from-rose-100 to-red-100',
      textColor: 'text-rose-600',
    },
    {
      key: 'gestionado',
      title: 'Gestionado',
      count: stats.gestionado,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-green-100',
      textColor: 'text-emerald-600',
    },
    {
      key: 'matriculado',
      title: 'Nueva matrícula',
      count: stats.matriculado,
      icon: UserPlus,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      textColor: 'text-blue-600',
    },
    {
      key: 'caido',
      title: 'Matrícula caída',
      count: stats.caido,
      icon: UserX,
      gradient: 'from-slate-400 to-slate-500',
      bgGradient: 'from-slate-50 to-gray-100',
      iconBg: 'bg-slate-100',
      textColor: 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.key;
        
        return (
          <button
            key={stat.key}
            onClick={() => onFilterChange?.(isActive ? 'todos' : stat.key)}
            className={`
              relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300
              ${isActive 
                ? `bg-gradient-to-br ${stat.bgGradient} ring-2 ring-offset-2 ring-[#1717AF] shadow-lg scale-[1.02]` 
                : 'bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg hover:scale-[1.02] shadow-sm'
              }
              border border-slate-200/60
              group cursor-pointer
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
            {isActive && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-[#1717AF] animate-pulse" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DashboardStats;
