import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import DashboardFilters from '../DashboardFilters';
import Slot01_LeadsCreadosMes from './slots/Slot01_LeadsCreadosMes';
import Slot02_FuentesLeads from './slots/Slot02_FuentesLeads';
import Slot03_AsignacionLeads from './slots/Slot03_AsignacionLeads';
import InformePaisFunnel from './InformePaisFunnel';
import Slot05_LeadsPorOcupacion from './slots/Slot05_LeadsPorOcupacion';
import Slot06_MatriculasMes from './slots/Slot06_MatriculasMes';
import Slot07_MatriculasPorOcupacion from './slots/Slot07_MatriculasPorOcupacion';
import InformeFacetFilters from './InformeFacetFilters';
import {
  applyLeadFilters,
  etiquetaMes,
  etiquetaRangoComercial,
  facetasCruzadas,
  getCurrentMonthKey,
  indexMonthConfigs,
  parseInformeDates,
} from './informeFiltros';

export default function Informe({
  monthConfigs,
  onSaveMonthConfig,
  comerciales = [],
  onRefreshComerciales,
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
  const [dateFilterField, setDateFilterField] = useState('created_at');
  const [facetRows, setFacetRows] = useState([]);
  const [fetchedConfigs, setFetchedConfigs] = useState(null);

  const dimSelections = useMemo(() => ({
    pais: selectedPais,
    ocupacion: selectedOcupacion,
    label: selectedLabel,
    fuente_dato: selectedFuente,
    sexo: selectedSexo,
    edad: selectedEdad,
  }), [selectedPais, selectedOcupacion, selectedLabel, selectedFuente, selectedSexo, selectedEdad]);

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

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      const { data, error } = await supabase
        .from('config_meses')
        .select('mes, fecha_inicio, fecha_fin');
      if (cancelled) return;
      if (error) {
        console.error('Error cargando config_meses del informe:', error.message);
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

  const filtros = useMemo(() => ({
    fechaInicio: rango.fechaInicio,
    fechaFin: rango.fechaFin,
    dateField: dateFilterField,
    selectedPais,
    selectedComercial,
    selectedOcupacion,
    selectedLabel,
    selectedFuente,
    selectedSexo,
    selectedEdad,
  }), [rango, dateFilterField, selectedPais, selectedComercial, selectedOcupacion, selectedLabel, selectedFuente, selectedSexo, selectedEdad]);

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

  const fetchFacetas = useCallback(async () => {
    try {
      if (selectedMes && !selectedDia && !selectedPeriodo && !configsListos) return;
      const { fechaInicio, fechaFin } = parseInformeDates({
        selectedDia, selectedPeriodo, selectedMes, monthConfigs: configsMes,
      });
      const pages = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let keep = true;
      while (keep) {
        const q = applyLeadFilters(
          supabase.from('leads').select('pais, ocupacion, label, fuente_dato, sexo, edad')
            .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null'),
          {
            fechaInicio,
            fechaFin,
            dateField: dateFilterField,
            selectedComercial,
          },
        );
        const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        pages.push(data || []);
        if (!data || data.length < PAGE_SIZE) keep = false;
        else from += PAGE_SIZE;
      }
      setFacetRows(pages.flat());
    } catch (error) {
      console.error('Error cargando facetas del informe:', error);
    }
  }, [selectedDia, selectedPeriodo, selectedMes, configsMes, configsListos, dateFilterField, selectedComercial]);

  useEffect(() => {
    fetchFacetas();
  }, [fetchFacetas]);

  const handleFacetChange = (key, next) => {
    if (key === 'ocupacion') setSelectedOcupacion(next);
    else if (key === 'label') setSelectedLabel(next);
    else if (key === 'fuente_dato') setSelectedFuente(next);
    else if (key === 'sexo') setSelectedSexo(next);
    else if (key === 'edad') setSelectedEdad(next);
  };

  const slotProps = { rango, filtros, selectedMes, monthConfigs: configsMes };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Informe</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {rangoEtiqueta && selectedMes && !selectedDia && !selectedPeriodo
            ? `${etiquetaMes(selectedMes)} cuenta ${rangoEtiqueta}. Es el rango comercial de Gestión, no el mes calendario.`
            : 'Los tiempos usan la misma configuración de mes, periodo y día que Gestión.'}
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
        showComercialFilter
        showSearch={false}
        showTagFilter={false}
        showFuenteFilter={false}
        showReferidoFilter={false}
        showGestionWAFilter={false}
        dateFilterField={dateFilterField}
        onDateFilterFieldChange={setDateFilterField}
        puedeVerTodos
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

      <Slot01_LeadsCreadosMes {...slotProps} />
      <Slot02_FuentesLeads {...slotProps} />
      <Slot03_AsignacionLeads {...slotProps} />
      <InformePaisFunnel {...slotProps} />
      <Slot05_LeadsPorOcupacion {...slotProps} />
      <Slot06_MatriculasMes {...slotProps} />
      <Slot07_MatriculasPorOcupacion {...slotProps} />
    </div>
  );
}
