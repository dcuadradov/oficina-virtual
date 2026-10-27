import { supabase } from '../../supabaseClient';

const VISITOR_KEY = 'md_blog_visitor_id';

export function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return null;
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

/**
 * Ping de visita para el sitio público.
 * Llamar una vez al montar el artículo publicado.
 */
export async function recordBlogPostView(slug, { referrer } = {}) {
  if (!slug) return;
  const { error } = await supabase.rpc('record_blog_post_view', {
    p_slug: slug,
    p_visitor_id: getOrCreateVisitorId(),
    p_referrer: referrer ?? (typeof document !== 'undefined' ? document.referrer : null),
  });
  if (error) throw error;
}
