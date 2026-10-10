export function slugify(text) {
  const slug = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
  return slug;
}

export function uniqueSlug(base, existing) {
  const root = slugify(base) || 'articulo';
  if (!existing.has(root)) return root;
  let n = 2;
  while (existing.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
