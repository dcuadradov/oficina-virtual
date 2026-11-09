import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import DashboardFilters from '../DashboardFilters';
import InformeFacetFilters from '../Informe/InformeFacetFilters';
import {
  etiquetaMes,
  etiquetaRangoComercial,
  facetasCruzadas,
  getCurrentMonthKey,
  indexMonthConfigs,
  parseInformeDates,
  rowMatchesInformeDims,
} from '../Informe/informeFiltros';
import ContactoCanalBars from './ContactoCanalBars';
import ContactoHeatmap from './ContactoHeatmap';
import ContactoKpis from './ContactoKpis';
import ContactoLeadList from './ContactoLeadList';
import {
  CANAL_LLAMADA,
  CANAL_MENSAJE,
  celdasHeatmap,
  conteoCanal,
  cubetasIntensidad,
  diariosDesdeIntentos,
  esContestacion,
  esEfectiva,
  esNoContesto,
  filtraIntentosHeatmap,
  kpisContacto,
  pct,
  rankingComerciales,
  consolidarPorPersonaCanal,
} from './contactoReglas';

const PAGE_SIZE = 1000;
const LEAD_IN_SIZE = 100;

function fechaColombiaHoy(now = new Date()) {
  const local = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchPaged(buildQuery) {
  const pages = [];
  let from = 0;
  let keep = true;
  while (keep) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    pages.push(data || []);
    if (!data || data.length < PAGE_SIZE) keep = false;
    else from += PAGE_SIZE;
  }
  return pages.flat();
}

async function fetchLeadsByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const rows = [];
  for (let i = 0; i < unique.length; i += LEAD_IN_SIZE) {
    const chunk = unique.slice(i, i + LEAD_IN_SIZE);
    const { data, error } = await supabase
      .from('leads')
      .select('card_id, nombre, pais, ocupacion, label, fuente_dato, sexo, edad')
      .in('card_id', chunk);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

function nombreComercial(email, comerciales) {
  const hit = comerciales.find((c) => c.email === email);
  return hit?.nombre || email?.split('@')[0] || email || 'Sin autor';
}

export default function Contacto({
  monthConfigs,
  onSaveMonthConfig,
  comerciales = [],
  onRefreshComerciales,
  puedeVerTodos,
  userEmail,
  onOpenLead,
}) {
  const [selectedMes, setSelectedMes] = useState(getCurrentMonthKey);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [selectedDia, setSelectedDia] = useState(null);
  const [selectedPais, setSelectedPais] = useState([]);
  const [selectedComercial, setSelectedComercial] = useState(null);
  const [selectedOcupacion, setSelectedOcupacion] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState([]);
  const [selectedFuente, setSelectedFuente] = useState([]);
  const [selectedSexo, setSelectedSexo] = useState([]);
  const [selectedEdad, setSelectedEdad] = useState([]);
  const [fetchedConfigs, setFetchedConfigs] = useState(null);
  const [intentosRaw, setIntentosRaw] = useState([]);
  const [leadMap, setLeadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pestanaHeatmap, setPestanaHeatmap] = useState('contestaron');
  const [canalHeatmap, setCanalHeatmap] = useState('llamada');
  const [lista, setLista] = useState(null);

  const dimSelections = useMemo(() => ({
    pais: selectedPais,
    ocupacion: selectedOcupacion,
    label: selectedLabel,
    fuente_dato: selectedFuente,
    sexo: selectedSexo,
    edad: selectedEdad,
  }), [selectedPais, selectedOcupacion, selectedLabel, selectedFuente, selectedSexo, selectedEdad]);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      const { data, error } = await supabase
        .from('config_meses')
        .select('mes, fecha_inicio, fecha_fin');
      if (cancelled) return;
      if (error) {
        console.error('Error cargando config_meses de Contacto:', error.message);
        setFetchedConfigs({});
        return;
      }
      setFetchedConfigs(indexMonthConfigs(data));
    };
    cargar();
    return () => { cancelled = true; };
  }, []);

  const configsMes = useMemo(
    () => ({ ...fetchedConfigs, ...indexMonthConfigs(monthConfigs) }),
    [fetchedConfigs, monthConfigs],
  );
  const configsListos = fetchedConfigs !== null
    || Object.keys(indexMonthConfigs(monthConfigs)).length > 0;

  const rango = useMemo(() => {
    if (selectedMes && !selectedDia && !selectedPeriodo && !configsListos) {
      return { fechaInicio: null, fechaFin: null, startDateLocal: null, endDateLocal: null };
    }
    return parseInformeDates({
      selectedDia,
      selectedPeriodo,
      selectedMes,
      monthConfigs: configsMes,
    });
  }, [selectedDia, selectedPeriodo, selectedMes, configsMes, configsListos]);
  const rangoEtiqueta = etiquetaRangoComercial(rango);

  const autorFiltro = !puedeVerTodos ? userEmail : selectedComercial;

  const fetchDatos = useCallback(async () => {
    if (selectedMes && !selectedDia && !selectedPeriodo && !configsListos) return;
    const { startDateLocal, endDateLocal } = parseInformeDates({
      selectedDia, selectedPeriodo, selectedMes, monthConfigs: configsMes,
    });
    if (!startDateLocal || !endDateLocal) return;
    if (!puedeVerTodos && !userEmail) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const hoy = fechaColombiaHoy();
      if (startDateLocal <= hoy && endDateLocal >= hoy) {
        const { error: rpcError } = await supabase.rpc('fn_contacto_materializar', {
          p_desde: hoy,
          p_hasta: hoy,
        });
        if (rpcError) {
          console.warn('[Contacto] no se pudo materializar hoy:', rpcError.message);
        }
      }

      const intentos = await fetchPaged((from, to) => {
        let q = supabase
          .from('contacto_intento')
          .select('fecha, hora, dia_semana, lead_id, seguimiento_id, canal, resultado, autor_email')
          .gte('fecha', startDateLocal)
          .lte('fecha', endDateLocal)
          .order('fecha', { ascending: true })
          .range(from, to);
        if (autorFiltro) q = q.eq('autor_email', autorFiltro);
        return q;
      });

      const leads = await fetchLeadsByIds(intentos.map((i) => i.lead_id));
      const map = {};
      leads.forEach((lead) => { map[lead.card_id] = lead; });
      setLeadMap(map);
      setIntentosRaw(intentos);
    } catch (error) {
      console.error('Error cargando Contacto:', error.message);
      setErrorMsg(error.message);
      setIntentosRaw([]);
      setLeadMap({});
    } finally {
      setLoading(false);
    }
  }, [selectedDia, selectedPeriodo, selectedMes, configsMes, configsListos, autorFiltro, puedeVerTodos, userEmail]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  const facetRows = useMemo(
    () => [...new Set(intentosRaw.map((i) => i.lead_id))]
      .map((id) => leadMap[id])
      .filter(Boolean),
    [intentosRaw, leadMap],
  );

  const paisesDisponibles = useMemo(
    () => facetasCruzadas(facetRows, dimSelections, 'pais')
      .map(({ value, count }) => ({ pais: value, count })),
    [facetRows, dimSelections],
  );

  const facetOptions = useMemo(() => ({
    ocupacion: facetasCruzadas(facetRows, dimSelections, 'ocupacion'),
    label: facetasCruzadas(facetRows, dimSelections, 'label'),
    fuente_dato: facetasCruzadas(facetRows, dimSelections, 'fuente_dato'),
    sexo: facetasCruzadas(facetRows, dimSelections, 'sexo'),
    edad: facetasCruzadas(facetRows, dimSelections, 'edad'),
  }), [facetRows, dimSelections]);

  const intentos = useMemo(() => intentosRaw.filter((intento) => {
    const lead = leadMap[intento.lead_id];
    if (!lead) {
      return !selectedPais.length
        && !selectedOcupacion.length
        && !selectedLabel.length
        && !selectedFuente.length
        && !selectedSexo.length
        && !selectedEdad.length;
    }
    return rowMatchesInformeDims(lead, dimSelections);
  }), [intentosRaw, leadMap, dimSelections, selectedPais, selectedOcupacion, selectedLabel, selectedFuente, selectedSexo, selectedEdad]);

  const diarios = useMemo(() => diariosDesdeIntentos(intentos), [intentos]);
  const kpis = useMemo(() => kpisContacto(diarios, intentos), [diarios, intentos]);
  const barraLlamada = useMemo(() => conteoCanal(diarios, CANAL_LLAMADA), [diarios]);
  const barraMensaje = useMemo(() => conteoCanal(diarios, CANAL_MENSAJE), [diarios]);
  const cubetas = useMemo(() => cubetasIntensidad(intentos), [intentos]);
  const heatmap = useMemo(
    () => celdasHeatmap(intentos, { pestana: pestanaHeatmap, canal: canalHeatmap }),
    [intentos, pestanaHeatmap, canalHeatmap],
  );
  const ranking = useMemo(
    () => rankingComerciales(intentos, comerciales),
    [intentos, comerciales],
  );

  const handleMesChange = (mes) => {
    setSelectedMes(mes);
    setSelectedPeriodo(null);
    setSelectedDia(null);
  };
  const handlePeriodoChange = (periodo) => {
    setSelectedPeriodo(periodo);
    setSelectedMes(null);
    setSelectedDia(null);
  };
  const handleDiaChange = (dia) => {
    setSelectedDia(dia);
    setSelectedMes(null);
    setSelectedPeriodo(null);
  };

  const filasDesdeLeads = (leadIds, extraByLead = {}) => {
    const unique = [...new Set(leadIds)];
    return unique.map((id) => {
      const lead = leadMap[id];
      const extra = extraByLead[id] || {};
      return {
        lead_id: id,
        nombre: lead?.nombre || id,
        autor_email: extra.autor_email,
        autorNombre: nombreComercial(extra.autor_email, comerciales),
        hora: extra.hora,
        fecha: extra.fecha,
        resultado: extra.resultado,
      };
    });
  };

  const abrirSegmento = (canal, segmento) => {
    const consolidado = consolidarPorPersonaCanal(diarios).filter((row) => row.canal === canal);
    const match = consolidado.filter((row) => {
      if (segmento === 'no') return esNoContesto(row.resultado);
      if (segmento === 'contesto') return row.resultado === 'LC.' || row.resultado === 'MC.';
      return esEfectiva(row.resultado);
    });
    const extra = {};
    match.forEach((row) => { extra[row.lead_id] = row; });
    const tituloCanal = canal === CANAL_LLAMADA ? 'Llamadas' : 'WhatsApp';
    const tituloSeg = segmento === 'no' ? 'No contestaron' : segmento === 'contesto' ? 'Contestaron' : 'Efectivas';
    setLista({
      titulo: `${tituloSeg} · ${tituloCanal}`,
      filas: filasDesdeLeads(match.map((row) => row.lead_id), extra),
    });
  };

  const abrirCubeta = (cubeta) => {
    const min = cubeta.id === '3+' ? 3 : Number(cubeta.id);
    const max = cubeta.id === '3+' ? Infinity : min;
    const people = new Map();
    const porDia = new Map();
    for (const intento of intentos) {
      const key = `${intento.fecha}|${intento.lead_id}`;
      if (!porDia.has(key)) porDia.set(key, new Set());
      if (intento.seguimiento_id) porDia.get(key).add(intento.seguimiento_id);
    }
    for (const [key, segs] of porDia.entries()) {
      const n = segs.size;
      if (n < min || n > max) continue;
      const leadId = key.split('|')[1];
      people.set(leadId, { lead_id: leadId, seguimientos: n });
    }
    setLista({
      titulo: cubeta.label,
      filas: filasDesdeLeads([...people.keys()]),
    });
  };

  const abrirCelda = (cell) => {
    const extra = {};
    const deCelda = filtraIntentosHeatmap(intentos, {
      pestana: pestanaHeatmap,
      canal: canalHeatmap,
    }).filter((intento) => {
      const hora = Math.min(21, Math.max(7, Number(intento.hora)));
      return Number(intento.dia_semana) === cell.dia && hora === cell.hora;
    });
    deCelda.forEach((intento) => { extra[intento.lead_id] = intento; });
    const dia = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][cell.dia];
    setLista({
      titulo: `${dia} ${cell.hora}:00`,
      filas: filasDesdeLeads(deCelda.map((i) => i.lead_id), extra),
    });
  };

  const handleFacetChange = (key, next) => {
    if (key === 'ocupacion') setSelectedOcupacion(next);
    else if (key === 'label') setSelectedLabel(next);
    else if (key === 'fuente_dato') setSelectedFuente(next);
    else if (key === 'sexo') setSelectedSexo(next);
    else if (key === 'edad') setSelectedEdad(next);
  };

  const vacio = !loading && kpis.personas === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Contacto</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Personas, no intentos. Gana el resultado más cerca del agendamiento.
          {rangoEtiqueta && selectedMes && !selectedDia && !selectedPeriodo
            ? ` ${etiquetaMes(selectedMes)} cuenta ${rangoEtiqueta}.`
            : ''}
        </p>
      </div>

      <DashboardFilters
        comerciales={comerciales}
        selectedComercial={selectedComercial}
        onComercialChange={setSelectedComercial}
        selectedMes={selectedMes}
        onMesChange={handleMesChange}
        selectedPeriodo={selectedPeriodo}
        onPeriodoChange={handlePeriodoChange}
        selectedDia={selectedDia}
        onDiaChange={handleDiaChange}
        selectedPais={selectedPais}
        onPaisChange={setSelectedPais}
        paises={paisesDisponibles}
        showPaisFilter
        showComercialFilter={puedeVerTodos}
        showSearch={false}
        showTagFilter={false}
        showFuenteFilter={false}
        showReferidoFilter={false}
        showGestionWAFilter={false}
        showDateFilterToggle={false}
        puedeVerTodos={puedeVerTodos}
        monthConfigs={configsMes}
        onSaveMonthConfig={onSaveMonthConfig}
        onRefreshComerciales={onRefreshComerciales}
      >
        <InformeFacetFilters
          value={{
            ocupacion: selectedOcupacion,
            label: selectedLabel,
            fuente_dato: selectedFuente,
            sexo: selectedSexo,
            edad: selectedEdad,
          }}
          options={facetOptions}
          onChange={handleFacetChange}
        />
      </DashboardFilters>

      {errorMsg && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">
          No se pudieron cargar los contactos. ¿Corriste la migración en Supabase? {errorMsg}
        </p>
      )}

      <ContactoKpis kpis={kpis} loading={loading} />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 size={18} className="animate-spin" /> Cargando contactación…
        </div>
      ) : vacio ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-sm text-slate-400">
          No hay contactos con resultado en este rango. Las siglas empiezan el 4 nov 2026.
        </div>
      ) : (
        <>
          <ContactoCanalBars
            llamada={barraLlamada}
            mensaje={barraMensaje}
            onSegmento={abrirSegmento}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cubetas.map((cubeta) => (
              <button
                key={cubeta.id}
                type="button"
                onClick={() => abrirCubeta(cubeta)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-[#1717AF]/30"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {cubeta.label}
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">{pct(cubeta.pctContestacion)}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {cubeta.contestaron.toLocaleString('es-CO')} de {cubeta.personasDia.toLocaleString('es-CO')} contestaron
                </p>
              </button>
            ))}
          </div>

          <ContactoHeatmap
            celdas={heatmap}
            pestana={pestanaHeatmap}
            canal={canalHeatmap}
            onPestana={setPestanaHeatmap}
            onCanal={setCanalHeatmap}
            onCelda={abrirCelda}
          />

          {puedeVerTodos && !selectedComercial && ranking.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Por quien contactó</h3>
                <p className="text-xs text-slate-400 mt-0.5">Clic elige a esa persona en el filtro.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 text-left">
                      <th className="px-5 py-2 font-medium">Comercial</th>
                      <th className="px-3 py-2 font-medium text-right">Personas</th>
                      <th className="px-3 py-2 font-medium text-right">Contestación</th>
                      <th className="px-3 py-2 font-medium text-right">Efectividad</th>
                      <th className="px-5 py-2 font-medium text-right">Agendamientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row) => (
                      <tr key={row.email}>
                        <td className="px-5 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedComercial(row.email)}
                            className="font-medium text-slate-800 hover:text-[#1717AF]"
                          >
                            {row.nombre}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.personas.toLocaleString('es-CO')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(row.pctContestacion)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(row.pctEfectividad)}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{row.agendamientos.toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {lista && (
        <ContactoLeadList
          titulo={lista.titulo}
          filas={lista.filas}
          onClose={() => setLista(null)}
          onOpenLead={onOpenLead}
        />
      )}
    </div>
  );
}
