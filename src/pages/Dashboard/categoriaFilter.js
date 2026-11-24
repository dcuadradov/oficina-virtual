function normalizar(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function ordenarCategoriasSeguimiento(categorias) {
  return [...(categorias || [])].sort((a, b) => {
    const padre = (a.categoria_padre || '').localeCompare(b.categoria_padre || '', 'es', {
      sensitivity: 'base',
    });
    if (padre !== 0) return padre;
    return (a.categoria || '').localeCompare(b.categoria || '', 'es', { sensitivity: 'base' });
  });
}

/** Filtra por nombre o categoría padre. No distingue mayúsculas ni tildes. */
export function filtrarCategoriasSeguimiento(categorias, busqueda) {
  const sorted = ordenarCategoriasSeguimiento(categorias);
  const term = normalizar((busqueda || '').trim());
  if (!term) return sorted;
  return sorted.filter(
    (cat) =>
      normalizar(cat.categoria).includes(term) ||
      normalizar(cat.categoria_padre).includes(term),
  );
}
