-- =============================================================================
-- CMS Blog (portal.mdenglish.us → sitio público mdenglish.us)
--
-- Tablas: blog_categories, blog_posts, blog_post_views
-- Storage: bucket público blog-media
-- Acceso de escritura: usuarios_modulos.modulo_id = 'cms'
-- Lectura pública (anon): solo posts con status = 'published'
--
-- Asignar el módulo a un usuario (ajustar el join si la FK no es usuario_id):
--   insert into public.usuarios_modulos (usuario_id, modulo_id)
--   select id, 'cms' from public.usuarios where email = 'tu@mdenglish.us';
-- =============================================================================

begin;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  slug text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused')),
  category_id uuid references public.blog_categories(id) on delete set null,
  banner_url text,
  banner_alt text,
  author_name text not null default '',
  author_email text not null default '',
  destacado boolean not null default false,
  novedades boolean not null default false,
  body jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  visitor_id text,
  referrer text,
  viewed_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts (slug);
create index if not exists blog_posts_category_idx on public.blog_posts (category_id);
create index if not exists blog_posts_title_idx on public.blog_posts using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists blog_post_views_post_idx on public.blog_post_views (post_id, viewed_at desc);

insert into public.blog_categories (name, slug, sort_order) values
  ('Telemedicina', 'telemedicina', 1),
  ('Inteligencia artificial', 'inteligencia-artificial', 2),
  ('Médicos en el exterior', 'medicos-en-el-exterior', 3),
  ('Artículos científicos', 'articulos-cientificos', 4),
  ('Congresos médicos', 'congresos-medicos', 5)
on conflict (name) do nothing;

create or replace function public.set_blog_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.set_blog_posts_updated_at();

-- has_cms_module(): detecta la FK de usuarios_modulos → usuarios
do $$
declare
  um_col text;
  u_col text;
  fn_body text;
begin
  select kcu.column_name, ccu.column_name
    into um_col, u_col
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'usuarios_modulos'
    and ccu.table_name = 'usuarios'
  limit 1;

  if um_col is null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'usuarios_modulos' and column_name = 'usuario_id'
    ) then
      um_col := 'usuario_id';
      u_col := 'id';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'usuarios_modulos' and column_name = 'email'
    ) then
      um_col := 'email';
      u_col := 'email';
    else
      raise exception 'No se pudo resolver la relación usuarios_modulos → usuarios';
    end if;
  end if;

  fn_body := format(
    $f$
      select exists (
        select 1
        from public.usuarios u
        join public.usuarios_modulos um on um.%I = u.%I
        where lower(u.email) = lower(auth.email())
          and u.activo = true
          and um.modulo_id = 'cms'
      )
    $f$,
    um_col,
    u_col
  );

  execute format(
    'create or replace function public.has_cms_module() returns boolean language sql stable security definer set search_path = public as %L',
    fn_body
  );
end $$;

grant execute on function public.has_cms_module() to authenticated;

create or replace function public.record_blog_post_view(
  p_slug text,
  p_visitor_id text default null,
  p_referrer text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return;
  end if;

  select id into v_id
  from public.blog_posts
  where slug = p_slug
    and status = 'published'
  limit 1;

  if v_id is null then
    return;
  end if;

  insert into public.blog_post_views (post_id, visitor_id, referrer)
  values (v_id, nullif(trim(p_visitor_id), ''), nullif(trim(p_referrer), ''));
end;
$$;

grant execute on function public.record_blog_post_view(text, text, text) to anon, authenticated;

alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_views enable row level security;

drop policy if exists "blog_categories_public_read" on public.blog_categories;
create policy "blog_categories_public_read"
on public.blog_categories for select
to anon, authenticated
using (true);

drop policy if exists "blog_categories_cms_write" on public.blog_categories;
create policy "blog_categories_cms_write"
on public.blog_categories for all
to authenticated
using (public.has_cms_module())
with check (public.has_cms_module());

drop policy if exists "blog_posts_public_read_published" on public.blog_posts;
create policy "blog_posts_public_read_published"
on public.blog_posts for select
to anon, authenticated
using (status = 'published');

drop policy if exists "blog_posts_cms_read_all" on public.blog_posts;
create policy "blog_posts_cms_read_all"
on public.blog_posts for select
to authenticated
using (public.has_cms_module());

drop policy if exists "blog_posts_cms_insert" on public.blog_posts;
create policy "blog_posts_cms_insert"
on public.blog_posts for insert
to authenticated
with check (public.has_cms_module());

drop policy if exists "blog_posts_cms_update" on public.blog_posts;
create policy "blog_posts_cms_update"
on public.blog_posts for update
to authenticated
using (public.has_cms_module())
with check (public.has_cms_module());

drop policy if exists "blog_posts_cms_delete" on public.blog_posts;
create policy "blog_posts_cms_delete"
on public.blog_posts for delete
to authenticated
using (public.has_cms_module());

drop policy if exists "blog_post_views_cms_read" on public.blog_post_views;
create policy "blog_post_views_cms_read"
on public.blog_post_views for select
to authenticated
using (public.has_cms_module());

grant select on public.blog_categories to anon, authenticated;
grant select, insert, update, delete on public.blog_posts to authenticated;
grant select on public.blog_posts to anon;
grant select on public.blog_post_views to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog_media_public_read" on storage.objects;
create policy "blog_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'blog-media');

drop policy if exists "blog_media_cms_insert" on storage.objects;
create policy "blog_media_cms_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'blog-media' and public.has_cms_module());

drop policy if exists "blog_media_cms_update" on storage.objects;
create policy "blog_media_cms_update"
on storage.objects for update
to authenticated
using (bucket_id = 'blog-media' and public.has_cms_module())
with check (bucket_id = 'blog-media' and public.has_cms_module());

drop policy if exists "blog_media_cms_delete" on storage.objects;
create policy "blog_media_cms_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'blog-media' and public.has_cms_module());

commit;
