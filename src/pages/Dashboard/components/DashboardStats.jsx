import React, { useMemo, useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, UserPlus, UserX } from 'lucide-react';

const DashboardStats = ({ leads = [], activeFilter = 'todos', onFilterChange }) => {
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const timerID = setInterval(() => setTick(new Date()), 60000);
    return () => clearInterval(timerID);
  }, []);

  const stats = useMemo(() => {
    const now = tick;
    
    let counts = {
      total: 0,
      sinGestionar: 0,
      atrasado: 0,
      gestionado: 0,
      nuevaMatricula: 0,
      matriculaCaida: 0
    };

    leads.forEach(lead => {
      counts.total++;

      if (lead.fase_id_pipefy === "339756299") { 
        counts.nuevaMatricula++;
        return; 
      }
      if (lead.fase_id_pipefy === "341189602") { 
        counts.matriculaCaida++;
        return; 
      }

      const recordatorios = lead.recordatorios || [];
      
      if (recordatorios.length === 0) {
        counts.sinGestionar++;
        return;
      }

      const recordatoriosConFecha = recordatorios.filter(r => r.fecha_programada);
      
      if (recordatoriosConFecha.length === 0) {
        counts.sinGestionar++;
        return;
      }

      const tieneRecordatorioVigente = recordatoriosConFecha.some(r => {
        const fechaRecordatorio = new Date(r.fecha_programada);
        return fechaRecordatorio >= now;
      });

      if (tieneRecordatorioVigente) {
        counts.gestionado++;
        return;
      }

      const recordatorioMasReciente = recordatoriosConFecha
        .map(r => ({ ...r, fechaDate: new Date(r.fecha_programada) }))
        .sort((a, b) => b.fechaDate - a.fechaDate)[0];

      const horasDiferencia = (now - recordatorioMasReciente.fechaDate) / (1000 * 60 * 60);

      if (horasDiferencia > 48) {
        counts.atrasado++;
      } else {
        counts.sinGestionar++;
      }
    });

    return counts;
  }, [leads, tick]);

  // Configuración de estilos para cada stat card con colores corporativos
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
      key: 'sinGestionar',
      title: 'Sin gestionar',
      count: stats.sinGestionar,
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
      key: 'nuevaMatricula',
      title: 'Nueva matrícula',
      count: stats.nuevaMatricula,
      icon: UserPlus,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      textColor: 'text-blue-600',
    },
    {
      key: 'matriculaCaida',
      title: 'Matrícula caída',
      count: stats.matriculaCaida,
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
            
            {/* Indicador de activo con color corporativo */}
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
