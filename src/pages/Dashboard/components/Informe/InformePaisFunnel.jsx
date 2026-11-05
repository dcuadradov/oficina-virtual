import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { applyLeadFilters, rangoTodosLosMeses } from './informeFiltros';
import {
  agregarPorPaisYDia,
  agregarPorPaisYMes,
  buildDayList,
  buildMonthList,
  ETAPAS_DESCARTADO,
  ETAPAS_GESTIONANDO,
  ETAPAS_MATRICULA,
  ETAPAS_SIN_CONTACTO,
  filtrarPorEtapas,
} from './paisPorDia';
import PaisPorDiaChart from './PaisPorDiaChart';
import SlotFasePorPais from './slots/SlotFasePorPais';

const PAGE_SIZE = 1000;

async function fetchLeadsPais(filtros, dateField, cancelled) {
  const acc = [];
  let from = 0;
  let keep = true;
  while (keep && !cancelled()) {
    const q = applyLeadFilters(
      supabase.from('leads').select(`pais, ${dateField}, etapa_funnel`)
        .or('etapa_funnel.neq.No mostrar,etapa_funnel.is.null'),
      filtros,
    );
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    acc.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) keep = false;
    from += PAGE_SIZE;
  }
  return acc;
}

function seriesDesdeLeads(rows, dateField, etapas, agregar) {
  const filtered = etapas ? filtrarPorEtapas(rows, etapas) : rows;
  return agregar(filtered, dateField);
}

export default function InformePaisFunnel({ rango, filtros = {} }) {
  const [leadsRows, setLeadsRows] = useState([]);
  const [leadsMomRows, setLeadsMomRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMom, setLoadingMom] = useState(false);
  const [vistaPais, setVistaPais] = useState('periodo');
  const dateField = filtros.dateField === 'updated_at' ? 'updated_at' : 'created_at';
  const momRango = useMemo(() => rangoTodosLosMeses(), []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const cargar = async () => {
      setLoading(Boolean(rango?.fechaInicio));
      setLoadingMom(true);
      try {
        const filtrosMom = {
          ...filtros,
          fechaInicio: momRango.fechaInicio,
          fechaFin: momRango.fechaFin,
        };
        const periodoPromise = rango?.fechaInicio
          ? fetchLeadsPais(filtros, dateField, isCancelled)
          : Promise.resolve([]);
        const [periodo, mom] = await Promise.all([
          periodoPromise,
          fetchLeadsPais(filtrosMom, dateField, isCancelled),
        ]);
        if (cancelled) return;
        setLeadsRows(periodo);
        setLeadsMomRows(mom);
      } catch (err) {
        console.error('[InformePaisFunnel] error cargando leads:', err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMom(false);
        }
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [rango, filtros, dateField, momRango]);

  const days = useMemo(
    () => (rango ? buildDayList(rango.startDateLocal, rango.endDateLocal) : []),
    [rango],
  );
  const months = useMemo(
    () => buildMonthList(momRango.startYm, momRango.endYm),
    [momRango],
  );

  const leadsAgg = useMemo(
    () => agregarPorPaisYDia(leadsRows, dateField),
    [leadsRows, dateField],
  );
  const sinContactoAgg = useMemo(
    () => seriesDesdeLeads(leadsRows, dateField, ETAPAS_SIN_CONTACTO, agregarPorPaisYDia),
    [leadsRows, dateField],
  );
  const gestionandoAgg = useMemo(
    () => seriesDesdeLeads(leadsRows, dateField, ETAPAS_GESTIONANDO, agregarPorPaisYDia),
    [leadsRows, dateField],
  );
  const matriculaAgg = useMemo(
    () => seriesDesdeLeads(leadsRows, dateField, ETAPAS_MATRICULA, agregarPorPaisYDia),
    [leadsRows, dateField],
  );
  const descartadosAgg = useMemo(
    () => seriesDesdeLeads(leadsRows, dateField, ETAPAS_DESCARTADO, agregarPorPaisYDia),
    [leadsRows, dateField],
  );

  const leadsMomAgg = useMemo(
    () => agregarPorPaisYMes(leadsMomRows, dateField),
    [leadsMomRows, dateField],
  );
  const sinContactoMomAgg = useMemo(
    () => seriesDesdeLeads(leadsMomRows, dateField, ETAPAS_SIN_CONTACTO, agregarPorPaisYMes),
    [leadsMomRows, dateField],
  );
  const gestionandoMomAgg = useMemo(
    () => seriesDesdeLeads(leadsMomRows, dateField, ETAPAS_GESTIONANDO, agregarPorPaisYMes),
    [leadsMomRows, dateField],
  );
  const matriculaMomAgg = useMemo(
    () => seriesDesdeLeads(leadsMomRows, dateField, ETAPAS_MATRICULA, agregarPorPaisYMes),
    [leadsMomRows, dateField],
  );
  const descartadosMomAgg = useMemo(
    () => seriesDesdeLeads(leadsMomRows, dateField, ETAPAS_DESCARTADO, agregarPorPaisYMes),
    [leadsMomRows, dateField],
  );

  const tabProps = { vista: vistaPais, onVistaChange: setVistaPais };

  return (
    <>
      <PaisPorDiaChart
        title="Leads por país"
        subtitle="Comportamiento día a día durante el mes seleccionado."
        emptyLabel="Sin leads en el mes seleccionado."
        loading={loading}
        days={days}
        totalsByPais={leadsAgg.totalsByPais}
        byDayByPais={leadsAgg.byDayByPais}
        total={leadsAgg.total}
        pctMode="share"
        {...tabProps}
        monthly={{
          days: months,
          totalsByPais: leadsMomAgg.totalsByPais,
          byDayByPais: leadsMomAgg.byDayByPais,
          total: leadsMomAgg.total,
          loading: loadingMom,
          subtitle: "Mes a mes desde noviembre 2025. La lista es el acumulado; no usa el filtro de mes, periodo o día.",
          emptyLabel: "Sin leads desde noviembre 2025.",
        }}
      />
      <PaisPorDiaChart
        title="Sin contacto por país"
        subtitle="Leads del periodo que hoy están en Sin contacto. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads en Sin contacto en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={sinContactoAgg.totalsByPais}
        byDayByPais={sinContactoAgg.byDayByPais}
        total={sinContactoAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        {...tabProps}
        monthly={{
          days: months,
          totalsByPais: sinContactoMomAgg.totalsByPais,
          byDayByPais: sinContactoMomAgg.byDayByPais,
          total: sinContactoMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          loading: loadingMom,
          subtitle: "Leads desde noviembre 2025 que hoy están en Sin contacto. El % es sobre el acumulado de Leads por país.",
          emptyLabel: "Sin leads en Sin contacto desde noviembre 2025.",
        }}
      />
      <PaisPorDiaChart
        title="Gestionando por país"
        subtitle="Leads del periodo que hoy están en Gestionando, Pendiente de agenda, Listo para agendar, Agendado, Interés futuro, Reprogramar, Posible matrícula o Pago pendiente. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads en gestión en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={gestionandoAgg.totalsByPais}
        byDayByPais={gestionandoAgg.byDayByPais}
        total={gestionandoAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        {...tabProps}
        monthly={{
          days: months,
          totalsByPais: gestionandoMomAgg.totalsByPais,
          byDayByPais: gestionandoMomAgg.byDayByPais,
          total: gestionandoMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          loading: loadingMom,
          subtitle: "Leads desde noviembre 2025 que hoy están en gestión intermedia. El % es sobre el acumulado de Leads por país.",
          emptyLabel: "Sin leads en gestión desde noviembre 2025.",
        }}
      />
      <SlotFasePorPais
        rango={rango}
        rangoMom={momRango}
        months={months}
        filtros={filtros}
        nombreFase="Pitch"
        title="Pitch por país"
        subtitle="Leads que entraron a Pitch en el periodo. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads que hayan entrado a Pitch en el periodo filtrado."
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        monthlyBaselineByPais={leadsMomAgg.totalsByPais}
        {...tabProps}
      />
      <PaisPorDiaChart
        title="Matrícula por país"
        subtitle="Leads del periodo que hoy están en Matrícula. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads en Matrícula en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={matriculaAgg.totalsByPais}
        byDayByPais={matriculaAgg.byDayByPais}
        total={matriculaAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        {...tabProps}
        monthly={{
          days: months,
          totalsByPais: matriculaMomAgg.totalsByPais,
          byDayByPais: matriculaMomAgg.byDayByPais,
          total: matriculaMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          loading: loadingMom,
          subtitle: "Leads desde noviembre 2025 que hoy están en Matrícula. El % es sobre el acumulado de Leads por país.",
          emptyLabel: "Sin leads en Matrícula desde noviembre 2025.",
        }}
      />
      <PaisPorDiaChart
        title="Descartados por país"
        subtitle="Leads del periodo que hoy están en Descartado, No se matriculó, Matrícula caída, Dejó de contestar, MINDTAP o Datos de contacto errados. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads descartados en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={descartadosAgg.totalsByPais}
        byDayByPais={descartadosAgg.byDayByPais}
        total={descartadosAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        {...tabProps}
        monthly={{
          days: months,
          totalsByPais: descartadosMomAgg.totalsByPais,
          byDayByPais: descartadosMomAgg.byDayByPais,
          total: descartadosMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          loading: loadingMom,
          subtitle: "Leads desde noviembre 2025 que hoy están descartados. El % es sobre el acumulado de Leads por país.",
          emptyLabel: "Sin leads descartados desde noviembre 2025.",
        }}
      />
    </>
  );
}
