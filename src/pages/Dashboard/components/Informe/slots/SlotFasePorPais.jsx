import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../../supabaseClient';
import { applyLeadFilters, tieneFiltrosDeAtributo } from '../informeFiltros';
import { agregarPorPaisYDia, agregarPorPaisYMes, buildDayList } from '../paisPorDia';
import PaisPorDiaChart from '../PaisPorDiaChart';

const PAGE_SIZE = 1000;
const LEAD_IN_CHUNK = 200;

async function fetchFaseRows({ rango, filtros, nombreFase, cancelled }) {
  if (!rango?.fechaInicio || !nombreFase) return [];
  const histAcc = [];
  let from = 0;
  let keep = true;
  while (keep && !cancelled()) {
    const { data, error } = await supabase
      .from('historial')
      .select('lead_id, created_at')
      .eq('modulo', 'comercial')
      .eq('nombre_fase', nombreFase)
      .gte('created_at', rango.fechaInicio)
      .lte('created_at', rango.fechaFin)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    histAcc.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) keep = false;
    from += PAGE_SIZE;
  }
  if (cancelled()) return [];

  const firstByLead = new Map();
  histAcc.forEach(({ lead_id, created_at }) => {
    if (!lead_id) return;
    if (!firstByLead.has(lead_id)) firstByLead.set(lead_id, created_at);
  });

  const leadIds = [...firstByLead.keys()];
  const paisByCard = {};
  for (let i = 0; i < leadIds.length && !cancelled(); i += LEAD_IN_CHUNK) {
    const chunk = leadIds.slice(i, i + LEAD_IN_CHUNK);
    const leadsQuery = applyLeadFilters(
      supabase.from('leads').select('card_id, pais').in('card_id', chunk),
      {
        selectedPais: filtros.selectedPais,
        selectedComercial: filtros.selectedComercial,
        selectedOcupacion: filtros.selectedOcupacion,
        selectedLabel: filtros.selectedLabel,
        selectedFuente: filtros.selectedFuente,
        selectedSexo: filtros.selectedSexo,
        selectedEdad: filtros.selectedEdad,
      },
    );
    const { data, error } = await leadsQuery;
    if (error) throw error;
    (data || []).forEach((l) => {
      paisByCard[l.card_id] = l.pais;
    });
  }
  if (cancelled()) return [];

  const hayFiltroLead = tieneFiltrosDeAtributo(filtros);
  return leadIds
    .filter((leadId) => !hayFiltroLead || Object.prototype.hasOwnProperty.call(paisByCard, leadId))
    .map((leadId) => ({
      pais: paisByCard[leadId],
      created_at: firstByLead.get(leadId),
    }));
}

/**
 * Leads que entraron a una fase (historial.nombre_fase) en el mes,
 * únicos por lead_id, país desde leads.card_id.
 */
export default function SlotFasePorPais({
  rango,
  rangoMom = null,
  months = [],
  filtros = {},
  nombreFase,
  title,
  subtitle,
  emptyLabel,
  pctMode = 'share',
  baselineByPais = null,
  monthlyBaselineByPais = null,
  previousLabel = '',
  onTotales,
  vista = 'periodo',
  onVistaChange,
  overlayByDayByPais = null,
  monthlyOverlayByDayByPais = null,
  selectedPais = null,
  onPaisFocusChange,
  compareLabel = '',
}) {
  const [rows, setRows] = useState([]);
  const [momRows, setMomRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMom, setLoadingMom] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const cargar = async () => {
      setLoading(Boolean(rango?.fechaInicio));
      setLoadingMom(Boolean(rangoMom?.fechaInicio));
      try {
        const [periodo, mom] = await Promise.all([
          fetchFaseRows({ rango, filtros, nombreFase, cancelled: isCancelled }),
          rangoMom
            ? fetchFaseRows({ rango: rangoMom, filtros, nombreFase, cancelled: isCancelled })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setRows(periodo);
        setMomRows(mom);
      } catch (err) {
        console.error(`[SlotFasePorPais ${nombreFase}] error:`, err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMom(false);
        }
      }
    };

    cargar();
    return () => { cancelled = true; };
  }, [rango, rangoMom, nombreFase, filtros]);

  const days = useMemo(
    () => (rango ? buildDayList(rango.startDateLocal, rango.endDateLocal) : []),
    [rango],
  );

  const agg = useMemo(() => agregarPorPaisYDia(rows, 'created_at'), [rows]);
  const momAgg = useMemo(() => agregarPorPaisYMes(momRows, 'created_at'), [momRows]);

  useEffect(() => {
    onTotales?.(agg.totalsByPais);
  }, [agg.totalsByPais, onTotales]);

  return (
    <PaisPorDiaChart
      title={title}
      subtitle={subtitle}
      emptyLabel={emptyLabel}
      loading={loading}
      days={days}
      totalsByPais={agg.totalsByPais}
      byDayByPais={agg.byDayByPais}
      total={agg.total}
      pctMode={pctMode}
      baselineByPais={baselineByPais}
      previousLabel={previousLabel}
      vista={vista}
      onVistaChange={onVistaChange}
      overlayByDayByPais={overlayByDayByPais}
      selectedPais={selectedPais}
      onPaisFocusChange={onPaisFocusChange}
      compareLabel={compareLabel || nombreFase}
      monthly={rangoMom ? {
        days: months,
        totalsByPais: momAgg.totalsByPais,
        byDayByPais: momAgg.byDayByPais,
        total: momAgg.total,
        baselineByPais: monthlyBaselineByPais,
        overlayByDayByPais: monthlyOverlayByDayByPais,
        loading: loadingMom,
        subtitle: `Leads que entraron a ${nombreFase} desde noviembre 2025. El % es sobre el acumulado de Leads por país.`,
        emptyLabel: `Sin leads que hayan entrado a ${nombreFase} desde noviembre 2025.`,
      } : null}
    />
  );
}
