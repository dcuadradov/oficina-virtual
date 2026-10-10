/**
 * Contrato del blog para el sitio público (mdenglish.us).
 *
 * Lectura (anon key de Supabase staging/prod):
 *   from('blog_posts').select('*, category:blog_categories(id, name, slug)')
 *     .eq('status', 'published')
 *     .order('published_at', { ascending: false })
 *
 * Filtros útiles: .eq('destacado', true) | .eq('novedades', true) | .eq('category.slug', ...)
 *
 * Visita:
 *   rpc('record_blog_post_view', { p_slug, p_visitor_id, p_referrer })
 *   o import { recordBlogPostView } from './recordView'
 *
 * Media:
 *   banner y bloque `media` (layout full) → 16:9 (recomendado 2560×1440)
 *   bloque `split` → texto | media 1:1
 *
 * body[] tipos: h2, h3, paragraph, ol, ul, media, split
 */

export const BLOG_PUBLIC_STATUS = 'published';
export const BLOG_BANNER_SIZE = { width: 2560, height: 1440, aspect: '16:9' };
export const BLOG_MEDIA_FULL_ASPECT = '16:9';
export const BLOG_MEDIA_SPLIT_ASPECT = '1:1';
export const BLOG_STORAGE_BUCKET = 'blog-media';
