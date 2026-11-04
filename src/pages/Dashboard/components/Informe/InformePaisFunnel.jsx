import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { applyLeadFilters } from './informeFiltros';
import {
  agregarPorPaisYDia,
  buildDayList,
  filtrarPorEtapas,
} from './paisPorDia';
import PaisPorDiaChart from './PaisPorDiaChart';
import SlotFasePorPais from './slots/SlotFasePorPais';

const ETAPAS_SIN_CONTACTO = ['Sin contacto'];
const ETAPAS_GESTIONANDO = ['Gestionando', 'Pendiente de agenda'];
const ETAPAS_DESCARTADO = ['Descartado'];

export default function InformePaisFunnel({ rango, filtros = {} }) {
  const [leadsRows, setLeadsRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalesPitch, setTotalesPitch] = useState({});
  const dateField = filtros.dateField === 'updated_at' ? 'updated_at' : 'created_at';

  useEffect(() => {
    if (!rango?.fechaInicio) {
      setLeadsRows([]);
      return;
    }
    let cancelled = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const PAGE_SIZE = 1000;
        const acc = [];
        let from = 0;
        let keep = true;
        while (keep && !cancelled) {
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
        if (!cancelled) setLeadsRows(acc);
      } catch (err) {
        console.error('[InformePaisFunnel] error cargando leads:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [rango, filtros, dateField]);

  const days = useMemo(
    () => (rango ? buildDayList(rango.startDateLocal, rango.endDateLocal) : []),
    [rango],
  );

  const leadsAgg = useMemo(
    () => agregarPorPaisYDia(leadsRows, dateField),
    [leadsRows, dateField],
  );
  const sinContactoAgg = useMemo(
    () => agregarPorPaisYDia(filtrarPorEtapas(leadsRows, ETAPAS_SIN_CONTACTO), dateField),
    [leadsRows, dateField],
  );
  const gestionandoAgg = useMemo(
    () => agregarPorPaisYDia(filtrarPorEtapas(leadsRows, ETAPAS_GESTIONANDO), dateField),
    [leadsRows, dateField],
  );
  const descartadosAgg = useMemo(
    () => agregarPorPaisYDia(filtrarPorEtapas(leadsRows, ETAPAS_DESCARTADO), dateField),
    [leadsRows, dateField],
  );

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
      />
      <PaisPorDiaChart
        title="Gestionando por país"
        subtitle="Leads del periodo que hoy están en Gestionando o Pendiente de agenda. El % de cada país es sobre Sin contacto por país."
        emptyLabel="Sin leads en Gestionando en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={gestionandoAgg.totalsByPais}
        byDayByPais={gestionandoAgg.byDayByPais}
        total={gestionandoAgg.total}
        pctMode="funnel"
        baselineByPais={sinContactoAgg.totalsByPais}
        previousLabel="Sin contacto por país"
      />
      <SlotFasePorPais
        rango={rango}
        filtros={filtros}
        nombreFase="Pitch"
        title="Pitch por país"
        subtitle="Leads que entraron a Pitch en el periodo. El % de cada país es sobre Gestionando por país."
        emptyLabel="Sin leads que hayan entrado a Pitch en el periodo filtrado."
        pctMode="funnel"
        baselineByPais={gestionandoAgg.totalsByPais}
        previousLabel="Gestionando por país"
        onTotales={setTotalesPitch}
      />
      <SlotFasePorPais
        rango={rango}
        filtros={filtros}
        nombreFase="Matrícula"
        title="Matrícula por país"
        subtitle="Leads que entraron a Matrícula en el periodo. El % de cada país es sobre Pitch por país."
        emptyLabel="Sin leads que hayan entrado a Matrícula en el periodo filtrado."
        pctMode="funnel"
        baselineByPais={totalesPitch}
        previousLabel="Pitch por país"
      />
      <PaisPorDiaChart
        title="Descartados por país"
        subtitle="Leads del periodo que hoy están en Descartado. El % de cada país es sobre Leads por país."
        emptyLabel="Sin leads descartados en el periodo filtrado."
        loading={loading}
        days={days}
        totalsByPais={descartadosAgg.totalsByPais}
        byDayByPais={descartadosAgg.byDayByPais}
        total={descartadosAgg.total}
        pctMode="funnel"
        baselineByPais={leadsAgg.totalsByPais}
        previousLabel="Leads por país"
      />
    </>
  );
}
