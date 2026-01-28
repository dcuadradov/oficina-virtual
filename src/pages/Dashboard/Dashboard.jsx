import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import DashboardStats from './components/DashboardStats';
import DashboardFilters from './components/DashboardFilters';
import LeadsTable from './components/LeadsTable';
import LeadSidebar from './components/LeadSidebar';
import PitchCalendar from './components/PitchCalendar';
import { LogOut, RefreshCcw, Home, Table, CalendarDays } from 'lucide-react';

// Configuración de paginación
const LEADS_PER_PAGE = 50;

export default function Dashboard() {
  const navigate = useNavigate();
  const { cardId: urlCardId } = useParams();
  
  // Estados para KPIs (datos globales)
  const [statsData, setStatsData] = useState({
    total: 0,
    porEstado: {},
    porEtapa: {}
  });
  
  // Estados para la tabla (datos paginados)
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('sin_gestionar');
  const [activeEtapa, setActiveEtapa] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('info');
  
  // Estados para filtros avanzados
  const [comerciales, setComerciales] = useState([]);
  const [selectedComercial, setSelectedComercial] = useState(null);
  const [selectedMes, setSelectedMes] = useState(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [selectedDia, setSelectedDia] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para etapas del funnel (cargadas desde config_fases)
  const [etapasFunnel, setEtapasFunnel] = useState({ etapas: [], grupos: [] });
  
  // Estado para tabs (Tabla / Mis Pitch)
  const [activeView, setActiveView] = useState('tabla');
  
  const userName = localStorage.getItem('user_name') || 'Comercial';
  const userEmail = localStorage.getItem('user_email');
  const puedeVerTodos = localStorage.getItem('user_puede_ver_todos') === 'true';

  // Función para abrir el sidebar con un lead (tab opcional)
  const handleOpenSidebar = async (lead, tab = 'info') => {
    setSelectedLead(lead);
    setInitialTab(tab);
    setSidebarOpen(true);
    
    // Marcar como revisado si no lo estaba
    if (lead.revisado === false) {
      try {
        await supabase
          .from('leads')
          .update({ revisado: true })
          .eq('card_id', lead.card_id);
        
        // Actualizar el lead en el estado local
        setLeads(prevLeads => 
          prevLeads.map(l => 
            l.card_id === lead.card_id ? { ...l, revisado: true } : l
          )
        );
        setSelectedLead({ ...lead, revisado: true });
      } catch (error) {
        console.error('Error al marcar como revisado:', error);
      }
    }
  };

  // Función para marcar un lead como no revisado (sin actualizar fecha_asignacion)
  const handleMarcarNoRevisado = async (lead) => {
    try {
      await supabase
        .from('leads')
        .update({ revisado: false })
        .eq('card_id', lead.card_id);
      
      // Actualizar el lead en el estado local (mantiene fecha_asignacion original)
      const leadActualizado = { ...lead, revisado: false };
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.card_id === lead.card_id ? leadActualizado : l
        )
      );
      setSelectedLead(leadActualizado);
    } catch (error) {
      console.error('Error al marcar como no revisado:', error);
    }
  };

  // Función para cerrar el sidebar
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  };

  // Email activo para las consultas (el comercial seleccionado o el usuario actual)
  const emailActivo = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;

  // Función para cargar lista de comerciales (solo si puede ver todos)
  const fetchComerciales = useCallback(async () => {
    if (!puedeVerTodos) return;
    
    try {
      // Obtener usuarios del módulo comercial
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          email,
          nombre,
          usuarios_modulos!inner (
            modulo_id
          )
        `)
        .eq('activo', true)
        .eq('usuarios_modulos.modulo_id', 'comercial');

      if (error) throw error;
      setComerciales(data || []);
    } catch (error) {
      console.error('Error cargando comerciales:', error.message);
    }
  }, [puedeVerTodos]);

  // Función para cargar etapas del funnel desde config_fases
  const fetchEtapasFunnel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_fases')
        .select('etapa_funnel_agrupada, orden_funnel, grupo_funnel, nombre_grupo_funnel, orden_grupo_funnel')
        .not('etapa_funnel_agrupada', 'is', null)
        .neq('etapa_funnel_agrupada', 'No mostrar');

      if (error) throw error;

      // Agrupar por etapa_funnel_agrupada y tomar los valores de configuración
      const etapasMap = new Map();
      const gruposMap = new Map();
      
      data.forEach(d => {
        // Etapas
        if (!etapasMap.has(d.etapa_funnel_agrupada)) {
          etapasMap.set(d.etapa_funnel_agrupada, {
            orden: d.orden_funnel || 99,
            grupo: d.grupo_funnel || 'gestion'
          });
        }
        
        // Grupos (tabs)
        const grupoKey = d.grupo_funnel || 'gestion';
        if (!gruposMap.has(grupoKey)) {
          gruposMap.set(grupoKey, {
            id: grupoKey,
            nombre: d.nombre_grupo_funnel || grupoKey,
            orden: d.orden_grupo_funnel || 99
          });
        }
      });

      // Convertir etapas a array y ordenar
      const etapasFormateadas = Array.from(etapasMap.entries())
        .map(([etapa, config]) => ({
          id: etapa,
          label: etapa,
          shortLabel: getShortLabel(etapa),
          orden: config.orden,
          grupo: config.grupo
        }))
        .sort((a, b) => a.orden - b.orden);

      // Convertir grupos a array y ordenar
      const gruposFormateados = Array.from(gruposMap.values())
        .sort((a, b) => a.orden - b.orden);

      setEtapasFunnel({ etapas: etapasFormateadas, grupos: gruposFormateados });
    } catch (error) {
      console.error('Error cargando etapas del funnel:', error.message);
    }
  }, []);

  // Helper para obtener etiquetas cortas
  const getShortLabel = (etapa) => {
    const shortLabels = {
      'Validación de contacto': 'Validación',
      'Perfilamiento': 'Perfil',
      'Pitch agendado': 'Agendado',
      'Pitch': 'Pitch',
      'Posible matrícula': 'Posible',
      'Pendiente de pago': 'Pago',
      '¡Nueva matrícula!': '¡Matrícula!',
      'Matrícula caída': 'Caída'
    };
    return shortLabels[etapa] || etapa.substring(0, 10);
  };

  // Parsear filtros de fecha
  const parseDateFilters = useCallback(() => {
    let fechaInicio = null;
    let fechaFin = null;

    if (selectedDia) {
      // Día tiene formato: "2025-01-28" - filtrar desde inicio hasta fin del día
      fechaInicio = `${selectedDia}T00:00:00`;
      fechaFin = `${selectedDia}T23:59:59`;
    } else if (selectedPeriodo) {
      // Periodo tiene formato: "2025-01-07_2025-01-14"
      const [inicio, fin] = selectedPeriodo.split('_');
      fechaInicio = inicio;
      fechaFin = fin;
    } else if (selectedMes) {
      // Mes tiene formato: "2025-01"
      const [año, mes] = selectedMes.split('-');
      fechaInicio = `${año}-${mes}-01`;
      // Último día del mes
      const ultimoDia = new Date(parseInt(año), parseInt(mes), 0).getDate();
      fechaFin = `${año}-${mes}-${ultimoDia}`;
    }

    return { fechaInicio, fechaFin };
  }, [selectedDia, selectedMes, selectedPeriodo]);

  // Función para obtener estadísticas globales (KPIs)
  const fetchStats = useCallback(async () => {
    const targetEmail = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;
    if (!targetEmail && !puedeVerTodos) return;

    try {
      const { fechaInicio, fechaFin } = parseDateFilters();

      // Query única para obtener estado_gestion y etapa_funnel
      let statsQuery = supabase
        .from('leads')
        .select('estado_gestion, etapa_funnel, fecha_gestion')
        .neq('etapa_funnel', 'No mostrar');

      // Aplicar filtro de comercial
      if (puedeVerTodos && selectedComercial) {
        statsQuery = statsQuery.eq('comercial_email', selectedComercial);
      } else if (!puedeVerTodos) {
        statsQuery = statsQuery.eq('comercial_email', userEmail);
      }

      // Aplicar filtros de fecha
      if (fechaInicio && fechaFin) {
        statsQuery = statsQuery.gte('fecha_gestion', fechaInicio).lte('fecha_gestion', fechaFin);
      }

      const { data: statsData, error: statsError } = await statsQuery;

      if (statsError) throw statsError;

      const allLeads = statsData || [];

      // Procesar conteos por estado (siempre sobre todos los leads)
      const porEstado = {};
      allLeads.forEach(lead => {
        const estado = lead.estado_gestion || 'sin_gestionar';
        porEstado[estado] = (porEstado[estado] || 0) + 1;
      });

      // Procesar conteos por etapa (aplicando filtro de gestión activo)
      const porEtapa = {};
      allLeads.forEach(lead => {
        // Si hay un filtro de gestión activo, solo contar leads que coincidan
        if (activeFilter && activeFilter !== 'todos') {
          if (lead.estado_gestion !== activeFilter) return;
        }
        const etapa = lead.etapa_funnel || 'Sin etapa';
        porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
      });

      setStatsData({
        total: allLeads.length,
        porEstado,
        porEtapa
      });

    } catch (error) {
      console.error('Error cargando estadísticas:', error.message);
    }
  }, [userEmail, puedeVerTodos, selectedComercial, activeFilter, parseDateFilters]);

  // Función para obtener leads paginados
  const fetchLeads = useCallback(async (silent = false, page = 0) => {
    const targetEmail = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;
    if (!targetEmail && !puedeVerTodos) {
      console.error("No hay email de usuario");
      return;
    }

    try {
      if (!silent) setLoading(true);
      if (silent) setIsRefreshing(true);

      const { fechaInicio, fechaFin } = parseDateFilters();

      // Construir query base
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .neq('etapa_funnel', 'No mostrar');

      // Aplicar filtro de comercial
      if (puedeVerTodos && selectedComercial) {
        query = query.eq('comercial_email', selectedComercial);
      } else if (!puedeVerTodos) {
        query = query.eq('comercial_email', userEmail);
      }
      // Si puede ver todos y no hay comercial seleccionado, traer todos los leads

      // Aplicar filtros de fecha
      if (fechaInicio && fechaFin) {
        query = query.gte('fecha_gestion', fechaInicio).lte('fecha_gestion', fechaFin);
      }

      // Aplicar filtro por estado si está activo
      if (activeFilter !== 'todos') {
        query = query.eq('estado_gestion', activeFilter);
      }

      // Aplicar filtro por etapa si está activo
      if (activeEtapa) {
        query = query.eq('etapa_funnel', activeEtapa);
      }

      // Aplicar búsqueda de texto (búsqueda en múltiples campos)
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(
          `nombre.ilike.${searchTerm},email.ilike.${searchTerm},telefono.ilike.${searchTerm},pais.ilike.${searchTerm},fase_nombre_pipefy.ilike.${searchTerm},card_id.ilike.${searchTerm}`
        );
      }

      // Ordenar y paginar
      const from = page * LEADS_PER_PAGE;
      const to = from + LEADS_PER_PAGE - 1;
      
      query = query
        .order('fecha_asignacion', { ascending: false, nullsFirst: true })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setLeads(data || []);
      setTotalLeads(count || 0);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error cargando leads:', error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userEmail, puedeVerTodos, selectedComercial, activeFilter, activeEtapa, searchQuery, parseDateFilters]);

  // Función para verificar y actualizar recordatorios vencidos
  const verificarRecordatoriosVencidos = useCallback(async () => {
    try {
      const ahora = new Date().toISOString();
      
      // 1. Buscar recordatorios programados que ya vencieron
      const { data: vencidos, error: errorBuscar } = await supabase
        .from('recordatorios')
        .select('id, lead_id')
        .eq('estado', 'Programado')
        .lt('fecha_programada', ahora);
      
      if (errorBuscar) throw errorBuscar;
      
      if (vencidos && vencidos.length > 0) {
        console.log(`⏰ Encontrados ${vencidos.length} recordatorios vencidos`);
        
        // 2. Actualizar estado de recordatorios a "Vencido"
        const idsVencidos = vencidos.map(r => r.id);
        const { error: errorActualizarRec } = await supabase
          .from('recordatorios')
          .update({ estado: 'Vencido' })
          .in('id', idsVencidos);
        
        if (errorActualizarRec) throw errorActualizarRec;
        
        // 3. Obtener lead_ids únicos afectados
        const leadIdsUnicos = [...new Set(vencidos.map(r => r.lead_id))];
        
        // 4. Marcar todos los leads afectados como NO revisados y actualizar fecha_asignacion
        await supabase
          .from('leads')
          .update({ 
            revisado: false,
            fecha_asignacion: new Date().toISOString()
          })
          .in('card_id', leadIdsUnicos);
        
        // 5. Para cada lead, verificar si tiene otros recordatorios activos
        for (const leadId of leadIdsUnicos) {
          const { count } = await supabase
            .from('recordatorios')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', leadId)
            .eq('estado', 'Programado');
          
          // Si no tiene más recordatorios programados, desactivar
          if (count === 0) {
            await supabase
              .from('leads')
              .update({ recordatorio_activo: false })
              .eq('card_id', leadId);
          }
        }
        
        console.log('✅ Recordatorios vencidos actualizados y leads marcados como no revisados');
      }
    } catch (error) {
      console.error('Error verificando recordatorios:', error.message);
    }
  }, []);

  // Efecto para carga inicial
  useEffect(() => {
    if (userEmail) {
      fetchComerciales();
      fetchEtapasFunnel();
      fetchStats();
      fetchLeads(false, 0);
      verificarRecordatoriosVencidos(); // Verificar al cargar
    }
  }, [userEmail]);

  // Efecto para abrir sidebar cuando hay cardId en la URL
  useEffect(() => {
    const abrirLeadDesdeURL = async () => {
      if (!urlCardId || !userEmail) return;
      
      try {
        // Buscar el lead por card_id
        const { data: lead, error } = await supabase
          .from('leads')
          .select('*')
          .eq('card_id', urlCardId)
          .single();

        if (error) {
          console.error('Lead no encontrado:', urlCardId);
          return;
        }

        if (lead) {
          // Abrir el sidebar con el lead
          handleOpenSidebar(lead);
        }
      } catch (error) {
        console.error('Error cargando lead desde URL:', error);
      }
    };

    // Esperar a que se carguen los datos iniciales
    if (!loading && userEmail) {
      abrirLeadDesdeURL();
    }
  }, [urlCardId, userEmail, loading]);

  // Efecto para recargar cuando cambian los filtros
  useEffect(() => {
    if (!loading && userEmail) {
      fetchStats();
      fetchLeads(true, 0); // Volver a página 0 cuando cambian filtros
    }
  }, [activeFilter, activeEtapa, selectedComercial, selectedMes, selectedPeriodo, selectedDia, searchQuery]);

  // Efecto para recarga automática cada 3 minutos
  useEffect(() => {
    const intervalId = setInterval(async () => {
      console.log("🔄 Actualizando datos en segundo plano...");
      
      // Verificar recordatorios vencidos
      try {
        await verificarRecordatoriosVencidos();
      } catch (e) { console.error('Error en verificación de recordatorios:', e); }
      
      // Actualizar estadísticas
      try {
        await fetchStats();
      } catch (e) { console.error('Error en fetchStats:', e); }
      
      // Actualizar leads
      try {
        await fetchLeads(true, currentPage);
      } catch (e) { console.error('Error en fetchLeads:', e); }
      
    }, 180000); // 3 minutos

    return () => clearInterval(intervalId);
  }, [currentPage, fetchStats, fetchLeads, verificarRecordatoriosVencidos]);

  // Manejadores de paginación
  const handleNextPage = () => {
    const maxPage = Math.ceil(totalLeads / LEADS_PER_PAGE) - 1;
    if (currentPage < maxPage) {
      fetchLeads(true, currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      fetchLeads(true, currentPage - 1);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(0);
  };

  const handleEtapaChange = (etapa) => {
    setActiveEtapa(etapa);
    setCurrentPage(0);
  };

  const handleComercialChange = (comercial) => {
    setSelectedComercial(comercial);
    setCurrentPage(0);
  };

  const handleMesChange = (mes) => {
    setSelectedMes(mes);
    setSelectedPeriodo(null); // Limpiar periodo cuando se selecciona mes
    setSelectedDia(null); // Limpiar día cuando se selecciona mes
    setCurrentPage(0);
  };

  const handlePeriodoChange = (periodo) => {
    setSelectedPeriodo(periodo);
    setSelectedMes(null); // Limpiar mes cuando se selecciona periodo
    setSelectedDia(null); // Limpiar día cuando se selecciona periodo
    setCurrentPage(0);
  };

  const handleDiaChange = (dia) => {
    setSelectedDia(dia);
    setSelectedMes(null); // Limpiar mes cuando se selecciona día
    setSelectedPeriodo(null); // Limpiar periodo cuando se selecciona día
    setCurrentPage(0);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(0);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Calcular info de paginación
  const totalPages = Math.ceil(totalLeads / LEADS_PER_PAGE);
  const showingFrom = currentPage * LEADS_PER_PAGE + 1;
  const showingTo = Math.min((currentPage + 1) * LEADS_PER_PAGE, totalLeads);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Patrón de fondo decorativo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-20" />
      </div>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] flex items-center justify-center shadow-lg shadow-[#02214A]/20">
              <span className="text-white font-bold text-lg font-bookman">OV</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                Oficina Virtual
                {isRefreshing && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                    <RefreshCcw size={10} className="animate-spin" /> Sincronizando
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">Hola, <span className="font-medium text-slate-700">{userName}</span> 👋</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-slate-500 hover:text-[#1717AF] transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100"
            >
              <Home size={18} />
              <span className="hidden md:inline">Inicio</span>
            </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
          >
            <LogOut size={18} />
              <span className="hidden md:inline">Salir</span>
          </button>
          </div>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse shadow-xl shadow-[#02214A]/20" />
              <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-[#1717AF]/20 border-t-[#1717AF] animate-spin" />
            </div>
            <p className="text-[#02214A] mt-6 font-medium font-bookman">Cargando tu oficina...</p>
            <p className="text-slate-400 text-sm mt-1">Preparando todo para ti</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. TABS PRINCIPALES */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl w-fit">
              <button
                onClick={() => setActiveView('tabla')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeView === 'tabla'
                    ? 'bg-white text-[#1717AF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Table size={18} />
                Gestión
              </button>
              <button
                onClick={() => setActiveView('pitch')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeView === 'pitch'
                    ? 'bg-white text-[#1717AF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarDays size={18} />
                Mis Pitch
              </button>
            </div>

            {/* CONTENIDO SEGÚN TAB ACTIVO */}
            {activeView === 'tabla' ? (
              <>
                {/* Filtros avanzados - ARRIBA de los KPIs */}
                <DashboardFilters
                  comerciales={comerciales}
                  selectedComercial={selectedComercial}
                  onComercialChange={handleComercialChange}
                  selectedMes={selectedMes}
                  onMesChange={handleMesChange}
                  selectedPeriodo={selectedPeriodo}
                  onPeriodoChange={handlePeriodoChange}
                  selectedDia={selectedDia}
                  onDiaChange={handleDiaChange}
                  showComercialFilter={puedeVerTodos}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                />

                {/* KPIs - Debajo de los filtros */}
            <DashboardStats 
                  statsData={statsData}
              activeFilter={activeFilter}
                  onFilterChange={handleFilterChange}
            />

                {/* Indicador de filtro activo */}
                {(activeFilter !== 'todos' || activeEtapa || selectedComercial || selectedMes || selectedPeriodo || selectedDia || searchQuery) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1717AF]/5 border border-[#1717AF]/20 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-[#1717AF] animate-pulse" />
                <span className="text-sm text-slate-600">
                      Mostrando <strong className="text-[#02214A]">{totalLeads}</strong> leads filtrados
                      {searchQuery && <span className="text-slate-400"> • Búsqueda: "{searchQuery}"</span>}
                      {selectedComercial && <span className="text-slate-400"> • {comerciales.find(c => c.email === selectedComercial)?.nombre || selectedComercial}</span>}
                      {activeEtapa && <span className="text-slate-400"> • Etapa: {activeEtapa}</span>}
                      {selectedMes && <span className="text-slate-400"> • Mes seleccionado</span>}
                      {selectedPeriodo && <span className="text-slate-400"> • Periodo seleccionado</span>}
                      {selectedDia && <span className="text-slate-400"> • Día seleccionado</span>}
                </span>
                <button
                      onClick={() => {
                        setActiveFilter('todos');
                        setActiveEtapa(null);
                        setSelectedComercial(null);
                        setSelectedMes(null);
                        setSelectedPeriodo(null);
                        setSelectedDia(null);
                        setSearchQuery('');
                      }}
                  className="ml-auto text-sm text-[#1717AF] hover:text-[#02214A] font-medium hover:underline transition-all"
                >
                      Limpiar filtros
                </button>
              </div>
            )}

                {/* Tabla de leads */}
            <LeadsTable 
                  leads={leads}
                  statsData={statsData}
                  etapasFunnel={etapasFunnel}
                  onOpenModal={handleOpenSidebar}
                  onOpenReminder={(lead) => handleOpenSidebar(lead, 'recordatorio')}
                  onMarcarNoRevisado={handleMarcarNoRevisado}
                  activeEtapa={activeEtapa}
                  onEtapaChange={handleEtapaChange}
                  activeFilter={activeFilter}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalLeads={totalLeads}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  isEmbedded={false}
                />
              </>
            ) : (
              <>
                {/* Filtro de comercial para Mis Pitch */}
                {puedeVerTodos && (
                  <DashboardFilters
                    comerciales={comerciales}
                    selectedComercial={selectedComercial}
                    onComercialChange={handleComercialChange}
                    showComercialFilter={true}
                    showOnlyComercial={true}
                  />
                )}

                {/* Calendario de Pitches */}
                <PitchCalendar 
                  selectedComercial={selectedComercial}
                  userEmail={userEmail}
                  onOpenLead={handleOpenSidebar}
                  puedeVerTodos={puedeVerTodos}
            />
              </>
            )}
          </div>
        )}
      </main>

      {/* Sidebar de detalle del lead */}
      <LeadSidebar 
        lead={selectedLead}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        initialTab={initialTab}
        etapasFunnel={etapasFunnel}
        onMarcarNoRevisado={handleMarcarNoRevisado}
        onRefreshData={() => {
          fetchStats();
          fetchLeads(true, currentPage);
        }}
        comerciales={comerciales}
        puedeVerTodos={puedeVerTodos}
      />
    </div>
  );
}
