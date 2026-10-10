import { supabase } from '../../supabaseClient';
import { uniqueSlug } from './slug';

const POST_SELECT_BASE = `
  *,
  category:blog_categories(id, name, slug)
`;

const POST_SELECT = `${POST_SELECT_BASE},
  views:blog_post_views(count)
`;

async function selectPosts(build) {
  const full = await build(POST_SELECT);
  if (!full.error) return full.data || [];
  const fallback = await build(POST_SELECT_BASE);
  if (fallback.error) throw fallback.error;
  return fallback.data || [];
}

export function viewCountFromPost(post) {
  const raw = post?.views;
  if (Array.isArray(raw) && raw[0]?.count != null) return Number(raw[0].count);
  return 0;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchPosts({ search = '', status = '', destacado = '', novedades = '' } = {}) {
  const applyFilters = (query) => {
    let next = query.order('updated_at', { ascending: false });
    if (status) next = next.eq('status', status);
    if (destacado === 'si') next = next.eq('destacado', true);
    if (destacado === 'no') next = next.eq('destacado', false);
    if (novedades === 'si') next = next.eq('novedades', true);
    if (novedades === 'no') next = next.eq('novedades', false);
    if (search.trim()) next = next.ilike('title', `%${search.trim()}%`);
    return next;
  };

  return selectPosts((columns) => applyFilters(supabase.from('blog_posts').select(columns)));
}

export async function searchPostTitles(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, status')
    .ilike('title', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(8);
  if (error) throw error;
  return data || [];
}

export async function fetchPost(id) {
  const rows = await selectPosts((columns) =>
    supabase.from('blog_posts').select(columns).eq('id', id)
  );
  const data = rows[0];
  if (!data) throw new Error('No se encontró el artículo');
  return data;
}

export async function fetchExistingSlugs(excludeId) {
  const { data, error } = await supabase.from('blog_posts').select('id, slug');
  if (error) throw error;
  const set = new Set();
  (data || []).forEach((row) => {
    if (row.id !== excludeId && row.slug) set.add(row.slug);
  });
  return set;
}

function payloadFromDraft(draft, slug) {
  return {
    id: draft.id,
    title: draft.title || '',
    subtitle: draft.subtitle || '',
    slug,
    status: draft.status,
    category_id: draft.category_id || null,
    banner_url: draft.banner_url || null,
    banner_alt: draft.banner_alt || '',
    author_name: draft.author_name || '',
    author_email: draft.author_email || '',
    destacado: Boolean(draft.destacado),
    novedades: Boolean(draft.novedades),
    body: Array.isArray(draft.body) ? draft.body : [],
    published_at: draft.published_at || null,
  };
}

export async function savePost(draft) {
  const existing = await fetchExistingSlugs(draft.id);
  const slug = uniqueSlug(draft.slug || draft.title || `articulo-${draft.id.slice(0, 8)}`, existing);
  const payload = payloadFromDraft(draft, slug);

  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(payload, { onConflict: 'id' })
    .select(POST_SELECT_BASE)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePostStatus(id, status, extra = {}) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ status, ...extra })
    .eq('id', id)
    .select(POST_SELECT_BASE)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(id) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadBlogMedia(postId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${postId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('blog-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('blog-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchPostViews(postId) {
  const { data, error } = await supabase
    .from('blog_post_views')
    .select('id, viewed_at, visitor_id, referrer')
    .eq('post_id', postId)
    .order('viewed_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
