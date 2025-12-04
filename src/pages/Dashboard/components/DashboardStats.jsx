import React, { useMemo, useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, UserPlus, UserX } from 'lucide-react';

const DashboardStats = ({ leads = [] }) => {
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

      // 1. FASES ESPECIALES (tienen prioridad sobre cualquier fecha)
      if (lead.fase_id_pipefy === "339756299") { 
        counts.nuevaMatricula++;
        return; 
      }
      if (lead.fase_id_pipefy === "341189602") { 
        counts.matriculaCaida++;
        return; 
      }

      // 2. LÓGICA DE RECORDATORIOS
      const recordatorios = lead.recordatorios || [];
      
      // Si no hay recordatorios -> SIN GESTIONAR
      if (recordatorios.length === 0) {
        counts.sinGestionar++;
        return;
      }

      // Filtrar recordatorios con fecha válida
      const recordatoriosConFecha = recordatorios.filter(r => r.fecha_programada);
      
      // Si todos los recordatorios tienen fecha NULL -> SIN GESTIONAR
      if (recordatoriosConFecha.length === 0) {
        counts.sinGestionar++;
        return;
      }

      // A. ¿Hay algún recordatorio con fecha/hora >= ahora? -> GESTIONADO
      const tieneRecordatorioVigente = recordatoriosConFecha.some(r => {
        const fechaRecordatorio = new Date(r.fecha_programada);
        return fechaRecordatorio >= now; // Incluye fecha Y hora
      });

      if (tieneRecordatorioVigente) {
        counts.gestionado++;
        return;
      }

      // B. Si todos están vencidos, miramos el MÁS RECIENTE
      const recordatorioMasReciente = recordatoriosConFecha
        .map(r => ({ ...r, fechaDate: new Date(r.fecha_programada) }))
        .sort((a, b) => b.fechaDate - a.fechaDate)[0];

      // Calcular diferencia en horas desde que venció
      const horasDiferencia = (now - recordatorioMasReciente.fechaDate) / (1000 * 60 * 60);

      if (horasDiferencia > 48) {
        // Venció hace más de 48 horas -> ATRASADO
        counts.atrasado++;
      } else {
        // Venció hace menos de 48 horas -> SIN GESTIONAR
        counts.sinGestionar++;
      }
    });

    return counts;
  }, [leads, tick]);

  const StatCard = ({ title, count, icon: Icon, color, subColor }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-full mb-3 ${subColor}`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <span className={`text-4xl font-bold ${color} font-bookman`}>{count}</span>
      <span className="text-sm text-slate-500 font-medium mt-1 text-center">{title}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <StatCard title="Clientes" count={stats.total} icon={Users} color="text-slate-800" subColor="bg-slate-100" />
      <StatCard title="Sin gestionar" count={stats.sinGestionar} icon={Clock} color="text-yellow-600" subColor="bg-yellow-50" />
      <StatCard title="Atrasado" count={stats.atrasado} icon={AlertCircle} color="text-red-600" subColor="bg-red-50" />
      <StatCard title="Gestionado" count={stats.gestionado} icon={CheckCircle} color="text-green-600" subColor="bg-green-50" />
      <StatCard title="Nueva matrícula" count={stats.nuevaMatricula} icon={UserPlus} color="text-blue-600" subColor="bg-blue-50" />
      <StatCard title="Matrícula caída" count={stats.matriculaCaida} icon={UserX} color="text-gray-500" subColor="bg-gray-100" />
    </div>
  );
};

export default DashboardStats;