/**
 * Opciones del filtro de país en Gestión.
 * El conteo sale de los leads que ya cumplen los demás filtros. El país
 * elegido no recorta esta lista: si lo hiciera, no se podría marcar otro.
 */

export function contarPaises(pages) {
  const counts = new Map();
  for (const page of pages) {
    for (const row of page || []) {
      if (!row?.pais) continue;
      counts.set(row.pais, (counts.get(row.pais) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([pais, count]) => ({ pais, count }))
    .sort((a, b) => b.count - a.count || a.pais.localeCompare(b.pais, 'es'));
}

export function opcionesPais(contados, seleccionados = []) {
  const byName = new Map(contados.map((item) => [item.pais, item]));
  for (const pais of seleccionados) {
    if (pais && !byName.has(pais)) byName.set(pais, { pais, count: 0 });
  }
  return [...byName.values()].sort(
    (a, b) => b.count - a.count || a.pais.localeCompare(b.pais, 'es'),
  );
}

export function filtrarPaises(paises, busqueda) {
  const normalizar = (value) => (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const term = normalizar((busqueda || '').trim());
  if (!term) return paises;
  return paises.filter((item) => {
    const nombre = typeof item === 'string' ? item : item?.pais;
    return normalizar(nombre).includes(term);
  });
}

export function formatoConteoLeads(count) {
  return Number(count || 0).toLocaleString('es-CO');
}
