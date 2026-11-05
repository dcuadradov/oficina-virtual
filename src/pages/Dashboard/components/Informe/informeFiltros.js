export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addOneDay(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const next = new Date(year, month - 1, day + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

export function rangoDeMes(monthConfigs, mesKey) {
  if (!mesKey) return null;
  const config = monthConfigs?.[mesKey];
  if (config?.fecha_inicio) {
    const fechaInicio = `${config.fecha_inicio} 05:00:00+00`;
    let fechaFin;
    let endDateLocal;
    if (config.fecha_fin) {
      fechaFin = `${addOneDay(config.fecha_fin)} 05:00:00+00`;
      endDateLocal = config.fecha_fin;
    } else {
      const now = new Date();
      const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const fechaManana = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
      fechaFin = `${fechaManana} 05:00:00+00`;
      endDateLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return {
      fechaInicio,
      fechaFin,
      startDateLocal: config.fecha_inicio,
      endDateLocal,
    };
  }

  const [year, month] = mesKey.split('-').map(Number);
  const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01 05:00:00+00`;
  const mesSiguiente = new Date(year, month, 1);
  const fechaFin = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}-01 05:00:00+00`;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fechaInicio,
    fechaFin,
    startDateLocal: `${year}-${String(month).padStart(2, '0')}-01`,
    endDateLocal: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function parseInformeDates({
  selectedDia = null,
  selectedPeriodo = null,
  selectedMes = null,
  monthConfigs = {},
} = {}) {
  if (selectedDia) {
    return {
      fechaInicio: `${selectedDia} 05:00:00+00`,
      fechaFin: `${addOneDay(selectedDia)} 05:00:00+00`,
      startDateLocal: selectedDia,
      endDateLocal: selectedDia,
    };
  }
  if (selectedPeriodo) {
    const [inicio, fin] = selectedPeriodo.split('_');
    return {
      fechaInicio: `${inicio} 05:00:00+00`,
      fechaFin: `${addOneDay(fin)} 05:00:00+00`,
      startDateLocal: inicio,
      endDateLocal: fin,
    };
  }
  if (selectedMes) return rangoDeMes(monthConfigs, selectedMes);
  return { fechaInicio: null, fechaFin: null, startDateLocal: null, endDateLocal: null };
}

export const MOM_START_DATE = '2025-11-01';

export function rangoTodosLosMeses(now = new Date()) {
  const local = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;
  return {
    fechaInicio: `${MOM_START_DATE} 05:00:00+00`,
    fechaFin: `${addOneDay(today)} 05:00:00+00`,
    startYm: MOM_START_DATE.slice(0, 7),
    endYm: `${y}-${m}`,
  };
}

export const SIN_DATO = '__SIN__';

const CAMPOS_CON_VACIO = new Set(['ocupacion', 'label', 'fuente_dato', 'sexo', 'edad']);

function quotePostgrest(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function applyInIfAny(query, column, selected) {
  if (!Array.isArray(selected) || selected.length === 0) return query;
  const hasEmpty = selected.includes(SIN_DATO);
  const values = selected.filter((value) => value !== SIN_DATO);
  if (!hasEmpty) return query.in(column, values);
  const parts = [];
  if (values.length) parts.push(`${column}.in.(${values.map(quotePostgrest).join(',')})`);
  parts.push(`${column}.is.null`);
  parts.push(`${column}.eq.`);
  return query.or(parts.join(','));
}

export function applyLeadFilters(query, {
  fechaInicio = null,
  fechaFin = null,
  dateField = 'created_at',
  selectedPais = [],
  selectedComercial = null,
  selectedOcupacion = [],
  selectedLabel = [],
  selectedFuente = [],
  selectedSexo = [],
  selectedEdad = [],
} = {}) {
  let q = query;
  const field = dateField === 'updated_at' ? 'updated_at' : 'created_at';
  if (fechaInicio && fechaFin) {
    q = q.gte(field, fechaInicio).lte(field, fechaFin);
  }
  q = applyInIfAny(q, 'pais', selectedPais);
  if (selectedComercial) q = q.eq('comercial_email', selectedComercial);
  q = applyInIfAny(q, 'ocupacion', selectedOcupacion);
  q = applyInIfAny(q, 'label', selectedLabel);
  q = applyInIfAny(q, 'fuente_dato', selectedFuente);
  q = applyInIfAny(q, 'sexo', selectedSexo);
  q = applyInIfAny(q, 'edad', selectedEdad);
  return q;
}

export function valorFacetado(raw, { includeEmpty = false } = {}) {
  if (raw == null || String(raw).trim() === '') return includeEmpty ? SIN_DATO : null;
  return String(raw).trim();
}

export function rowMatchesInformeDims(row, selections) {
  if (!selections) return true;
  return Object.entries(selections).every(([campo, selected]) => {
    if (!Array.isArray(selected) || selected.length === 0) return true;
    const value = valorFacetado(row?.[campo], { includeEmpty: CAMPOS_CON_VACIO.has(campo) });
    if (!value) return false;
    return selected.includes(value);
  });
}

function ordenarOpciones(a, b) {
  if (a.value === SIN_DATO) return 1;
  if (b.value === SIN_DATO) return -1;
  return b.count - a.count || a.value.localeCompare(b.value, 'es');
}

export function contarValores(rows, campo, { includeEmpty = false } = {}) {
  const counts = new Map();
  for (const row of rows || []) {
    const value = valorFacetado(row?.[campo], { includeEmpty });
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort(ordenarOpciones);
}

export function opcionesCampo(contados, seleccionados = []) {
  const byValue = new Map((contados || []).map((item) => [item.value, item]));
  for (const value of seleccionados) {
    if (value && !byValue.has(value)) byValue.set(value, { value, count: 0 });
  }
  return [...byValue.values()].sort(ordenarOpciones);
}

export function facetasCruzadas(rows, selections, campo) {
  const others = { ...selections, [campo]: [] };
  const filtered = (rows || []).filter((row) => rowMatchesInformeDims(row, others));
  return opcionesCampo(
    contarValores(filtered, campo, { includeEmpty: CAMPOS_CON_VACIO.has(campo) }),
    selections?.[campo],
  );
}

export function tieneFiltrosDeAtributo(filtros = {}) {
  return Boolean(
    (Array.isArray(filtros.selectedPais) && filtros.selectedPais.length > 0)
    || filtros.selectedComercial
    || (Array.isArray(filtros.selectedOcupacion) && filtros.selectedOcupacion.length > 0)
    || (Array.isArray(filtros.selectedLabel) && filtros.selectedLabel.length > 0)
    || (Array.isArray(filtros.selectedFuente) && filtros.selectedFuente.length > 0)
    || (Array.isArray(filtros.selectedSexo) && filtros.selectedSexo.length > 0)
    || (Array.isArray(filtros.selectedEdad) && filtros.selectedEdad.length > 0),
  );
}
