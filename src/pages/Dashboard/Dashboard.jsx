import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import DashboardStats from './components/DashboardStats';
import DashboardFilters from './components/DashboardFilters';
import LeadsTable from './components/LeadsTable';
import LeadSidebar from './components/LeadSidebar';
import PitchCalendar from './components/PitchCalendar';
import PitchKpis, { PITCH_TAG_PRESETS } from './components/PitchKpis';
import PitchDimFilters, { emptyPitchDims, rowMatchesDims } from './components/PitchDimFilters';
import PitchAnalisis from './components/PitchAnalisis';
import { usePitchAnalisisUniverse } from './components/usePitchAnalisisUniverse';
import { resolvePitchRange } from '../../utils/pitchRange';
import RecordatoriosCalendar from './components/RecordatoriosCalendar';
import NotificacionesBell from './components/NotificacionesBell';
import CrearLeadModal from './components/CrearLeadModal';
import MetricasAsignaciones from './components/MetricasAsignaciones';
import MetricasPerformance from './components/MetricasPerformance';
import Informe from './components/Informe/Informe';
import { LogOut, RefreshCcw, Home, Table, CalendarDays, UserPlus, BarChart3, FileBarChart2 } from 'lucide-react';

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
  const [ultimosSeguimientos, setUltimosSeguimientos] = useState({});
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [activeEtapas, setActiveEtapas] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('info');
  
  // Estados para filtros avanzados
  const [comerciales, setComerciales] = useState([]);
  const [selectedComercial, setSelectedComercial] = useState(null);
  const [selectedMes, setSelectedMes] = useState(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [selectedDia, setSelectedDia] = useState(null);
  const [dateFilterField, setDateFilterField] = useState('created_at');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [categoriasSeguimiento, setCategoriasSeguimiento] = useState([]);
  const [selectedTag, setSelectedTag] = useState([]);
  const [tagsDisponibles, setTagsDisponibles] = useState([]);
  const [selectedFuente, setSelectedFuente] = useState([]);
  const [fuentesDisponibles, setFuentesDisponibles] = useState([]);
  const [selectedReferido, setSelectedReferido] = useState(null);
  const [referidosDisponibles, setReferidosDisponibles] = useState([]);
  const [configTags, setConfigTags] = useState({}); // { nombreTag: { color_tag, color_letra_tag } }
  const [coloresFases, setColoresFases] = useState({}); // { fase_id_pipefy: { color, color_letra } }
  
  // Estado para etapas del funnel (cargadas desde config_fases)
  const [etapasFunnel, setEtapasFunnel] = useState({ etapas: [], grupos: [] });
  
  // Estado para tabs (Tabla / Mis Pitch / Métricas)
  const [activeView, setActiveView] = useState('tabla');
  
  // Estado para sub-tab de Métricas
  const [metricasSubTab, setMetricasSubTab] = useState('asignaciones');
  
  // Estado para modal de crear lead
  const [crearLeadModalOpen, setCrearLeadModalOpen] = useState(false);
  
  // Estados para KPIs adicionales
  const [ventanasAbiertas, setVentanasAbiertas] = useState(0);
  const [nuevosLeads, setNuevosLeads] = useState(0);
  const [nuevosLeadsCardIds, setNuevosLeadsCardIds] = useState([]); // card_ids para filtrar
  
  // Estado para filtro de WhatsApp (compartido entre KPIs y tabla)
  const [filtroWhatsApp, setFiltroWhatsApp] = useState('todos'); // 'todos' | 'abierta' | 'cerrada'
  
  // Estado para filtro de Nuevos Leads
  const [filtroNuevosLeads, setFiltroNuevosLeads] = useState(false);
  
  // Estado para filtro de leads HOT (compartido con tabla)
  const [filtroHot, setFiltroHot] = useState(false);
  
  // Estado para filtro de recordatorios automáticos (Emdi)
  const [filtroEmdi, setFiltroEmdi] = useState(null); // null = todos, 'activo' = con recordatorio, 'inactivo' = sin recordatorio
  const [filtroGestionWA, setFiltroGestionWA] = useState(null); // null = todos, 'respond' = false, 'personal' = true
  const [sortConfig, setSortConfig] = useState({ field: 'updated_at', ascending: false });
  const [filtroSinSeguimiento, setFiltroSinSeguimiento] = useState(false);
  const [monthConfigs, setMonthConfigs] = useState({});

  // Tags para Mis Pitch. Inicia vacío = sin filtro (equivalente a "Todos").
  // Si el usuario marca tags, KPIs y calendario se restringen a esa lista.
  const [pitchKpiTags, setPitchKpiTags] = useState([]);

  // Sub-tab de Mis Pitch: 'agenda' (default, KPIs + calendario) | 'analisis'.
  const [pitchSubTab, setPitchSubTab] = useState('agenda');
  // Filtros de análisis (profesión/género/edad/ciudad/país). Vacío = sin filtro.
  // Se muestran en ambos sub-tabs y filtran KPIs + calendario.
  const [pitchDims, setPitchDims] = useState(emptyPitchDims());

  const userName = localStorage.getItem('user_name') || 'Comercial';
  const userEmail = localStorage.getItem('user_email');
  const puedeVerTodos = localStorage.getItem('user_puede_ver_todos') === 'true';
  // Rol setter: la visibilidad de fases NO usa la regla de etapa_funnel,
  // sino la columna config_fases.setter (true = visible). Además, solo ve "Gestión".
  const esSetter = (localStorage.getItem('user_rol') || '').toLowerCase() === 'setter';
  // Fases (fase_id_pipefy) permitidas para el setter (config_fases.setter = true).
  // null = aún no cargado (no consultar leads todavía); [] = cargado sin fases.
  const [fasesSetter, setFasesSetter] = useState(null);

  // Regla de visibilidad de fases aplicada a las queries de `leads`:
  //   - Setter → solo las fases marcadas en config_fases.setter (por fase_id_pipefy).
  //   - Resto  → regla histórica por etapa_funnel (≠ 'No mostrar').
  // Si el filtro EMDI también restringe por fase_id_pipefy, PostgREST combina
  // ambos `.in()` con AND → intersección natural, así que no hace falta más.
  const aplicarVisibilidadFases = useCallback(
    (q) =>
      esSetter
        ? q.in('fase_id_pipefy', fasesSetter || [])
        : q.or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null'),
    [esSetter, fasesSetter]
  );

  // ===== Análisis de Mis Pitch =====
  // Sub-tab activo dentro de "Análisis" (No fueron matrícula / Reprobados / Matrícula).
  const [pitchAnalisisTab, setPitchAnalisisTab] = useState('no_matricula');
  const pitchRange = useMemo(
    () => resolvePitchRange({ selectedDia, selectedPeriodo, selectedMes, monthConfigs }),
    [selectedDia, selectedPeriodo, selectedMes, monthConfigs]
  );
  const analisisEnabled = activeView === 'pitch' && pitchSubTab === 'analisis';
  // Universo del sub-tab (pitches_resultados + leads), acotado SOLO por periodo.
  const { rows: analisisPool, loading: analisisLoading } = usePitchAnalisisUniverse({
    enabled: analisisEnabled,
    subTab: pitchAnalisisTab,
    rangeStart: pitchRange.rangeStart,
    rangeEnd: pitchRange.rangeEnd,
  });
  // Filtros facetados sobre el universo del sub-tab: cada filtro ofrece solo
  // opciones presentes, considerando las selecciones aplicadas de los OTROS
  // filtros (comercial, tags, dimensiones). Así los filtros y las gráficas
  // comparten exactamente el mismo universo (no hay "5 vs 20").
  const matchComercialA = (r) => !selectedComercial || r.comercial_email === selectedComercial;
  const matchTagsA = (r) => pitchKpiTags.length === 0 || pitchKpiTags.includes(r.label);
  const matchDimsA = (r) => rowMatchesDims(r, pitchDims);

  const comercialesAnalisis = useMemo(() => {
    if (!analisisEnabled) return comerciales;
    const present = new Set(analisisPool.filter(r => matchTagsA(r) && matchDimsA(r)).map(r => r.comercial_email));
    return comerciales.filter(c => present.has(c.email));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisisEnabled, analisisPool, comerciales, pitchKpiTags.join('|'), JSON.stringify(pitchDims)]);

  const tagsAnalisis = useMemo(() => {
    if (!analisisEnabled) return tagsDisponibles;
    const present = new Set(analisisPool.filter(r => matchComercialA(r) && matchDimsA(r)).map(r => r.label).filter(Boolean));
    return tagsDisponibles.filter(t => present.has(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisisEnabled, analisisPool, tagsDisponibles, selectedComercial, JSON.stringify(pitchDims)]);

  const analisisDimRows = useMemo(() => {
    if (!analisisEnabled) return null;
    return analisisPool.filter(r => matchComercialA(r) && matchTagsA(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisisEnabled, analisisPool, selectedComercial, pitchKpiTags.join('|')]);

  const analisisChartRows = useMemo(() => {
    if (!analisisEnabled) return [];
    return analisisPool.filter(r => matchComercialA(r) && matchTagsA(r) && matchDimsA(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisisEnabled, analisisPool, selectedComercial, pitchKpiTags.join('|'), JSON.stringify(pitchDims)]);

  // Función para abrir el sidebar en el tab de seguimiento
  const handleOpenSeguimiento = (lead) => {
    handleOpenSidebar(lead, 'seguimiento');
  };

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

  // Marcar múltiples leads como leídos (revisado: true)
  const handleMarcarLeidoBulk = async (cardIds) => {
    setLeads(prevLeads =>
      prevLeads.map(l => cardIds.includes(l.card_id) ? { ...l, revisado: true } : l)
    );
    try {
      await supabase
        .from('leads')
        .update({ revisado: true })
        .in('card_id', cardIds);
    } catch (error) {
      console.error('Error al marcar como leídos:', error);
    }
  };

  // Marcar múltiples leads como no leídos (revisado: false)
  const handleMarcarNoLeidoBulk = async (cardIds) => {
    setLeads(prevLeads =>
      prevLeads.map(l => cardIds.includes(l.card_id) ? { ...l, revisado: false } : l)
    );
    try {
      await supabase
        .from('leads')
        .update({ revisado: false })
        .in('card_id', cardIds);
    } catch (error) {
      console.error('Error al marcar como no leídos:', error);
    }
  };

  // Función para toggle HOT desde la tabla
  const handleToggleHot = async (lead) => {
    const nuevoEstado = !lead.is_hot;
    
    // Actualización optimista
    setLeads(prevLeads => 
      prevLeads.map(l => 
        l.card_id === lead.card_id ? { ...l, is_hot: nuevoEstado } : l
      )
    );
    
    try {
      await supabase
        .from('leads')
        .update({ is_hot: nuevoEstado })
        .eq('card_id', lead.card_id);
    } catch (error) {
      console.error('Error al cambiar estado HOT:', error);
      // Revertir si hay error
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.card_id === lead.card_id ? { ...l, is_hot: lead.is_hot } : l
        )
      );
    }
  };

  // Función para toggle gestión WhatsApp personal
  const handleToggleGestionWhatsApp = async (lead) => {
    const nuevoEstado = !lead.gestion_whatsapp_personal;
    
    // Actualización optimista
    const updateData = { gestion_whatsapp_personal: nuevoEstado };
    if (nuevoEstado) {
      updateData.fecha_recordatorio_automatico = null;
    }
    
    setLeads(prevLeads => 
      prevLeads.map(l => 
        l.card_id === lead.card_id ? { ...l, ...updateData } : l
      )
    );
    
    try {
      await supabase
        .from('leads')
        .update(updateData)
        .eq('card_id', lead.card_id);

    } catch (error) {
      console.error('Error al cambiar gestión WhatsApp:', error);
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.card_id === lead.card_id ? { ...l, gestion_whatsapp_personal: lead.gestion_whatsapp_personal, fecha_recordatorio_automatico: lead.fecha_recordatorio_automatico } : l
        )
      );
    }
  };

  // Función para cerrar el sidebar
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  };

  // Función para abrir un lead desde una notificación
  const handleOpenLeadFromNotification = async (cardId) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('card_id', cardId)
        .single();

      if (error) throw error;
      if (data) {
        handleOpenSidebar(data, 'info');
      }
    } catch (error) {
      console.error('Error abriendo lead desde notificación:', error);
    }
  };

  // Email activo para las consultas (el comercial seleccionado o el usuario actual)
  const emailActivo = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;

  // Función para cargar categorías de seguimiento
  const fetchCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_categorias')
        .select('*')
        .eq('modulo', 'comercial')
        .eq('estado', true)
        .order('posicion', { ascending: true });

      if (error) throw error;
      setCategoriasSeguimiento(data || []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }, []);

  // Función para cargar tags únicos de los leads
  const fetchTags = useCallback(async () => {
    try {
      // Obtener tags únicos de leads
      const { data, error } = await supabase
        .from('leads')
        .select('label')
        .not('label', 'is', null)
        .neq('label', '');

      if (error) throw error;
      
      // Obtener valores únicos
      const uniqueTags = [...new Set(data.map(d => d.label).filter(Boolean))].sort();
      setTagsDisponibles(uniqueTags);
      
      // Cargar configuración de colores de tags
      const { data: configData, error: configError } = await supabase
        .from('config_tags')
        .select('nombre, color_tag, color_letra_tag')
        .eq('modulo', 'comercial');
      
      if (!configError && configData) {
        // Crear mapa de nombre -> colores
        const configMap = {};
        configData.forEach(tag => {
          configMap[tag.nombre] = {
            color_tag: tag.color_tag,
            color_letra_tag: tag.color_letra_tag
          };
        });
        setConfigTags(configMap);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
    }
  }, []);

  // Función para cargar fuentes únicas de los leads
  const fetchFuentes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('fuente_dato')
        .not('fuente_dato', 'is', null)
        .neq('fuente_dato', '');

      if (error) throw error;
      
      // Obtener valores únicos y ordenar
      const uniqueFuentes = [...new Set(data.map(d => d.fuente_dato).filter(Boolean))].sort();
      setFuentesDisponibles(uniqueFuentes);
    } catch (error) {
      console.error('Error cargando fuentes:', error);
    }
  }, []);

  // Función para cargar referidos únicos de los leads
  const fetchReferidos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('referido_por')
        .not('referido_por', 'is', null)
        .neq('referido_por', '');

      if (error) throw error;
      
      // Obtener valores únicos y ordenar
      const uniqueReferidos = [...new Set(data.map(d => d.referido_por).filter(Boolean))].sort();
      setReferidosDisponibles(uniqueReferidos);
    } catch (error) {
      console.error('Error cargando referidos:', error);
    }
  }, []);

  // Función para cargar colores de las fases desde config_fases
  const fetchColoresFases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_fases')
        .select('fase_id_pipefy, color, color_letra')
        .not('color', 'is', null);

      if (error) throw error;
      
      // Crear mapa de fase_id_pipefy -> { color, color_letra }
      const coloresMap = {};
      data.forEach(fase => {
        if (fase.fase_id_pipefy && fase.color) {
          coloresMap[fase.fase_id_pipefy] = {
            color: fase.color,
            color_letra: fase.color_letra || '#000000' // Negro por defecto
          };
        }
      });
      setColoresFases(coloresMap);
    } catch (error) {
      console.error('Error cargando colores de fases:', error);
    }
  }, []);

  // Función para cargar lista de comerciales (para reasignación, disponible para todos)
  const fetchComerciales = useCallback(async () => {
    try {
      // Obtener usuarios del módulo comercial (incluir ultima_conexion, puede_ver_todos, card_id, disponibilidad y performance)
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          email,
          nombre,
          ultima_conexion,
          puede_ver_todos,
          card_id,
          disponibilidad,
          performance,
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
  }, []);

  // Carga las fases (fase_id_pipefy) permitidas para el setter.
  const fetchFasesSetter = useCallback(async () => {
    if (!esSetter) return;
    try {
      const { data, error } = await supabase
        .from('config_fases')
        .select('fase_id_pipefy')
        .eq('setter', true)
        .not('fase_id_pipefy', 'is', null);
      if (error) throw error;
      setFasesSetter((data || []).map(d => String(d.fase_id_pipefy)).filter(Boolean));
    } catch (error) {
      console.error('Error cargando fases del setter:', error.message);
      setFasesSetter([]); // cargado pero vacío → el setter no ve leads
    }
  }, [esSetter]);

  // Función para cargar etapas del funnel desde config_fases
  const fetchEtapasFunnel = useCallback(async () => {
    try {
      let query = supabase
        .from('config_fases')
        .select('etapa_funnel_agrupada, orden_funnel, grupo_funnel, nombre_grupo_funnel, orden_grupo_funnel')
        .not('etapa_funnel_agrupada', 'is', null)
        .neq('etapa_funnel_agrupada', 'No mostrar');
      // Setter: solo los chips de fases marcadas con setter = true.
      if (esSetter) query = query.eq('setter', true);

      const { data, error } = await query;

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
  }, [esSetter]);

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

  // Cargar configuraciones de meses personalizados
  const fetchMonthConfigs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_meses')
        .select('mes, fecha_inicio, fecha_fin');
      if (error) throw error;
      const map = {};
      (data || []).forEach(c => { map[c.mes] = c; });
      setMonthConfigs(map);
    } catch (error) {
      console.error('Error cargando config_meses:', error.message);
    }
  }, []);

  const handleSaveMonthConfig = useCallback(async (mes, fechaInicio, fechaFin) => {
    try {
      const { error } = await supabase
        .from('config_meses')
        .upsert({ mes, fecha_inicio: fechaInicio, fecha_fin: fechaFin || null, updated_at: new Date().toISOString() }, { onConflict: 'mes' });
      if (error) throw error;
      await fetchMonthConfigs();
    } catch (error) {
      console.error('Error guardando config_meses:', error.message);
    }
  }, [fetchMonthConfigs]);

  // Parsear filtros de fecha (ajustados a zona horaria Colombia UTC-5)
  const parseDateFilters = useCallback(() => {
    let fechaInicio = null;
    let fechaFin = null;

    if (selectedDia) {
      const [year, month, day] = selectedDia.split('-').map(Number);
      const mananaDate = new Date(year, month - 1, day + 1);
      const fechaManana = `${mananaDate.getFullYear()}-${String(mananaDate.getMonth() + 1).padStart(2, '0')}-${String(mananaDate.getDate()).padStart(2, '0')}`;
      
      fechaInicio = `${selectedDia} 05:00:00+00`;
      fechaFin = `${fechaManana} 05:00:00+00`;
    } else if (selectedPeriodo) {
      const [inicio, fin] = selectedPeriodo.split('_');
      const [yearFin, monthFin, dayFin] = fin.split('-').map(Number);
      const finMasUno = new Date(yearFin, monthFin - 1, dayFin + 1);
      const fechaFinMasUno = `${finMasUno.getFullYear()}-${String(finMasUno.getMonth() + 1).padStart(2, '0')}-${String(finMasUno.getDate()).padStart(2, '0')}`;
      
      fechaInicio = `${inicio} 05:00:00+00`;
      fechaFin = `${fechaFinMasUno} 05:00:00+00`;
    } else if (selectedMes) {
      const [año, mes] = selectedMes.split('-');
      const config = monthConfigs[selectedMes];

      if (config) {
        fechaInicio = `${config.fecha_inicio} 05:00:00+00`;
        if (config.fecha_fin) {
          const [yF, mF, dF] = config.fecha_fin.split('-').map(Number);
          const finMasUno = new Date(yF, mF - 1, dF + 1);
          const fechaFinMasUno = `${finMasUno.getFullYear()}-${String(finMasUno.getMonth() + 1).padStart(2, '0')}-${String(finMasUno.getDate()).padStart(2, '0')}`;
          fechaFin = `${fechaFinMasUno} 05:00:00+00`;
        } else {
          // Mes actual sin fecha_fin configurada: hasta ahora
          const now = new Date();
          const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          const fechaManana = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
          fechaFin = `${fechaManana} 05:00:00+00`;
        }
      } else {
        // Sin configuración: rango tradicional del 1 al último día
        const mesSiguiente = new Date(parseInt(año), parseInt(mes), 1);
        const fechaMesSiguiente = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01`;
        fechaInicio = `${año}-${mes}-01 05:00:00+00`;
        fechaFin = `${fechaMesSiguiente} 05:00:00+00`;
      }
    }

    return { fechaInicio, fechaFin };
  }, [selectedDia, selectedMes, selectedPeriodo, monthConfigs]);

  // Función para calcular ventanas de WhatsApp abiertas (< 24 horas)
  const fetchVentanasAbiertas = useCallback(async () => {
    const targetEmail = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;
    if (!targetEmail && !puedeVerTodos) return;
    if (esSetter && fasesSetter === null) return; // aún no cargan las fases del setter

    try {
      // Calcular hace 24 horas
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      let query = aplicarVisibilidadFases(
        supabase
          .from('leads')
          .select('card_id', { count: 'exact', head: true })
      )
        .not('timestamp_ultimo_mensaje_whatsapp', 'is', null)
        .gte('timestamp_ultimo_mensaje_whatsapp', hace24Horas);

      // Aplicar filtro de comercial
      if (puedeVerTodos && selectedComercial) {
        query = query.eq('comercial_email', selectedComercial);
      } else if (!puedeVerTodos) {
        query = query.eq('comercial_email', userEmail);
      }

      const { count, error } = await query;
      if (error) throw error;

      setVentanasAbiertas(count || 0);
    } catch (error) {
      console.error('Error calculando ventanas abiertas:', error.message);
    }
  }, [userEmail, puedeVerTodos, selectedComercial, esSetter, fasesSetter, aplicarVisibilidadFases]);

  // Función para calcular nuevos leads (notificaciones con contador_nuevos_leads = true y estado_lectura = 'nuevo')
  const fetchNuevosLeads = useCallback(async () => {
    if (!userEmail) return;

    try {
      let query = supabase
        .from('notificaciones')
        .select('card_id')
        .eq('contador_nuevos_leads', true)
        .eq('estado_lectura', 'nuevo');

      // Aplicar filtro de comercial (igual que los otros fetch)
      if (puedeVerTodos && selectedComercial) {
        // Admin con comercial seleccionado: solo ese comercial
        query = query.eq('comercial_email', selectedComercial);
      } else if (!puedeVerTodos) {
        // Usuario normal: solo sus notificaciones
        query = query.eq('comercial_email', userEmail);
      }
      // Si puedeVerTodos y no hay selectedComercial: traer todos

      const { data, error } = await query;

      if (error) throw error;

      const cardIds = (data || []).map(n => n.card_id).filter(Boolean);
      setNuevosLeads(cardIds.length);
      setNuevosLeadsCardIds(cardIds);
    } catch (error) {
      console.error('Error calculando nuevos leads:', error.message);
    }
  }, [userEmail, puedeVerTodos, selectedComercial]);

  // Función para obtener estadísticas globales (KPIs)
  const fetchStats = useCallback(async () => {
    const targetEmail = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;
    if (!targetEmail && !puedeVerTodos) return;
    if (esSetter && fasesSetter === null) return; // aún no cargan las fases del setter

    try {
      const { fechaInicio, fechaFin } = parseDateFilters();

      if (filtroNuevosLeads && nuevosLeadsCardIds.length === 0) {
        setStatsData({ total: 0, porEstado: {}, porEtapa: {} });
        return;
      }

      const PAGE_SIZE = 1000;
      let allLeads = [];
      let from = 0;
      let keepFetching = true;

      const hace24Horas = (filtroWhatsApp === 'abierta' || filtroWhatsApp === 'cerrada')
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        : null;
      const fasesEmdi = ['340832804', '339756097', '341769991'];
      const nowISO = new Date().toISOString();

      while (keepFetching) {
        let statsQuery = aplicarVisibilidadFases(
          supabase
            .from('leads')
            .select('estado_gestion, etapa_funnel, fecha_gestion, card_id, label')
        );

        if (puedeVerTodos && selectedComercial) {
          statsQuery = statsQuery.eq('comercial_email', selectedComercial);
        } else if (!puedeVerTodos) {
          statsQuery = statsQuery.eq('comercial_email', userEmail);
        }

        if (fechaInicio && fechaFin) {
          statsQuery = statsQuery.gte(dateFilterField, fechaInicio).lte(dateFilterField, fechaFin);
        }

        if (selectedTag.length > 0) {
          statsQuery = statsQuery.in('label', selectedTag);
        }

        if (selectedFuente.length > 0) {
          statsQuery = statsQuery.in('fuente_dato', selectedFuente);
        }

        if (selectedReferido) {
          statsQuery = statsQuery.eq('referido_por', selectedReferido);
        }

        if (filtroWhatsApp === 'abierta') {
          statsQuery = statsQuery
            .not('timestamp_ultimo_mensaje_whatsapp', 'is', null)
            .gte('timestamp_ultimo_mensaje_whatsapp', hace24Horas);
        } else if (filtroWhatsApp === 'cerrada') {
          statsQuery = statsQuery.or(`timestamp_ultimo_mensaje_whatsapp.is.null,timestamp_ultimo_mensaje_whatsapp.lt.${hace24Horas}`);
        }

        if (filtroNuevosLeads && nuevosLeadsCardIds.length > 0) {
          statsQuery = statsQuery.in('card_id', nuevosLeadsCardIds);
        }

        if (filtroHot) {
          statsQuery = statsQuery.eq('is_hot', true);
        }

        if (filtroEmdi === 'activo') {
          statsQuery = statsQuery.in('fase_id_pipefy', fasesEmdi).gte('fecha_recordatorio_automatico', nowISO);
        } else if (filtroEmdi === 'inactivo') {
          statsQuery = statsQuery.in('fase_id_pipefy', fasesEmdi).or('fecha_recordatorio_automatico.is.null,fecha_recordatorio_automatico.lt.' + nowISO);
        }

        if (filtroGestionWA === 'respond') {
          statsQuery = statsQuery.or('gestion_whatsapp_personal.is.null,gestion_whatsapp_personal.eq.false');
        } else if (filtroGestionWA === 'personal') {
          statsQuery = statsQuery.eq('gestion_whatsapp_personal', true);
        }

        const { data, error: statsError } = await statsQuery.range(from, from + PAGE_SIZE - 1);
        if (statsError) throw statsError;

        allLeads = allLeads.concat(data || []);
        if (!data || data.length < PAGE_SIZE) {
          keepFetching = false;
        } else {
          from += PAGE_SIZE;
        }
      }

      // Aplicar filtro por categoría de seguimiento (post-query porque requiere join con comentarios)
      if (selectedCategoria) {
        const { data: comentariosConCategoria, error: errorCat } = await supabase
          .from('comentarios')
          .select('lead_id')
          .eq('categoria', selectedCategoria);
        
        if (!errorCat && comentariosConCategoria) {
          const cardIdsConCategoria = new Set(comentariosConCategoria.map(c => c.lead_id));
          allLeads = allLeads.filter(lead => cardIdsConCategoria.has(lead.card_id));
        }
      }

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
  }, [userEmail, puedeVerTodos, selectedComercial, activeFilter, selectedCategoria, selectedTag, selectedFuente, selectedReferido, filtroWhatsApp, filtroNuevosLeads, nuevosLeadsCardIds, filtroHot, filtroEmdi, filtroGestionWA, parseDateFilters, dateFilterField, esSetter, fasesSetter, aplicarVisibilidadFases]);

  // Función para obtener leads paginados
  const fetchLeads = useCallback(async (silent = false, page = 0) => {
    const targetEmail = puedeVerTodos && selectedComercial ? selectedComercial : userEmail;
    if (!targetEmail && !puedeVerTodos) {
      console.error("No hay email de usuario");
      return;
    }
    if (esSetter && fasesSetter === null) return; // aún no cargan las fases del setter

    try {
      if (!silent) setLoading(true);
      if (silent) setIsRefreshing(true);

      const { fechaInicio, fechaFin } = parseDateFilters();

      // Pre-fetch: IDs de leads con categoría seleccionada
      let cardIdsConCategoria = null;
      if (selectedCategoria) {
        const { data: comentariosConCategoria, error: errorCat } = await supabase
          .from('comentarios')
          .select('lead_id')
          .eq('categoria', selectedCategoria);
        if (!errorCat && comentariosConCategoria) {
          cardIdsConCategoria = [...new Set(comentariosConCategoria.map(c => c.lead_id))];
          if (cardIdsConCategoria.length === 0) {
            setLeads([]); setTotalLeads(0); setCurrentPage(page);
            setLoading(false); setIsRefreshing(false); return;
          }
        }
      }

      if (filtroNuevosLeads && nuevosLeadsCardIds.length === 0) {
        setLeads([]); setTotalLeads(0); setCurrentPage(page);
        setLoading(false); setIsRefreshing(false); return;
      }

      const buildQuery = (selectCols = '*') => {
        let q = aplicarVisibilidadFases(
          supabase.from('leads').select(selectCols, { count: 'exact' })
        );
        if (puedeVerTodos && selectedComercial) {
          q = q.eq('comercial_email', selectedComercial);
        } else if (!puedeVerTodos) {
          q = q.eq('comercial_email', userEmail);
        }
        if (fechaInicio && fechaFin) {
          q = q.gte(dateFilterField, fechaInicio).lte(dateFilterField, fechaFin);
        }
        if (activeFilter !== 'todos') q = q.eq('estado_gestion', activeFilter);
        if (activeEtapas.length > 0) q = q.in('etapa_funnel', activeEtapas);
        if (searchQuery && searchQuery.trim()) {
          const searchTerm = `%${searchQuery.trim()}%`;
          q = q.or(
            `nombre.ilike.${searchTerm},email.ilike.${searchTerm},telefono.ilike.${searchTerm},pais.ilike.${searchTerm},fase_nombre_pipefy.ilike.${searchTerm},card_id.ilike.${searchTerm}`
          );
        }
        if (cardIdsConCategoria) q = q.in('card_id', cardIdsConCategoria);
        if (selectedTag.length > 0) q = q.in('label', selectedTag);
        if (selectedFuente.length > 0) q = q.in('fuente_dato', selectedFuente);
        if (selectedReferido) q = q.eq('referido_por', selectedReferido);
        if (filtroWhatsApp === 'abierta') {
          const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          q = q.not('timestamp_ultimo_mensaje_whatsapp', 'is', null)
            .gte('timestamp_ultimo_mensaje_whatsapp', hace24Horas);
        } else if (filtroWhatsApp === 'cerrada') {
          const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          q = q.or(`timestamp_ultimo_mensaje_whatsapp.is.null,timestamp_ultimo_mensaje_whatsapp.lt.${hace24Horas}`);
        }
        if (filtroNuevosLeads && nuevosLeadsCardIds.length > 0) {
          q = q.in('card_id', nuevosLeadsCardIds);
        }
        if (filtroHot) q = q.eq('is_hot', true);
        const fasesEmdi = ['340832804', '339756097', '341769991'];
        if (filtroEmdi === 'activo') {
          q = q.in('fase_id_pipefy', fasesEmdi).gte('fecha_recordatorio_automatico', new Date().toISOString());
        } else if (filtroEmdi === 'inactivo') {
          q = q.in('fase_id_pipefy', fasesEmdi).or('fecha_recordatorio_automatico.is.null,fecha_recordatorio_automatico.lt.' + new Date().toISOString());
        }
        if (filtroGestionWA === 'respond') {
          q = q.or('gestion_whatsapp_personal.is.null,gestion_whatsapp_personal.eq.false');
        } else if (filtroGestionWA === 'personal') {
          q = q.eq('gestion_whatsapp_personal', true);
        }
        return q;
      };

      let data, totalCount;

      if (filtroSinSeguimiento) {
        // IDs de leads que tienen al menos un comentario (cualquier origen)
        const { data: conSeg } = await supabase
          .from('comentarios')
          .select('lead_id');
        const idsConSeg = new Set((conSeg || []).map(c => c.lead_id));

        // Fetch ligero: solo card_id + updated_at de todos los leads filtrados
        let allRefs = [];
        let batchOffset = 0;
        const BATCH = 1000;
        while (true) {
          const qBatch = buildQuery('card_id, updated_at');
          const { data: batch } = await qBatch
            .order('updated_at', { ascending: true })
            .range(batchOffset, batchOffset + BATCH - 1);
          if (!batch || batch.length === 0) break;
          allRefs = allRefs.concat(batch);
          if (batch.length < BATCH) break;
          batchOffset += BATCH;
        }

        // Separar en sin/con seguimiento (ambos ya ordenados por updated_at ASC)
        const sinSeg = allRefs.filter(l => !idsConSeg.has(l.card_id));
        const conSegLeads = allRefs.filter(l => idsConSeg.has(l.card_id));
        const combined = [...sinSeg, ...conSegLeads];

        totalCount = combined.length;
        const from = page * LEADS_PER_PAGE;
        const pageIds = combined.slice(from, from + LEADS_PER_PAGE).map(l => l.card_id);

        if (pageIds.length > 0) {
          const { data: fullData } = await supabase
            .from('leads')
            .select('*')
            .in('card_id', pageIds);
          const dataMap = new Map((fullData || []).map(l => [l.card_id, l]));
          data = pageIds.map(id => dataMap.get(id)).filter(Boolean);
        } else {
          data = [];
        }
      } else {
        let query = buildQuery();
        const from = page * LEADS_PER_PAGE;
        const to = from + LEADS_PER_PAGE - 1;
        query = query
          .order(sortConfig.field, { ascending: sortConfig.ascending, nullsFirst: true })
          .range(from, to);
        const result = await query;
        if (result.error) throw result.error;
        data = result.data || [];
        totalCount = result.count || 0;
      }

      setLeads(data || []);
      setTotalLeads(totalCount || 0);
      setCurrentPage(page);

      if (data && data.length > 0) {
        const cardIds = data.map(lead => lead.card_id);
        const { data: comentarios, error: errorComentarios } = await supabase
          .from('comentarios')
          .select('lead_id, texto, created_at, categoria')
          .in('lead_id', cardIds)
          .order('created_at', { ascending: false });

        if (!errorComentarios && comentarios) {
          const ultimosMap = {};
          comentarios.forEach(c => {
            if (!ultimosMap[c.lead_id]) {
              ultimosMap[c.lead_id] = c;
            }
          });
          setUltimosSeguimientos(ultimosMap);
        }
      }
      
    } catch (error) {
      console.error('Error cargando leads:', error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userEmail, puedeVerTodos, selectedComercial, activeFilter, activeEtapas, searchQuery, selectedCategoria, selectedTag, selectedFuente, selectedReferido, filtroWhatsApp, filtroNuevosLeads, nuevosLeadsCardIds, filtroHot, filtroEmdi, filtroGestionWA, sortConfig, parseDateFilters, dateFilterField, filtroSinSeguimiento, esSetter, fasesSetter, aplicarVisibilidadFases]);

  // Efecto para carga inicial
  useEffect(() => {
    if (userEmail) {
      fetchComerciales();
      fetchCategorias();
      fetchTags();
      fetchFuentes();
      fetchReferidos();
      fetchColoresFases();
      fetchFasesSetter();
      fetchEtapasFunnel();
      fetchMonthConfigs();
      fetchStats();
      fetchVentanasAbiertas();
      fetchNuevosLeads();
      fetchLeads(false, 0);
    }
  }, [userEmail]);

  // Setter: los fetches iniciales de leads dependen de fasesSetter, que carga
  // async. Cuando llega (null → array), disparamos la carga real (el primer
  // intento del efecto de arriba salió temprano por el guard y dejó loading=true).
  useEffect(() => {
    if (userEmail && esSetter && fasesSetter !== null) {
      fetchStats();
      fetchVentanasAbiertas();
      fetchNuevosLeads();
      fetchLeads(false, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fasesSetter]);

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
      fetchVentanasAbiertas();
      fetchNuevosLeads();
      fetchLeads(true, 0); // Volver a página 0 cuando cambian filtros
    }
  }, [activeFilter, activeEtapas, selectedComercial, selectedMes, selectedPeriodo, selectedDia, searchQuery, selectedCategoria, selectedTag, selectedFuente, selectedReferido, filtroWhatsApp, filtroNuevosLeads, filtroHot, filtroEmdi, filtroGestionWA, sortConfig, dateFilterField, filtroSinSeguimiento, fasesSetter]);

  // Heartbeat: actualizar última conexión cada 30 segundos
  useEffect(() => {
    if (!userEmail) return;

    const actualizarConexion = async () => {
      try {
        await supabase
          .from('usuarios')
          .update({ ultima_conexion: new Date().toISOString() })
          .eq('email', userEmail);
        
        // También refrescar lista de comerciales para actualizar estados online
        fetchComerciales();
      } catch (error) {
        console.error('Error actualizando conexión:', error);
      }
    };

    // Actualizar inmediatamente al cargar
    actualizarConexion();

    // Actualizar cada 30 segundos
    const heartbeatInterval = setInterval(actualizarConexion, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [userEmail, fetchComerciales]);

  // Efecto para recarga automática cada 3 minutos
  useEffect(() => {
    const intervalId = setInterval(async () => {
      console.log("🔄 Actualizando datos en segundo plano...");
      
      // Actualizar estadísticas
      try {
        await fetchStats();
        await fetchVentanasAbiertas();
        await fetchNuevosLeads();
      } catch (e) { console.error('Error en fetchStats:', e); }
      
      // Actualizar leads
      try {
        await fetchLeads(true, currentPage);
      } catch (e) { console.error('Error en fetchLeads:', e); }
      
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [currentPage, fetchStats, fetchVentanasAbiertas, fetchNuevosLeads, fetchLeads]);

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

  const handleEtapaChange = (etapaId) => {
    if (etapaId === null) {
      setActiveEtapas([]);
    } else {
      setActiveEtapas(prev =>
        prev.includes(etapaId)
          ? prev.filter(id => id !== etapaId)
          : [...prev, etapaId]
      );
    }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo OV - oculto en mobile */}
            <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] items-center justify-center shadow-lg shadow-[#02214A]/20">
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
            {/* Campanita de notificaciones */}
            <NotificacionesBell 
              userEmail={userEmail} 
              onOpenLead={handleOpenLeadFromNotification}
            />
            
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
              {!esSetter && (
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
              )}
              {!esSetter && (
                <button
                  onClick={() => {
                    setActiveView('metricas');
                    if (!puedeVerTodos) setMetricasSubTab('performance');
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    activeView === 'metricas'
                      ? 'bg-white text-[#1717AF] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BarChart3 size={18} />
                  Métricas
                </button>
              )}
              {puedeVerTodos && (
                <button
                  onClick={() => setActiveView('informe')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    activeView === 'informe'
                      ? 'bg-white text-[#1717AF] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileBarChart2 size={18} />
                  Informe
                </button>
              )}
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
                  selectedCategoria={selectedCategoria}
                  onCategoriaChange={setSelectedCategoria}
                  categorias={categoriasSeguimiento}
                  selectedTag={selectedTag}
                  onTagChange={setSelectedTag}
                  tags={tagsDisponibles}
                  selectedFuente={selectedFuente}
                  onFuenteChange={setSelectedFuente}
                  fuentes={fuentesDisponibles}
                  selectedReferido={selectedReferido}
                  onReferidoChange={setSelectedReferido}
                  referidos={referidosDisponibles}
                  filtroGestionWA={filtroGestionWA}
                  onFiltroGestionWAChange={setFiltroGestionWA}
                  showComercialFilter={puedeVerTodos}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  onRefreshComerciales={fetchComerciales}
                  dateFilterField={dateFilterField}
                  onDateFilterFieldChange={setDateFilterField}
                  puedeVerTodos={puedeVerTodos}
                  monthConfigs={monthConfigs}
                  onSaveMonthConfig={handleSaveMonthConfig}
                />

                {/* KPIs - Debajo de los filtros */}
            <DashboardStats 
                  statsData={statsData}
              activeFilter={activeFilter}
                  onFilterChange={handleFilterChange}
                  onCrearLead={() => setCrearLeadModalOpen(true)}
                  ventanasAbiertas={ventanasAbiertas}
                  nuevosLeads={nuevosLeads}
                  filtroWhatsApp={filtroWhatsApp}
                  onFiltroWhatsAppChange={setFiltroWhatsApp}
                  filtroNuevosLeads={filtroNuevosLeads}
                  onFiltroNuevosLeadsChange={setFiltroNuevosLeads}
            />

                {/* Indicador de filtro activo */}
                {(activeFilter !== 'todos' || activeEtapas.length > 0 || selectedComercial || selectedMes || selectedPeriodo || selectedDia || searchQuery || selectedCategoria || selectedTag.length > 0 || selectedFuente.length > 0 || selectedReferido || filtroGestionWA) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1717AF]/5 border border-[#1717AF]/20 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-[#1717AF] animate-pulse" />
                <span className="text-sm text-slate-600">
                      Mostrando <strong className="text-[#02214A]">{totalLeads}</strong> leads filtrados
                      {searchQuery && <span className="text-slate-400"> • Búsqueda: "{searchQuery}"</span>}
                      {selectedComercial && <span className="text-slate-400"> • {comerciales.find(c => c.email === selectedComercial)?.nombre || selectedComercial}</span>}
                      {activeEtapas.length > 0 && <span className="text-slate-400"> • {activeEtapas.length} etapa{activeEtapas.length > 1 ? 's' : ''} seleccionada{activeEtapas.length > 1 ? 's' : ''}</span>}
                      {selectedMes && <span className="text-slate-400"> • Mes seleccionado</span>}
                      {selectedPeriodo && <span className="text-slate-400"> • Periodo seleccionado</span>}
                      {selectedDia && <span className="text-slate-400"> • Día seleccionado</span>}
                      {selectedCategoria && <span className="text-slate-400"> • Categoría: {selectedCategoria}</span>}
                      {selectedTag.length > 0 && <span className="text-slate-400"> • Tags: {selectedTag.join(', ')}</span>}
                      {selectedFuente.length > 0 && <span className="text-slate-400"> • Fuentes: {selectedFuente.join(', ')}</span>}
                      {selectedReferido && <span className="text-slate-400"> • Referido por: {selectedReferido}</span>}
                      {filtroGestionWA && <span className="text-slate-400"> • Gestión WA: {filtroGestionWA === 'respond' ? 'Respond' : 'WA Business del Comercial'}</span>}
                </span>
                <button
                      onClick={() => {
                        setActiveFilter('todos');
                        setActiveEtapas([]);
                        setSelectedComercial(null);
                        setSelectedMes(null);
                        setSelectedPeriodo(null);
                        setSelectedDia(null);
                        setSearchQuery('');
                        setSelectedCategoria(null);
                        setSelectedTag([]);
                        setSelectedFuente([]);
                        setSelectedReferido(null);
                        setFiltroGestionWA(null);
                        setFiltroSinSeguimiento(false);
                      }}
                  className="ml-auto text-sm text-[#1717AF] hover:text-[#02214A] font-medium hover:underline transition-all"
                >
                      Limpiar filtros
                </button>
              </div>
            )}

                {/* Vista calendario de recordatorios cuando el filtro "Recordatorio Activo" está activo */}
                {activeFilter === 'gestionado' ? (
                  <RecordatoriosCalendar
                    selectedComercial={selectedComercial}
                    userEmail={userEmail}
                    puedeVerTodos={puedeVerTodos}
                    onOpenLead={handleOpenSidebar}
                  />
                ) : (
                <LeadsTable 
                  leads={leads}
                  statsData={statsData}
                  etapasFunnel={etapasFunnel}
                  onOpenModal={handleOpenSidebar}
                  onOpenReminder={(lead) => handleOpenSidebar(lead, 'recordatorio')}
                  onOpenSeguimiento={handleOpenSeguimiento}
                  onMarcarNoRevisado={handleMarcarNoRevisado}
                  onToggleHot={handleToggleHot}
                  onToggleGestionWA={handleToggleGestionWhatsApp}
                  onMarcarLeidoBulk={handleMarcarLeidoBulk}
                  onMarcarNoLeidoBulk={handleMarcarNoLeidoBulk}
                  activeEtapas={activeEtapas}
                  onEtapaChange={handleEtapaChange}
                  onSetActiveEtapas={setActiveEtapas}
                  activeFilter={activeFilter}
                  ultimosSeguimientos={ultimosSeguimientos}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalLeads={totalLeads}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  isEmbedded={false}
                  filtroWhatsApp={filtroWhatsApp}
                  onFiltroWhatsAppChange={setFiltroWhatsApp}
                  filtroNuevosLeads={filtroNuevosLeads}
                  nuevosLeadsCardIds={nuevosLeadsCardIds}
                  filtroHot={filtroHot}
                  onFiltroHotChange={setFiltroHot}
                  filtroEmdi={filtroEmdi}
                  onFiltroEmdiChange={setFiltroEmdi}
                  filtroGestionWA={filtroGestionWA}
                  onFiltroGestionWAChange={setFiltroGestionWA}
                  sortConfig={sortConfig}
                  onSortChange={setSortConfig}
                  filtroSinSeguimiento={filtroSinSeguimiento}
                  onFiltroSinSeguimientoChange={setFiltroSinSeguimiento}
                  configTags={configTags}
                  coloresFases={coloresFases}
                  onRefreshData={() => {
                    fetchStats();
                    fetchVentanasAbiertas();
                    fetchNuevosLeads();
                    fetchLeads(true, currentPage);
                  }}
                />
                )}
              </>
            ) : activeView === 'pitch' ? (
              <>
                {/* Filtros para Mis Pitch: tiempo (mes/periodo/día) + comercial + tags.
                    Los handlers handle*Change garantizan exclusión mutua entre tiempo.
                    El filtro de tags usa pitchKpiTags (estado propio de Mis Pitch). */}
                <DashboardFilters
                  comerciales={pitchSubTab === 'analisis' ? comercialesAnalisis : comerciales}
                  selectedComercial={selectedComercial}
                  onComercialChange={handleComercialChange}
                  selectedMes={selectedMes}
                  onMesChange={handleMesChange}
                  selectedPeriodo={selectedPeriodo}
                  onPeriodoChange={handlePeriodoChange}
                  selectedDia={selectedDia}
                  onDiaChange={handleDiaChange}
                  selectedTag={pitchKpiTags}
                  onTagChange={setPitchKpiTags}
                  tags={pitchSubTab === 'analisis' ? tagsAnalisis : tagsDisponibles}
                  tagsStaged={true}
                  tagPresets={PITCH_TAG_PRESETS}
                  showFuenteFilter={false}
                  showReferidoFilter={false}
                  showGestionWAFilter={false}
                  showComercialFilter={puedeVerTodos}
                  onRefreshComerciales={fetchComerciales}
                  monthConfigs={monthConfigs}
                  onSaveMonthConfig={handleSaveMonthConfig}
                  puedeVerTodos={puedeVerTodos}
                >
                  {/* Filtros de análisis (profesión/género/edad/ciudad/país):
                      fluyen en la misma fila que los demás filtros. En "Agenda"
                      se alimentan de la vista del calendario; en "Análisis" se
                      alimentan del universo del sub-tab (pitches_resultados). */}
                  <PitchDimFilters
                    rangeStart={pitchRange.rangeStart}
                    rangeEnd={pitchRange.rangeEnd}
                    selectedComercial={selectedComercial}
                    userEmail={userEmail}
                    puedeVerTodos={puedeVerTodos}
                    tagFilter={pitchKpiTags}
                    value={pitchDims}
                    onChange={setPitchDims}
                    externalRows={analisisDimRows}
                  />
                </DashboardFilters>

                {/* KPIs (10 cards 5x2): solo en "Agenda" (en "Análisis" se ocultan,
                    porque filtrarlos por un solo pitch_result los dejaría en 0%/100%). */}
                {pitchSubTab === 'agenda' && (
                  <PitchKpis
                    rangeStart={pitchRange.rangeStart}
                    rangeEnd={pitchRange.rangeEnd}
                    selectedComercial={selectedComercial}
                    userEmail={userEmail}
                    puedeVerTodos={puedeVerTodos}
                    selectedTags={pitchKpiTags}
                    dimFilters={pitchDims}
                  />
                )}

                {/* Sub-tabs de Mis Pitch: Agenda (default) | Análisis (debajo de los KPIs) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-4 mb-4">
                  <button
                    onClick={() => setPitchSubTab('agenda')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      pitchSubTab === 'agenda'
                        ? 'bg-white text-[#1717AF] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Agenda
                  </button>
                  <button
                    onClick={() => setPitchSubTab('analisis')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      pitchSubTab === 'analisis'
                        ? 'bg-white text-[#1717AF] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Análisis Post - Pitch
                  </button>
                </div>

                {pitchSubTab === 'agenda' ? (
                  /* Calendario de Pitches */
                  <PitchCalendar
                    selectedComercial={selectedComercial}
                    userEmail={userEmail}
                    onOpenLead={handleOpenSidebar}
                    puedeVerTodos={puedeVerTodos}
                    selectedMes={selectedMes}
                    selectedPeriodo={selectedPeriodo}
                    selectedDia={selectedDia}
                    monthConfigs={monthConfigs}
                    tagFilter={pitchKpiTags}
                    dimFilters={pitchDims}
                  />
                ) : (
                  <PitchAnalisis
                    subTab={pitchAnalisisTab}
                    onSubTabChange={setPitchAnalisisTab}
                    rows={analisisChartRows}
                    loading={analisisLoading}
                    viewMode={pitchRange.viewMode}
                    rangeStart={pitchRange.rangeStart}
                    rangeEnd={pitchRange.rangeEnd}
                  />
                )}
              </>
            ) : activeView === 'metricas' ? (
              <>
                {/* Filtros para Métricas */}
                <DashboardFilters
                  comerciales={comerciales}
                  selectedComercial={selectedComercial}
                  onComercialChange={handleComercialChange}
                  selectedMes={selectedMes}
                  onMesChange={setSelectedMes}
                  selectedPeriodo={selectedPeriodo}
                  onPeriodoChange={setSelectedPeriodo}
                  selectedDia={selectedDia}
                  onDiaChange={setSelectedDia}
                  selectedCategoria={selectedCategoria}
                  onCategoriaChange={setSelectedCategoria}
                  selectedTag={selectedTag}
                  onTagChange={setSelectedTag}
                  tags={tagsDisponibles}
                  selectedFuente={selectedFuente}
                  onFuenteChange={setSelectedFuente}
                  fuentes={fuentesDisponibles}
                  selectedReferido={selectedReferido}
                  onReferidoChange={setSelectedReferido}
                  referidos={referidosDisponibles}
                  filtroGestionWA={filtroGestionWA}
                  onFiltroGestionWAChange={setFiltroGestionWA}
                  showComercialFilter={puedeVerTodos}
                  onRefreshComerciales={fetchComerciales}
                  dateFilterField={dateFilterField}
                  onDateFilterFieldChange={setDateFilterField}
                  showDateFilterToggle={metricasSubTab !== 'asignaciones'}
                  puedeVerTodos={puedeVerTodos}
                  monthConfigs={monthConfigs}
                  onSaveMonthConfig={handleSaveMonthConfig}
                  showTagFilter={metricasSubTab !== 'asignaciones'}
                  showFuenteFilter={metricasSubTab !== 'asignaciones'}
                  showReferidoFilter={false}
                  showGestionWAFilter={false}
                />

                {/* Sub-tabs de Métricas */}
                {puedeVerTodos && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMetricasSubTab('asignaciones')}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        metricasSubTab === 'asignaciones'
                          ? 'bg-[#1717AF] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Asignaciones
                    </button>
                    <button
                      onClick={() => setMetricasSubTab('performance')}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        metricasSubTab === 'performance'
                          ? 'bg-[#1717AF] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Performance
                    </button>
                  </div>
                )}

                {/* Contenido de Métricas */}
                {metricasSubTab === 'asignaciones' && (
                  <MetricasAsignaciones
                    selectedComercial={selectedComercial}
                    selectedMes={selectedMes}
                    selectedPeriodo={selectedPeriodo}
                    selectedDia={selectedDia}
                    selectedTag={selectedTag}
                    puedeVerTodos={puedeVerTodos}
                    monthConfigs={monthConfigs}
                  />
                )}

                {metricasSubTab === 'performance' && (
                  <MetricasPerformance
                    selectedComercial={selectedComercial}
                    selectedMes={selectedMes}
                    selectedPeriodo={selectedPeriodo}
                    selectedDia={selectedDia}
                    selectedTag={selectedTag}
                    selectedFuente={selectedFuente}
                    puedeVerTodos={puedeVerTodos}
                    comerciales={comerciales}
                    dateFilterField={dateFilterField}
                    monthConfigs={monthConfigs}
                  />
                )}
              </>
            ) : activeView === 'informe' && puedeVerTodos ? (
              <Informe monthConfigs={monthConfigs} />
            ) : null}
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
          fetchVentanasAbiertas();
          fetchNuevosLeads();
          fetchLeads(true, currentPage);
        }}
        comerciales={comerciales}
        puedeVerTodos={puedeVerTodos}
        configTags={configTags}
      />

      {/* Modal para crear leads */}
      <CrearLeadModal 
        isOpen={crearLeadModalOpen}
        onClose={() => setCrearLeadModalOpen(false)}
      />
    </div>
  );
}
