# CMS Blog (portal → mdenglish.us)

El blog se administra en el portal (`/cms`). El sitio público solo lee artículos con `status = published`. No hay WordPress ni n8n de por medio.

## Acceso

En `modulos` y en `usuarios_modulos` el id tiene que ser exactamente **`cms`** (no `cmc`). Si el id no coincide, la tarjeta no aparece y RLS bloquea escritura.

```sql
insert into public.modulos (id, nombre, descripcion, activo)
values ('cms', 'CMS', 'CMS de la página WEB', true)
on conflict (id) do nothing;

insert into public.usuarios_modulos (usuario_id, modulo_id)
select id, 'cms' from public.usuarios
where email = 'tu@mdenglish.us';
```

Migración: `db/migrations/2026-10-09_cms_blog.sql` (staging ya corrida; falta producción cuando se publique el portal).

## Portal

- `/cms` listado
- `/cms/nuevo` y `/cms/:id` editor (Guardar borrador / Publicar)
- `/cms/:id/performance` visitas

Categorías semilla: Telemedicina, Inteligencia artificial, Médicos en el exterior, Artículos científicos, Congresos médicos.

Media: banner y bloque `media` → 16:9. Bloque `split` → texto | media 1:1.

Storage: bucket público `blog-media`.

## Sitio público

Lectura (anon key del mismo Supabase):

```js
from('blog_posts')
  .select('*, category:blog_categories(id, name, slug)')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
```

Filtros: `.eq('destacado', true)`, `.eq('novedades', true)`, categoría por `category.slug`.

Ping de visita (una vez al montar el artículo):

```js
rpc('record_blog_post_view', { p_slug, p_visitor_id, p_referrer })
```

`body[]` tipos: `h2`, `h3`, `paragraph` (html), `ol` / `ul` (`items[]`), `media` (16:9), `split` (html + media 1:1).

Contrato en código: `src/lib/cms/publicContract.js` y `src/lib/cms/recordView.js`.
