import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Config IDs para contar (prod)
const CONFIG_IDS = {
  'Nuevo WEB': '514a5826-12c2-4639-924e-9920c4d0e024',
  'Nuevo META 1': 'e91b3860-5b8d-4d8a-a470-6e53f695bc36'
};

export default function MetricasAsignaciones({
  selectedComercial,
  selectedMes,
  selectedPeriodo,
  selectedDia,
  selectedTag,
  puedeVerTodos
}) {
  const [metricasData, setMetricasData] = useState([]);
  const [metricasTotalLeads, setMetricasTotalLeads] = useState(0);
  const [loadingMetricas, setLoadingMetricas] = useState(false);

  // Parsear filtros de fecha (ajustados a zona horaria Colombia UTC-5)
  const parseDateFilters = useCallback(() => {
    let fechaInicio = null;
    let fechaFin = null;

    if (selectedDia) {
      // Día tiene formato: "2025-01-28"
      // Convertir a UTC: 00:00 Colombia = 05:00 UTC
      const [year, month, day] = selectedDia.split('-').map(Number);
      const mananaDate = new Date(year, month - 1, day + 1);
      const fechaManana = `${mananaDate.getFullYear()}-${String(mananaDate.getMonth() + 1).padStart(2, '0')}-${String(mananaDate.getDate()).padStart(2, '0')}`;
      
      fechaInicio = `${selectedDia} 05:00:00+00`;
      fechaFin = `${fechaManana} 05:00:00+00`;
    } else if (selectedPeriodo) {
      // Periodo tiene formato: "2025-01-07_2025-01-14"
      const [inicio, fin] = selectedPeriodo.split('_');
      // Convertir a UTC
      const [yearFin, monthFin, dayFin] = fin.split('-').map(Number);
      const finMasUno = new Date(yearFin, monthFin - 1, dayFin + 1);
      const fechaFinMasUno = `${finMasUno.getFullYear()}-${String(finMasUno.getMonth() + 1).padStart(2, '0')}-${String(finMasUno.getDate()).padStart(2, '0')}`;
      
      fechaInicio = `${inicio} 05:00:00+00`;
      fechaFin = `${fechaFinMasUno} 05:00:00+00`;
    } else if (selectedMes) {
      // Mes tiene formato: "2025-01"
      const [año, mes] = selectedMes.split('-');
      // Primer día del mes siguiente
      const mesSiguiente = new Date(parseInt(año), parseInt(mes), 1);
      const fechaMesSiguiente = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01`;
      
      fechaInicio = `${año}-${mes}-01 05:00:00+00`;
      fechaFin = `${fechaMesSiguiente} 05:00:00+00`;
    }

    return { fechaInicio, fechaFin };
  }, [selectedDia, selectedMes, selectedPeriodo]);

  // Función para cargar métricas de asignaciones
  const fetchMetricas = useCallback(async () => {
    setLoadingMetricas(true);
    try {
      const { fechaInicio, fechaFin } = parseDateFilters();
      
      // Config IDs para contar
      let configIds = Object.values(CONFIG_IDS);
      
      // Filtrar por tag si está seleccionado
      if (selectedTag === 'Nuevo WEB') {
        configIds = [CONFIG_IDS['Nuevo WEB']];
      } else if (selectedTag === 'Nuevo META 1') {
        configIds = [CONFIG_IDS['Nuevo META 1']];
      }
      
      // Query a notificaciones agrupando por comercial_email
      let query = supabase
        .from('notificaciones')
        .select('comercial_email, config_id')
        .in('config_id', configIds);
      
      // Aplicar filtros de fecha
      if (fechaInicio && fechaFin) {
        query = query.gte('created_at', fechaInicio).lte('created_at', fechaFin);
      } else {
        // Por defecto: solo hoy (en zona horaria Colombia UTC-5)
        const opcionesFecha = { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' };
        const fechaColombia = new Date().toLocaleDateString('en-CA', opcionesFecha);
        
        const [year, month, day] = fechaColombia.split('-').map(Number);
        const mananaDate = new Date(year, month - 1, day + 1);
        const fechaManana = `${mananaDate.getFullYear()}-${String(mananaDate.getMonth() + 1).padStart(2, '0')}-${String(mananaDate.getDate()).padStart(2, '0')}`;
        
        const inicioHoyUTC = `${fechaColombia} 05:00:00+00`;
        const finHoyUTC = `${fechaManana} 05:00:00+00`;
        
        console.log('Filtro métricas - Fecha Colombia:', fechaColombia, '| Rango UTC:', inicioHoyUTC, '-', finHoyUTC);
        
        query = query.gte('created_at', inicioHoyUTC).lt('created_at', finHoyUTC);
      }
      
      // Filtrar por comercial si está seleccionado
      if (puedeVerTodos && selectedComercial) {
        query = query.eq('comercial_email', selectedComercial);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Agrupar por comercial_email y contar
      const conteosPorComercial = {};
      (data || []).forEach(notif => {
        const email = notif.comercial_email || 'Sin asignar';
        conteosPorComercial[email] = (conteosPorComercial[email] || 0) + 1;
      });
      
      // Obtener info de comerciales (nombre, performance)
      const comercialesEmails = Object.keys(conteosPorComercial).filter(e => e !== 'Sin asignar');
      let comercialesInfo = [];
      
      if (comercialesEmails.length > 0) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('email, nombre, performance')
          .in('email', comercialesEmails);
        
        // Crear mapa de usuarios
        const usuariosMap = {};
        (usuarios || []).forEach(u => {
          usuariosMap[u.email] = u;
        });
        
        // Crear info para cada comercial que tiene conteos
        comercialesInfo = Object.keys(conteosPorComercial).map(email => {
          const usuario = usuariosMap[email];
          return {
            email: email,
            nombre: usuario?.nombre || email.split('@')[0] || email,
            performance: usuario?.performance || 'Mid',
            cantidad: conteosPorComercial[email] || 0
          };
        });
      } else if (Object.keys(conteosPorComercial).length > 0) {
        // Si no hay emails pero hay conteos (ej: "Sin asignar")
        comercialesInfo = Object.keys(conteosPorComercial).map(email => ({
          email: email,
          nombre: email,
          performance: 'Mid',
          cantidad: conteosPorComercial[email] || 0
        }));
      }
      
      // Ordenar por cantidad descendente
      comercialesInfo.sort((a, b) => b.cantidad - a.cantidad);
      
      setMetricasData(comercialesInfo);
      setMetricasTotalLeads(data?.length || 0);
      
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      setLoadingMetricas(false);
    }
  }, [puedeVerTodos, selectedComercial, selectedTag, parseDateFilters]);

  // Cargar métricas cuando cambian los filtros
  useEffect(() => {
    fetchMetricas();
  }, [fetchMetricas]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Total de leads */}
      <h2 className="text-3xl font-bold text-[#02214A] mb-6">
        {loadingMetricas ? (
          <span className="inline-block w-24 h-9 bg-slate-200 rounded animate-pulse" />
        ) : (
          `${metricasTotalLeads} leads`
        )}
      </h2>

      {/* Gráfico de barras */}
      <div>
        {/* Header del gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-500 mb-1">Asignación</p>
            <h3 className="text-lg font-bold text-[#02214A]">LEADS POR COMERCIAL</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
              <span className="text-xs text-slate-500">Top</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
              <span className="text-xs text-slate-500">Successful</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-xs text-slate-500">Low</span>
            </div>
          </div>
        </div>

        {loadingMetricas ? (
          <div className="flex items-end justify-around gap-3 h-72 px-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 max-w-20 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-slate-200 rounded-xl animate-pulse"
                  style={{ height: `${Math.random() * 120 + 80}px` }}
                />
                <div className="w-12 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : metricasData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-slate-400">
            <BarChart3 size={48} className="mb-3 opacity-50" />
            <p>No hay datos para mostrar</p>
            <p className="text-sm">Ajusta los filtros para ver resultados</p>
          </div>
        ) : (
          <div className="relative pt-4">
            {/* Líneas guía horizontales */}
            <div className="absolute inset-x-0 top-4 bottom-16 flex flex-col justify-between pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-slate-100 w-full" />
              ))}
            </div>
            
            {/* Contenedor de barras */}
            <div className="relative flex items-end justify-around gap-2 sm:gap-4 h-72 px-2 sm:px-4">
              {metricasData.map((comercial) => {
                const maxCantidad = Math.max(...metricasData.map(d => d.cantidad), 1);
                const porcentaje = (comercial.cantidad / maxCantidad) * 100;
                const colorMap = {
                  'Top': { bg: 'bg-gradient-to-t from-[#16A34A] to-[#22C55E]', text: '#16A34A' },
                  'High': { bg: 'bg-gradient-to-t from-[#16A34A] to-[#22C55E]', text: '#16A34A' },
                  'Successful': { bg: 'bg-gradient-to-t from-[#EA580C] to-[#F97316]', text: '#EA580C' },
                  'Mid': { bg: 'bg-gradient-to-t from-[#EA580C] to-[#F97316]', text: '#EA580C' },
                  'Low': { bg: 'bg-gradient-to-t from-[#7C3AED] to-[#8B5CF6]', text: '#7C3AED' }
                };
                const colors = colorMap[comercial.performance] || colorMap['Successful'];
                
                return (
                  <div 
                    key={comercial.email} 
                    className="flex-1 max-w-24 flex flex-col items-center group"
                  >
                    {/* Cantidad */}
                    <span 
                      className="text-sm font-bold mb-2 transition-transform group-hover:scale-110"
                      style={{ color: colors.text }}
                    >
                      {comercial.cantidad}
                    </span>
                    
                    {/* Barra */}
                    <div 
                      className={`w-full rounded-xl ${colors.bg} shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105 cursor-pointer`}
                      style={{ 
                        height: `${Math.max(porcentaje * 2, 20)}px`,
                        minHeight: '20px'
                      }}
                      title={`${comercial.nombre}: ${comercial.cantidad} leads (${comercial.performance})`}
                    />
                    
                    {/* Nombre */}
                    <div className="mt-3 text-center w-full">
                      <p className="text-xs font-medium text-slate-700 truncate" title={comercial.nombre}>
                        {comercial.nombre.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate hidden sm:block" title={comercial.nombre}>
                        {comercial.nombre.split(' ').slice(1).join(' ') || ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
