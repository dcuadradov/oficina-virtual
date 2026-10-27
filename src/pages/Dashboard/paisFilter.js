/**
 * Opciones del filtro de país en Gestión.
 * PostgREST devuelve como máximo 1000 filas por request, así que la lista
 * se arma juntando todas las páginas de leads.pais.
 */

export function collectPaises(pages) {
  const paises = new Set();
  for (const page of pages) {
    for (const row of page || []) {
      if (row?.pais) paises.add(row.pais);
    }
  }
  return [...paises].sort((a, b) => a.localeCompare(b, 'es'));
}

export function filtrarPaises(paises, busqueda) {
  const normalizar = (value) => (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const term = normalizar((busqueda || '').trim());
  if (!term) return paises;
  return paises.filter((pais) => normalizar(pais).includes(term));
}
