import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { TrendingDown, ArrowRight, Loader2, ChevronLeft, Users, TrendingUp, Clock, MessageSquare, ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const CHART_HEIGHT = 300;
const MIN_BAR_HEIGHT = 44;

const STAGE_COLORS = [
  { base: '#02214A', light: '#0C3060' },
  { base: '#0B2D5B', light: '#153D6F' },
  { base: '#14396C', light: '#1E4D84' },
  { base: '#1717AF', light: '#2727BF' },
  { base: '#2F35B8', light: '#3F45C8' },
  { base: '#4753C1', light: '#5763D1' },
  { base: '#5F6FCA', light: '#6F7FDA' },
  { base: '#778BD3', light: '#879BE3' },
  { base: '#8FA7DC', light: '#9FB7EC' },
  { base: '#A7C3E5', light: '#B7D3F5' },
];

const getColor = (index, total) => {
  if (total <= STAGE_COLORS.length) return STAGE_COLORS[index] || STAGE_COLORS[STAGE_COLORS.length - 1];
  const ratio = index / (total - 1);
  const i = Math.min(Math.floor(ratio * (STAGE_COLORS.length - 1)), STAGE_COLORS.length - 1);
  return STAGE_COLORS[i];
};

const FUNNEL_STAGES = [
  'Sin contacto',
  'Gestionando',
  'Pendiente de agenda',
  'Listo para agendar',
  'Agendado',
  'Reprogramar',
  'Pitch',
  'Posible matrícula',
  'Pago pendiente',
  'Matrícula',
];

function formatDuration(hours) {
  if (hours === 0 || isNaN(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} días`;
  return `${(days / 7).toFixed(1)} sem`;
}

function avgOf(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export default function MetricasPerformance({
  selectedComercial,
  selectedMes,
  selectedPeriodo,
  selectedDia,
  selectedTag,
  puedeVerTodos,
  comerciales = []
}) {
  const [leadCounts, setLeadCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [headerKpis, setHeaderKpis] = useState(null);

  const [selectedStage, setSelectedStage] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const comercialNames = useMemo(() => {
    const map = {};
    comerciales.forEach(c => {
      map[c.email] = c.nombre || c.email?.split('@')[0] || c.email;
    });
    return map;
  }, [comerciales]);

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
      const mesSiguiente = new Date(parseInt(año), parseInt(mes), 1);
      const fechaMesSiguiente = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01`;
      fechaInicio = `${año}-${mes}-01 05:00:00+00`;
      fechaFin = `${fechaMesSiguiente} 05:00:00+00`;
    }

    return { fechaInicio, fechaFin };
  }, [selectedDia, selectedMes, selectedPeriodo]);

  const fetchLeadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const { fechaInicio, fechaFin } = parseDateFilters();

      let query = supabase
        .from('leads')
        .select('etapa_funnel')
        .neq('etapa_funnel', 'No mostrar');

      if (puedeVerTodos && selectedComercial) {
        query = query.eq('comercial_email', selectedComercial);
      }

      if (fechaInicio && fechaFin) {
        query = query.gte('created_at', fechaInicio).lte('created_at', fechaFin);
      }

      if (selectedTag) {
        query = query.eq('label', selectedTag);
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts = {};
      (data || []).forEach(lead => {
        const etapa = lead.etapa_funnel || 'Sin etapa';
        counts[etapa] = (counts[etapa] || 0) + 1;
      });

      setLeadCounts(counts);
      const funnelTotal = FUNNEL_STAGES.reduce((sum, s) => sum + (counts[s] || 0), 0);
      setTotal(funnelTotal);
    } catch (error) {
      console.error('Error cargando datos del funnel:', error.message);
    } finally {
      setLoading(false);
    }
  }, [parseDateFilters, selectedComercial, selectedTag, puedeVerTodos]);

  const fetchHeaderKpis = useCallback(async () => {
    try {
      const { fechaInicio, fechaFin } = parseDateFilters();

      // Fetch matrículas and pitch leads in parallel
      let matQuery = supabase
        .from('leads')
        .select('comercial_email, created_at')
        .eq('etapa_funnel', 'Matrícula');

      let pitchQuery = supabase
        .from('leads')
        .select('comercial_email')
        .eq('etapa_funnel', 'Pitch');

      if (fechaInicio && fechaFin) {
        matQuery = matQuery.gte('created_at', fechaInicio).lte('created_at', fechaFin);
        pitchQuery = pitchQuery.gte('created_at', fechaInicio).lte('created_at', fechaFin);
      }
      if (selectedTag) {
        matQuery = matQuery.eq('label', selectedTag);
        pitchQuery = pitchQuery.eq('label', selectedTag);
      }

      const [matResult, pitchResult] = await Promise.all([matQuery, pitchQuery]);
      if (matResult.error) throw matResult.error;

      const leads = matResult.data || [];
      const pitchLeads = pitchResult.data || [];
      const now = new Date();

      // Win rate for selected comercial
      let winRate = leads.length;
      if (puedeVerTodos && selectedComercial) {
        winRate = leads.filter(l => l.comercial_email === selectedComercial).length;
      }

      // Pitch count per comercial (for tiebreaking)
      const pitchByComercial = {};
      pitchLeads.forEach(l => {
        const email = l.comercial_email;
        pitchByComercial[email] = (pitchByComercial[email] || 0) + 1;
      });

      // Per-comercial breakdown (matrículas)
      const byComercial = {};
      leads.forEach(l => {
        const email = l.comercial_email;
        if (!byComercial[email]) byComercial[email] = { count: 0, times: [] };
        byComercial[email].count++;
        if (l.created_at) {
          const created = new Date(l.created_at);
          const hoursToConvert = (now - created) / (1000 * 60 * 60);
          byComercial[email].times.push(hoursToConvert);
        }
      });

      // Only consider comercials with disponibilidad = 'Activo'
      const disponibleEmails = new Set(comerciales.filter(c => c.disponibilidad === 'Activo').map(c => c.email));
      comerciales.filter(c => c.disponibilidad === 'Activo').forEach(c => {
        if (!byComercial[c.email]) byComercial[c.email] = { count: 0, times: [] };
      });

      const entries = Object.entries(byComercial).filter(([email]) => disponibleEmails.has(email));
      // Sort: most matrículas first; tiebreak by fewest pitches (better converter)
      entries.sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return (pitchByComercial[a[0]] || 0) - (pitchByComercial[b[0]] || 0);
      });

      const topWin = entries[0] || null;
      const lowWin = entries.length > 1 ? entries[entries.length - 1] : null;

      // Time to conversion
      const allTimes = leads.map(l => l.created_at ? (now - new Date(l.created_at)) / (1000 * 60 * 60) : null).filter(Boolean);
      const avgTime = avgOf(allTimes);

      // Per-comercial avg time (only those with matrículas)
      const comercialAvgTimes = entries
        .filter(([, v]) => v.count > 0 && v.times.length > 0)
        .map(([email, v]) => ({
          email,
          nombre: comercialNames[email] || email?.split('@')[0] || email,
          avgTime: avgOf(v.times),
          count: v.count,
        }));
      comercialAvgTimes.sort((a, b) => a.avgTime - b.avgTime);

      const topTime = comercialAvgTimes[0] || null;
      const lowTime = comercialAvgTimes.length > 1 ? comercialAvgTimes[comercialAvgTimes.length - 1] : null;

      setHeaderKpis({
        winRate,
        topWin: topWin ? { nombre: comercialNames[topWin[0]] || topWin[0]?.split('@')[0], count: topWin[1].count } : null,
        lowWin: lowWin ? { nombre: comercialNames[lowWin[0]] || lowWin[0]?.split('@')[0], count: lowWin[1].count } : null,
        timeToConversion: avgTime,
        topTime: topTime ? { nombre: topTime.nombre, time: topTime.avgTime } : null,
        lowTime: lowTime ? { nombre: lowTime.nombre, time: lowTime.avgTime } : null,
      });
    } catch (error) {
      console.error('Error fetching header KPIs:', error);
    }
  }, [parseDateFilters, selectedComercial, selectedTag, puedeVerTodos, comercialNames, comerciales]);

  useEffect(() => {
    fetchLeadCounts();
    fetchHeaderKpis();
  }, [fetchLeadCounts, fetchHeaderKpis]);

  const fetchStageDetail = useCallback(async (stageName) => {
    setLoadingDetail(true);
    try {
      const { fechaInicio, fechaFin } = parseDateFilters();
      const stageIndex = FUNNEL_STAGES.indexOf(stageName);

      // 1. Build mapping: nombre_fase → etapa_funnel_agrupada
      const [stepperRes, fasesRes] = await Promise.all([
        supabase.from('config_stepper').select('fase_id_pipefy, nombre_fase'),
        supabase.from('config_fases').select('fase_id_pipefy, etapa_funnel_agrupada')
      ]);

      const faseIdToEtapa = {};
      (fasesRes.data || []).forEach(f => {
        faseIdToEtapa[f.fase_id_pipefy] = f.etapa_funnel_agrupada;
      });

      const nombreFaseToEtapa = {};
      (stepperRes.data || []).forEach(s => {
        if (faseIdToEtapa[s.fase_id_pipefy]) {
          nombreFaseToEtapa[s.nombre_fase] = faseIdToEtapa[s.fase_id_pipefy];
        }
      });

      // 2. Fetch ALL leads (no date filter — leads may have been created before the period but passed through the stage during it)
      let leadsQuery = supabase
        .from('leads')
        .select('card_id, etapa_funnel, comercial_email, created_at')
        .neq('etapa_funnel', 'No mostrar');

      if (selectedTag) {
        leadsQuery = leadsQuery.eq('label', selectedTag);
      }

      const { data: leadsData, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      const leadMap = {};
      (leadsData || []).forEach(l => { leadMap[l.card_id] = l; });
      const allLeadIds = Object.keys(leadMap);

      if (allLeadIds.length === 0) {
        setDetailData({ stageName, stageIndex, columns: [], kpis: { total: 0, avanzaron: 0, tasaAvance: 0, conSeguimiento: 0, sinSeguimiento: 0 } });
        return;
      }

      // 3. Fetch historial with pagination (no date filter — we need full history for advancement detection)
      const BATCH = 1000;
      let allHistorial = [];
      let histFrom = 0;
      let fetchMore = true;
      while (fetchMore) {
        let hq = supabase
          .from('historial')
          .select('lead_id, nombre_fase, created_at')
          .eq('modulo', 'comercial')
          .order('created_at', { ascending: true })
          .range(histFrom, histFrom + BATCH - 1);
        const { data: hBatch, error: hErr } = await hq;
        if (hErr) { console.warn('historial query error:', hErr); break; }
        allHistorial = allHistorial.concat(hBatch || []);
        fetchMore = (hBatch || []).length === BATCH;
        histFrom += BATCH;
      }

      // 4. Fetch seguimientos for this stage with pagination
      let allComentarios = [];
      let comFrom = 0;
      fetchMore = true;
      while (fetchMore) {
        const { data: cBatch, error: cErr } = await supabase
          .from('comentarios')
          .select('lead_id, etapa_funnel, created_at')
          .eq('etapa_funnel', stageName)
          .eq('origen', 'Seguimiento')
          .order('created_at', { ascending: true })
          .range(comFrom, comFrom + BATCH - 1);
        if (cErr) { console.warn('comentarios query error:', cErr); break; }
        allComentarios = allComentarios.concat(cBatch || []);
        fetchMore = (cBatch || []).length === BATCH;
        comFrom += BATCH;
      }

      const historialData = allHistorial;
      const comentariosData = allComentarios;

      // 5. Process historial — group by lead, map to funnel stages
      const historialByLead = {};
      (historialData || []).forEach(h => {
        if (!leadMap[h.lead_id]) return;
        if (!historialByLead[h.lead_id]) historialByLead[h.lead_id] = [];
        const etapa = nombreFaseToEtapa[h.nombre_fase] || h.nombre_fase;
        historialByLead[h.lead_id].push({
          etapa,
          created_at: new Date(h.created_at)
        });
      });

      // 6. Group seguimientos by lead
      const seguimientosByLead = {};
      (comentariosData || []).forEach(c => {
        if (!leadMap[c.lead_id]) return;
        if (!seguimientosByLead[c.lead_id]) seguimientosByLead[c.lead_id] = [];
        seguimientosByLead[c.lead_id].push(new Date(c.created_at));
      });

      // 7. Calculate per-comercial metrics
      const metricsPerComercial = {};
      const rangeStart = fechaInicio ? new Date(fechaInicio) : null;
      const rangeEnd = fechaFin ? new Date(fechaFin) : null;

      allLeadIds.forEach(leadId => {
        const lead = leadMap[leadId];
        const comercialEmail = lead.comercial_email;
        const history = historialByLead[leadId] || [];
        const seguimientos = seguimientosByLead[leadId] || [];

        // Check if lead passed through this stage
        const stageEntries = history.filter(h => h.etapa === stageName);
        const isCurrentlyInStage = lead.etapa_funnel === stageName;

        if (stageEntries.length === 0 && !isCurrentlyInStage) return;

        // Date range filter: only count if lead had a stage entry within the period,
        // or is currently in the stage AND was created within the period
        if (rangeStart && rangeEnd) {
          const hasEntryInRange = stageEntries.some(e => e.created_at >= rangeStart && e.created_at <= rangeEnd);
          const createdInRange = lead.created_at && new Date(lead.created_at) >= rangeStart && new Date(lead.created_at) <= rangeEnd;
          if (!hasEntryInRange && !(isCurrentlyInStage && createdInRange)) return;
        }

        if (!metricsPerComercial[comercialEmail]) {
          metricsPerComercial[comercialEmail] = {
            total: 0,
            avanzaron: 0,
            tiemposAvance: [],
            conSeguimiento: 0,
            sinSeguimiento: 0,
            seguimientosAvanzan: [],
            seguimientosNoAvanzan: [],
            tiemposSeguimientoAvanzan: [],
            tiemposSeguimientoNoAvanzan: [],
          };
        }

        const m = metricsPerComercial[comercialEmail];
        m.total++;

        // Determine advancement: lead has a historial entry for a LATER stage after ANY of its entries in this stage
        const advanceTargets = {
          'Pitch': ['Posible matrícula', 'Pago pendiente', 'Matrícula'],
          'Reprogramar': ['Posible matrícula', 'Pago pendiente', 'Matrícula'],
          'Posible matrícula': ['Pago pendiente', 'Matrícula'],
          'Pago pendiente': ['Matrícula'],
        };
        const validTargets = advanceTargets[stageName] || null;

        let advanced = false;
        let advanceTimeHours = null;

        // Check each entry in the stage — if ANY led to advancement, count it
        for (const entry of stageEntries) {
          const nextDifferentEntry = history.find(
            h => h.created_at > entry.created_at
              && h.etapa !== stageName
              && (!validTargets || validTargets.includes(h.etapa))
          );

          if (nextDifferentEntry) {
            advanced = true;
            advanceTimeHours = (nextDifferentEntry.created_at - entry.created_at) / (1000 * 60 * 60);
            break;
          }
        }

        if (!advanced && !isCurrentlyInStage) {
          const currentEtapa = lead.etapa_funnel;
          if (validTargets) {
            if (validTargets.includes(currentEtapa)) {
              advanced = true;
            }
          } else {
            const currentIdx = FUNNEL_STAGES.indexOf(currentEtapa);
            if (currentIdx > stageIndex) {
              advanced = true;
            }
          }
        }

        if (advanced) {
          m.avanzaron++;
          if (advanceTimeHours !== null) {
            m.tiemposAvance.push(advanceTimeHours);
          }
        }

        // Seguimientos
        if (seguimientos.length > 0) {
          m.conSeguimiento++;
          const segTimeDiffs = [];
          for (let i = 1; i < seguimientos.length; i++) {
            segTimeDiffs.push((seguimientos[i] - seguimientos[i - 1]) / (1000 * 60 * 60));
          }

          if (advanced) {
            m.seguimientosAvanzan.push(seguimientos.length);
            m.tiemposSeguimientoAvanzan.push(...segTimeDiffs);
          } else {
            m.seguimientosNoAvanzan.push(seguimientos.length);
            m.tiemposSeguimientoNoAvanzan.push(...segTimeDiffs);
          }
        } else {
          m.sinSeguimiento++;
          if (advanced) {
            m.seguimientosAvanzan.push(0);
          } else {
            m.seguimientosNoAvanzan.push(0);
          }
        }
      });

      // 8. Aggregate per comercial
      const processedComercials = {};
      Object.entries(metricsPerComercial).forEach(([email, m]) => {
        processedComercials[email] = {
          nombre: comercialNames[email] || email?.split('@')[0] || email,
          total: m.total,
          avanzaron: m.avanzaron,
          tasaAvance: m.total > 0 ? (m.avanzaron / m.total) * 100 : 0,
          tiempoPromedioAvance: avgOf(m.tiemposAvance),
          conSeguimiento: m.conSeguimiento,
          sinSeguimiento: m.sinSeguimiento,
          promedioSeguimientosAvanzan: avgOf(m.seguimientosAvanzan),
          promedioSeguimientosNoAvanzan: avgOf(m.seguimientosNoAvanzan),
          tiempoPromedioSeguimientoAvanzan: avgOf(m.tiemposSeguimientoAvanzan),
          tiempoPromedioSeguimientoNoAvanzan: avgOf(m.tiemposSeguimientoNoAvanzan),
        };
      });

      // 9. Find top and low (by tasa de avance, min 1 lead, only disponibilidad = 'Activo')
      const disponibleEmails = new Set(comerciales.filter(c => c.disponibilidad === 'Activo').map(c => c.email));
      const sortedComercials = Object.entries(processedComercials)
        .filter(([email, m]) => m.total >= 1 && disponibleEmails.has(email))
        .sort((a, b) => b[1].tasaAvance - a[1].tasaAvance);

      const topEntry = sortedComercials[0] || null;
      const lowEntry = sortedComercials.length > 1
        ? sortedComercials[sortedComercials.length - 1]
        : null;

      // 10. Build columns
      const columns = [];

      if (selectedComercial && processedComercials[selectedComercial]) {
        columns.push({
          type: 'selected',
          label: comercialNames[selectedComercial] || selectedComercial?.split('@')[0],
          data: processedComercials[selectedComercial],
        });
      }

      if (topEntry) {
        columns.push({
          type: 'top',
          label: topEntry[1].nombre,
          data: topEntry[1],
        });
      }

      if (lowEntry && (!topEntry || lowEntry[0] !== topEntry[0])) {
        columns.push({
          type: 'low',
          label: lowEntry[1].nombre,
          data: lowEntry[1],
        });
      }

      // Global KPIs
      const globalTotal = Object.values(processedComercials).reduce((s, m) => s + m.total, 0);
      const globalAvanzaron = Object.values(processedComercials).reduce((s, m) => s + m.avanzaron, 0);
      const globalConSeg = Object.values(processedComercials).reduce((s, m) => s + m.conSeguimiento, 0);

      setDetailData({
        stageName,
        stageIndex,
        columns,
        kpis: {
          total: globalTotal,
          avanzaron: globalAvanzaron,
          tasaAvance: globalTotal > 0 ? (globalAvanzaron / globalTotal) * 100 : 0,
          conSeguimiento: globalConSeg,
          sinSeguimiento: globalTotal - globalConSeg,
        }
      });

    } catch (error) {
      console.error('Error fetching stage detail:', error);
      setDetailData({
        stageName,
        stageIndex: FUNNEL_STAGES.indexOf(stageName),
        columns: [],
        kpis: { total: 0, avanzaron: 0, tasaAvance: 0, conSeguimiento: 0, sinSeguimiento: 0 }
      });
    } finally {
      setLoadingDetail(false);
    }
  }, [parseDateFilters, selectedTag, comercialNames, selectedComercial, comerciales]);

  const handleOpenDetail = useCallback((stageName) => {
    setSelectedStage(stageName);
    fetchStageDetail(stageName);
  }, [fetchStageDetail]);

  const handleCloseDetail = useCallback(() => {
    setSelectedStage(null);
    setDetailData(null);
  }, []);

  const stagesData = useMemo(() => {
    const counts = FUNNEL_STAGES.map(s => leadCounts[s] || 0);
    const maxSqrt = Math.max(...counts.map(c => Math.sqrt(c)), 1);

    return FUNNEL_STAGES.map((stageName, index) => {
      const count = counts[index];
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const heightRatio = maxSqrt > 0 ? Math.sqrt(count) / maxSqrt : 0;
      const barHeight = count > 0
        ? Math.max(heightRatio * CHART_HEIGHT, MIN_BAR_HEIGHT)
        : 20;

      return { name: stageName, count, percentage, barHeight };
    });
  }, [leadCounts, total]);


  if (loading && Object.keys(leadCounts).length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-16 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1717AF] animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando embudo...</p>
      </div>
    );
  }

  if (selectedStage) {
    const stageIdx = FUNNEL_STAGES.indexOf(selectedStage);
    const colors = getColor(stageIdx, FUNNEL_STAGES.length);

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        {/* Detail Header */}
        <div className="p-6 pb-4">
          <button
            onClick={handleCloseDetail}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1717AF] transition-colors mb-4 group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al embudo</span>
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: `linear-gradient(135deg, ${colors.light}, ${colors.base})` }}
            >
              <span className="text-white font-bold text-lg">{stageIdx + 1}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800">{selectedStage}</h3>
              <p className="text-sm text-slate-500">
                Detalle de performance por comercial en esta etapa
              </p>
            </div>
          </div>
        </div>

        {loadingDetail ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#1717AF] animate-spin mb-3" />
            <p className="text-sm text-slate-500">Calculando métricas...</p>
          </div>
        ) : detailData ? (
          <div className="px-6 pb-6">
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KpiCard
                icon={<Users size={16} />}
                label="Total en etapa"
                value={detailData.kpis.total}
                color="slate"
              />
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Avanzan"
                value={`${detailData.kpis.tasaAvance.toFixed(1)}%`}
                subtitle={`${detailData.kpis.avanzaron} de ${detailData.kpis.total}`}
                color="emerald"
              />
              <KpiCard
                icon={<MessageSquare size={16} />}
                label="Con seguimiento"
                value={detailData.kpis.total > 0 ? `${detailData.kpis.conSeguimiento} — ${((detailData.kpis.conSeguimiento / detailData.kpis.total) * 100).toFixed(1)}%` : '0'}
                color="blue"
              />
              <KpiCard
                icon={<AlertTriangle size={16} />}
                label="Sin seguimiento"
                value={detailData.kpis.total > 0 ? `${detailData.kpis.sinSeguimiento} — ${((detailData.kpis.sinSeguimiento / detailData.kpis.total) * 100).toFixed(1)}%` : '0'}
                color="amber"
              />
            </div>

            {/* Comparison Table */}
            {detailData.columns.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Column Headers */}
                <div className={`grid gap-0 ${
                  detailData.columns.length === 3 ? 'grid-cols-[200px_1fr_1fr_1fr]' :
                  detailData.columns.length === 2 ? 'grid-cols-[200px_1fr_1fr]' :
                  'grid-cols-[200px_1fr]'
                }`}>
                  <div className="bg-slate-50 border-b border-r border-slate-200 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Métrica</span>
                  </div>
                  {detailData.columns.map((col) => (
                    <div
                      key={col.type}
                      className={`border-b border-slate-200 px-4 py-3 text-center ${
                        col.type === 'selected' ? 'bg-[#02214A]/5' :
                        col.type === 'top' ? 'bg-emerald-50/50' :
                        'bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {col.type === 'top' && <Trophy size={13} className="text-emerald-500" />}
                        {col.type === 'low' && <AlertTriangle size={13} className="text-rose-400" />}
                        <span className={`text-sm font-semibold ${
                          col.type === 'selected' ? 'text-[#02214A]' :
                          col.type === 'top' ? 'text-emerald-700' :
                          'text-rose-600'
                        }`}>{col.label}</span>
                      </div>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${
                        col.type === 'selected' ? 'text-slate-400' :
                        col.type === 'top' ? 'text-emerald-500' :
                        'text-rose-400'
                      }`}>
                        {col.type === 'selected' ? 'Seleccionado' :
                         col.type === 'top' ? 'Top Performance' : 'Low Performance'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metric Rows */}
                <MetricRow
                  label="Total leads"
                  columns={detailData.columns}
                  getValue={(d) => d.total}
                />
                <MetricRow
                  label="Avanzan de etapa"
                  columns={detailData.columns}
                  getValue={(d) => `${d.avanzaron} (${d.tasaAvance.toFixed(1)}%)`}
                  highlight
                />
                <MetricRow
                  label="Tiempo promedio de avance"
                  columns={detailData.columns}
                  getValue={(d) => formatDuration(d.tiempoPromedioAvance)}
                />
                <MetricRow
                  label="Con seguimiento"
                  columns={detailData.columns}
                  getValue={(d) => d.total > 0 ? `${d.conSeguimiento} (${((d.conSeguimiento / d.total) * 100).toFixed(1)}%)` : '0'}
                />
                <MetricRow
                  label="Sin seguimiento"
                  columns={detailData.columns}
                  getValue={(d) => d.total > 0 ? `${d.sinSeguimiento} (${((d.sinSeguimiento / d.total) * 100).toFixed(1)}%)` : '0'}
                />
                <MetricRow
                  label="Prom. seguimientos (avanzan)"
                  columns={detailData.columns}
                  getValue={(d) => d.promedioSeguimientosAvanzan > 0 ? d.promedioSeguimientosAvanzan.toFixed(1) : '—'}
                />
                <MetricRow
                  label="Prom. seguimientos (no avanzan)"
                  columns={detailData.columns}
                  getValue={(d) => d.promedioSeguimientosNoAvanzan > 0 ? d.promedioSeguimientosNoAvanzan.toFixed(1) : '—'}
                />
                <MetricRow
                  label="Tiempo entre seguimientos (avanzan)"
                  columns={detailData.columns}
                  getValue={(d) => formatDuration(d.tiempoPromedioSeguimientoAvanzan)}
                  isLast
                />
                <MetricRow
                  label="Tiempo entre seguimientos (no avanzan)"
                  columns={detailData.columns}
                  getValue={(d) => formatDuration(d.tiempoPromedioSeguimientoNoAvanzan)}
                  isLast
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users size={32} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No hay datos de comerciales para esta etapa</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#02214A]/10 to-[#1717AF]/10 flex items-center justify-center shadow-sm">
              <TrendingDown className="w-5 h-5 text-[#1717AF]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Embudo de Conversión</h3>
              <p className="text-sm text-slate-500">Distribución de leads por etapa del proceso</p>
            </div>
          </div>
        </div>

        {/* KPI Boxes */}
        <div className="grid grid-cols-7 gap-2">
          <HeaderKpi
            label="Total leads"
            value={total.toLocaleString()}
            color="slate"
            tooltip="Leads totales en el embudo"
          />
          <HeaderKpi
            label="Win Rate"
            value={headerKpis != null ? `${headerKpis.winRate} - ${total > 0 ? ((headerKpis.winRate / total) * 100).toFixed(1) : 0}%` : '—'}
            color="blue"
            icon={<Trophy size={10} className="text-blue-400" />}
            tooltip="Matrículas cerradas"
          />
          <HeaderKpi
            label="Top Win Rate"
            value={headerKpis?.topWin != null ? `${headerKpis.topWin.count} - ${total > 0 ? ((headerKpis.topWin.count / total) * 100).toFixed(1) : 0}%` : '—'}
            subtitle={headerKpis?.topWin?.nombre}
            color="emerald"
            icon={<Trophy size={10} className="text-emerald-400" />}
            tooltip="Comercial con más matrículas"
          />
          <HeaderKpi
            label="Low Win Rate"
            value={headerKpis?.lowWin != null ? `${headerKpis.lowWin.count} - ${total > 0 ? ((headerKpis.lowWin.count / total) * 100).toFixed(1) : 0}%` : '—'}
            subtitle={headerKpis?.lowWin?.nombre}
            color="rose"
            icon={<AlertTriangle size={10} className="text-rose-400" />}
            tooltip="Comercial con menos matrículas"
          />
          <HeaderKpi
            label="Time to Conv."
            value={headerKpis ? formatDuration(headerKpis.timeToConversion) : '—'}
            color="blue"
            icon={<Clock size={10} className="text-blue-400" />}
            tooltip="Tiempo promedio hasta matrícula"
          />
          <HeaderKpi
            label="Top Time Conv."
            value={headerKpis?.topTime ? formatDuration(headerKpis.topTime.time) : '—'}
            subtitle={headerKpis?.topTime?.nombre}
            color="emerald"
            icon={<Trophy size={10} className="text-emerald-400" />}
            tooltip="Comercial que convierte más rápido"
          />
          <HeaderKpi
            label="Low Time Conv."
            value={headerKpis?.lowTime ? formatDuration(headerKpis.lowTime.time) : '—'}
            subtitle={headerKpis?.lowTime?.nombre}
            color="rose"
            icon={<AlertTriangle size={10} className="text-rose-400" />}
            tooltip="Comercial que más tarda en convertir"
          />
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="p-6 pt-8 overflow-x-auto">
        <div
          className="flex items-end gap-[3px] min-w-[860px]"
          style={{ height: CHART_HEIGHT + 50 }}
        >
          {stagesData.map((stage, index) => {
            const isHovered = hoveredIndex === index;
            const colors = getColor(index, stagesData.length);

            return (
              <div
                key={stage.name}
                className="flex-1 flex flex-col items-center"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                <div className={`mb-2 transition-all duration-200 ${isHovered ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-0'}`}>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-white whitespace-nowrap shadow-lg">
                    {stage.percentage.toFixed(1)}% — {stage.count.toLocaleString()} leads
                  </span>
                </div>

                {/* Bar */}
                <div
                  className={`w-full relative overflow-hidden transition-all duration-500 ease-out ${stage.name !== 'Matrícula' ? 'cursor-pointer' : ''}`}
                  style={{
                    height: `${stage.barHeight}px`,
                    background: `linear-gradient(to bottom, ${colors.light}, ${colors.base})`,
                    borderRadius: '8px 8px 2px 2px',
                    transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                    boxShadow: isHovered
                      ? `0 -8px 24px ${colors.base}30, 0 0 0 2px ${colors.base}20`
                      : `0 1px 3px ${colors.base}15`,
                  }}
                  onClick={() => stage.name !== 'Matrícula' && handleOpenDetail(stage.name)}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)'
                    }}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-1 z-10">
                    {stage.barHeight >= 70 ? (
                      <>
                        <span className="text-lg font-bold leading-none tabular-nums drop-shadow-sm">
                          {stage.percentage.toFixed(1)}%
                        </span>
                        <span className="text-[11px] opacity-70 font-medium mt-1.5 tabular-nums">
                          {stage.count.toLocaleString()}
                        </span>
                      </>
                    ) : stage.barHeight >= MIN_BAR_HEIGHT ? (
                      <span className="text-xs font-bold tabular-nums drop-shadow-sm">
                        {stage.percentage.toFixed(1)}% · {stage.count.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold tabular-nums opacity-80">
                        {stage.count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage name + Ver más */}
                <div className="mt-3 text-center flex flex-col items-center px-0.5 w-full">
                  <span className={`text-[10px] leading-tight font-medium transition-colors duration-200 whitespace-nowrap ${
                    isHovered ? 'text-[#1717AF]' : 'text-slate-500'
                  }`}>
                    {stage.name}
                  </span>
                  {stage.name !== 'Matrícula' ? (
                    <button
                      onClick={() => handleOpenDetail(stage.name)}
                      className="text-[10px] text-[#1717AF]/60 hover:text-[#1717AF] font-medium mt-1 transition-colors"
                    >
                      Ver más
                    </button>
                  ) : (
                    <span className="text-[10px] mt-1 invisible">Ver más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow indicator */}
      <div className="px-6 pb-5">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-[11px] font-medium whitespace-nowrap">Primer contacto</span>
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 border-t border-dashed border-slate-200" />
            <ArrowRight size={12} className="text-slate-300 shrink-0" />
            <div className="flex-1 border-t border-dashed border-slate-200" />
            <ArrowRight size={12} className="text-slate-300 shrink-0" />
            <div className="flex-1 border-t border-dashed border-slate-200" />
          </div>
          <span className="text-[11px] font-medium whitespace-nowrap text-emerald-500">Conversión</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, subtitle, color }) {
  const colorClasses = {
    slate: { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  };
  const c = colorClasses[color] || colorClasses.slate;

  return (
    <div className={`${c.bg} rounded-xl border ${c.border} p-4`}>
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <div className="text-xl font-bold text-slate-800 tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</div>
      {subtitle && <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function HeaderKpi({ label, value, subtitle, color, icon, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colorClasses = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-[#02214A]' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600' },
  };
  const c = colorClasses[color] || colorClasses.slate;

  return (
    <div
      className={`${c.bg} rounded-xl border ${c.border} px-3 py-2.5 min-w-0 relative`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {tooltip && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 pointer-events-none">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-white whitespace-nowrap shadow-lg">
            {tooltip}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 font-medium truncate">{label}</span>
      </div>
      <div className={`text-lg font-bold ${c.text} tabular-nums leading-tight`}>{value}</div>
      {subtitle ? (
        <div className="text-[10px] text-slate-400 truncate mt-0.5">{subtitle}</div>
      ) : (
        <div className="text-[10px] mt-0.5">&nbsp;</div>
      )}
    </div>
  );
}

function MetricRow({ label, columns, getValue, highlight, isLast }) {
  const gridCols = columns.length === 3
    ? 'grid-cols-[200px_1fr_1fr_1fr]'
    : columns.length === 2
    ? 'grid-cols-[200px_1fr_1fr]'
    : 'grid-cols-[200px_1fr]';

  return (
    <div className={`grid gap-0 ${gridCols} ${!isLast ? 'border-b border-slate-100' : ''} ${highlight ? 'bg-slate-50/50' : ''}`}>
      <div className="px-4 py-3 border-r border-slate-200 flex items-center">
        <span className={`text-xs ${highlight ? 'font-semibold text-slate-700' : 'text-slate-600'}`}>{label}</span>
      </div>
      {columns.map((col) => (
        <div
          key={col.type}
          className={`px-4 py-3 text-center flex items-center justify-center ${
            col.type === 'selected' ? 'bg-[#02214A]/[0.02]' :
            col.type === 'top' ? 'bg-emerald-50/30' :
            'bg-rose-50/30'
          }`}
        >
          <span className={`text-sm tabular-nums ${highlight ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
            {getValue(col.data)}
          </span>
        </div>
      ))}
    </div>
  );
}
