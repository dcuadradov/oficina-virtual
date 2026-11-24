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
import {
  aplicarEvento,
  CATEGORIA_NO_ES_MEDICO,
  contarMotivos,
  filtrarPorUltimaCategoria,
  leadIdKey,
} from './ultimoSeguimiento';
import PaisPorDiaChart from './PaisPorDiaChart';
import SlotFasePorPais from './slots/SlotFasePorPais';

const PAGE_SIZE = 1000;
const LEAD_IN_SIZE = 100;

async function fetchLeadsPais(filtros, dateField, cancelled) {
  const acc = [];
  let from = 0;
  let keep = true;
  while (keep && !cancelled()) {
    const q = applyLeadFilters(
      supabase.from('leads').select(`card_id, pais, ${dateField}, etapa_funnel`)
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

async function fetchUltimosDeTabla(table, chunk, map, cancelled) {
  const pending = new Set(chunk.map(leadIdKey).filter(Boolean));
  let from = 0;
  while (pending.size && !cancelled()) {
    const { data, error } = await supabase
      .from(table)
      .select('lead_id, categoria, created_at')
      .in('lead_id', chunk)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data || []) {
      const id = leadIdKey(row.lead_id);
      if (!id || !pending.has(id)) continue;
      aplicarEvento(map, { ...row, lead_id: id });
      pending.delete(id);
    }
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
}

async function fetchUltimosSeguimientos(leadIds, cancelled) {
  const unique = [...new Set((leadIds || []).map(leadIdKey).filter(Boolean))];
  const map = {};
  for (let i = 0; i < unique.length && !cancelled(); i += LEAD_IN_SIZE) {
    const chunk = unique.slice(i, i + LEAD_IN_SIZE);
    await Promise.all([
      fetchUltimosDeTabla('comentarios', chunk, map, cancelled),
      fetchUltimosDeTabla('recordatorios', chunk, map, cancelled),
    ]);
  }
  return map;
}

function idsDeLeads(...listas) {
  const ids = new Set();
  listas.forEach((rows) => {
    (rows || []).forEach((row) => {
      const id = leadIdKey(row?.card_id);
      if (id) ids.add(id);
    });
  });
  return [...ids];
}

function seriesDesdeLeads(rows, dateField, etapas, agregar) {
  const filtered = etapas ? filtrarPorEtapas(rows, etapas) : rows;
  return agregar(filtered, dateField);
}

export default function InformePaisFunnel({ rango, filtros = {} }) {
  const [leadsRows, setLeadsRows] = useState([]);
  const [leadsMomRows, setLeadsMomRows] = useState([]);
  const [ultimosPorLead, setUltimosPorLead] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMom, setLoadingMom] = useState(false);
  const [loadingSeguimientos, setLoadingSeguimientos] = useState(false);
  const [vistaPais, setVistaPais] = useState('periodo');
  const [paisesEnFoco, setPaisesEnFoco] = useState([]);
  const dateField = filtros.dateField === 'updated_at' ? 'updated_at' : 'created_at';
  const momRango = useMemo(() => rangoTodosLosMeses(), []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const cargar = async () => {
      setLoading(Boolean(rango?.fechaInicio));
      setLoadingMom(true);
      setLoadingSeguimientos(true);
      setUltimosPorLead({});
      try {
        const filtrosMom = {
          ...filtros,
          fechaInicio: momRango.fechaInicio,
          fechaFin: momRango.fechaFin,
        };
        const momPromise = fetchLeadsPais(filtrosMom, dateField, isCancelled);
        const periodo = rango?.fechaInicio
          ? await fetchLeadsPais(filtros, dateField, isCancelled)
          : [];
        if (cancelled) return;
        setLeadsRows(periodo);
        setLoading(false);

        try {
          const ultimosPeriodo = await fetchUltimosSeguimientos(idsDeLeads(periodo), isCancelled);
          if (cancelled) return;
          setUltimosPorLead(ultimosPeriodo);
          setLoadingSeguimientos(false);

          const mom = await momPromise;
          if (cancelled) return;
          setLeadsMomRows(mom);
          setLoadingMom(false);

          const missingMom = idsDeLeads(mom).filter((id) => !ultimosPeriodo[id]);
          if (missingMom.length) {
            setLoadingSeguimientos(true);
            const extra = await fetchUltimosSeguimientos(missingMom, isCancelled);
            if (cancelled) return;
            setUltimosPorLead({ ...ultimosPeriodo, ...extra });
          }
        } catch (segErr) {
          console.error('[InformePaisFunnel] error cargando seguimientos:', segErr.message);
          const mom = await momPromise.catch(() => []);
          if (!cancelled) {
            setLeadsMomRows(mom);
            setLoadingMom(false);
          }
        }
      } catch (err) {
        console.error('[InformePaisFunnel] error cargando leads:', err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMom(false);
          setLoadingSeguimientos(false);
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
  const noMedicosRows = useMemo(
    () => filtrarPorUltimaCategoria(leadsRows, ultimosPorLead, CATEGORIA_NO_ES_MEDICO),
    [leadsRows, ultimosPorLead],
  );
  const noMedicosAgg = useMemo(
    () => agregarPorPaisYDia(noMedicosRows, dateField),
    [noMedicosRows, dateField],
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
  const noMedicosMomRows = useMemo(
    () => filtrarPorUltimaCategoria(leadsMomRows, ultimosPorLead, CATEGORIA_NO_ES_MEDICO),
    [leadsMomRows, ultimosPorLead],
  );
  const noMedicosMomAgg = useMemo(
    () => agregarPorPaisYMes(noMedicosMomRows, dateField),
    [noMedicosMomRows, dateField],
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

  const motivosDescartados = useMemo(
    () => contarMotivos({
      leads: leadsRows,
      ultimos: ultimosPorLead,
      etapas: ETAPAS_DESCARTADO,
      paises: paisesEnFoco,
    }),
    [leadsRows, ultimosPorLead, paisesEnFoco],
  );

  const tabProps = { vista: vistaPais, onVistaChange: setVistaPais };
  const focoLista = {
    selectedPaises: paisesEnFoco,
    onPaisFocusChange: setPaisesEnFoco,
  };
  const focoProps = {
    ...focoLista,
    overlayByDayByPais: leadsAgg.byDayByPais,
  };
  const loadingNoMedicos = loading || loadingSeguimientos;
  const loadingNoMedicosMom = loadingMom || loadingSeguimientos;

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
        {...focoLista}
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
        title="No son médicos por país"
        subtitle='Leads del periodo cuyo último seguimiento es «No es médico». El % de cada país es sobre Leads por país.'
        emptyLabel='Sin leads cuyo último seguimiento sea «No es médico» en el periodo filtrado.'
        loading={loadingNoMedicos}
        days={days}
        totalsByPais={noMedicosAgg.totalsByPais}
        byDayByPais={noMedicosAgg.byDayByPais}
        total={noMedicosAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
        compareLabel="No son médicos"
        {...tabProps}
        {...focoProps}
        monthly={{
          days: months,
          totalsByPais: noMedicosMomAgg.totalsByPais,
          byDayByPais: noMedicosMomAgg.byDayByPais,
          total: noMedicosMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          overlayByDayByPais: leadsMomAgg.byDayByPais,
          loading: loadingNoMedicosMom,
          subtitle: 'Leads desde noviembre 2025 cuyo último seguimiento es «No es médico». El % es sobre el acumulado de Leads por país.',
          emptyLabel: 'Sin leads con último seguimiento «No es médico» desde noviembre 2025.',
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
        compareLabel="Sin contacto"
        {...tabProps}
        {...focoProps}
        monthly={{
          days: months,
          totalsByPais: sinContactoMomAgg.totalsByPais,
          byDayByPais: sinContactoMomAgg.byDayByPais,
          total: sinContactoMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          overlayByDayByPais: leadsMomAgg.byDayByPais,
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
        compareLabel="Gestionando"
        {...tabProps}
        {...focoProps}
        monthly={{
          days: months,
          totalsByPais: gestionandoMomAgg.totalsByPais,
          byDayByPais: gestionandoMomAgg.byDayByPais,
          total: gestionandoMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          overlayByDayByPais: leadsMomAgg.byDayByPais,
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
        overlayByDayByPais={leadsAgg.byDayByPais}
        monthlyOverlayByDayByPais={leadsMomAgg.byDayByPais}
        compareLabel="Pitch"
        {...tabProps}
        selectedPaises={paisesEnFoco}
        onPaisFocusChange={setPaisesEnFoco}
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
        compareLabel="Matrícula"
        {...tabProps}
        {...focoProps}
        monthly={{
          days: months,
          totalsByPais: matriculaMomAgg.totalsByPais,
          byDayByPais: matriculaMomAgg.byDayByPais,
          total: matriculaMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          overlayByDayByPais: leadsMomAgg.byDayByPais,
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
        compareLabel="Descartados"
        {...tabProps}
        {...focoProps}
        motivo={{
          rows: motivosDescartados.rows,
          total: motivosDescartados.total,
          loading: loadingSeguimientos,
          subtitle: 'Motivo del último seguimiento de los descartados del periodo. El % es sobre esos descartados, no sobre todos los leads.',
          emptyLabel: paisesEnFoco.length
            ? 'Sin descartados en los países seleccionados.'
            : 'Sin leads descartados en el periodo filtrado.',
        }}
        monthly={{
          days: months,
          totalsByPais: descartadosMomAgg.totalsByPais,
          byDayByPais: descartadosMomAgg.byDayByPais,
          total: descartadosMomAgg.total,
          baselineByPais: leadsMomAgg.totalsByPais,
          overlayByDayByPais: leadsMomAgg.byDayByPais,
          loading: loadingMom,
          subtitle: "Leads desde noviembre 2025 que hoy están descartados. El % es sobre el acumulado de Leads por país.",
          emptyLabel: "Sin leads descartados desde noviembre 2025.",
        }}
      />
    </>
  );
}
