import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CmsHeader from './components/CmsHeader';
import BlockEditor from './components/BlockEditor';
import MediaField from './components/MediaField';
import StatusBadge from './components/StatusBadge';
import { fetchCategories, fetchPost, savePost } from '../../lib/cms/api';
import { slugify } from '../../lib/cms/slug';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyDraft(id) {
  const name = localStorage.getItem('user_name') || '';
  const email = localStorage.getItem('user_email') || '';
  return {
    id,
    title: '',
    subtitle: '',
    slug: '',
    status: 'draft',
    category_id: '',
    banner_url: '',
    banner_alt: '',
    author_name: name,
    author_email: email,
    destacado: false,
    novedades: false,
    body: [],
    published_at: null,
  };
}

export default function CmsEditor() {
  const { id: routeId } = useParams();
  const isNew = !routeId;
  const navigate = useNavigate();
  const postId = useMemo(() => routeId || crypto.randomUUID(), [routeId]);

  const [draft, setDraft] = useState(() => emptyDraft(postId));
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    fetchPost(routeId)
      .then((data) => {
        if (cancelled) return;
        setDraft({
          ...emptyDraft(data.id),
          ...data,
          category_id: data.category_id || data.category?.id || '',
          body: Array.isArray(data.body) ? data.body : [],
        });
        setSlugTouched(Boolean(data.slug));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar el artículo');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, routeId]);

  const setField = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const persist = async (nextStatus) => {
    setError('');
    if (nextStatus === 'published') {
      if (!draft.title.trim()) {
        setError('El título es obligatorio para publicar.');
        return;
      }
      if (!draft.category_id) {
        setError('Elige una categoría para publicar.');
        return;
      }
      if (!draft.banner_url) {
        setError('El banner es obligatorio para publicar.');
        return;
      }
    }

    if (nextStatus === 'draft' && draft.status === 'published') {
      const ok = window.confirm('Esto quita el artículo de la web pública. ¿Guardar como borrador?');
      if (!ok) return;
    }

    setSaving(true);
    try {
      const publishedAt =
        nextStatus === 'published'
          ? draft.published_at || new Date().toISOString()
          : draft.published_at;

      const saved = await savePost({
        ...draft,
        status: nextStatus,
        published_at: publishedAt,
      });
      setDraft({
        ...saved,
        category_id: saved.category_id || saved.category?.id || '',
        body: Array.isArray(saved.body) ? saved.body : [],
      });
      if (isNew) navigate(`/cms/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse shadow-xl shadow-[#02214A]/20" />
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-[#1717AF]/20 border-t-[#1717AF] animate-spin" />
        </div>
        <p className="text-[#02214A] mt-6 font-medium font-bookman">Cargando artículo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
      <CmsHeader subtitle={draft.title || 'Nuevo artículo'} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/cms')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Volver al listado
          </button>
          <StatusBadge status={draft.status} />
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-100">
            {error}
          </div>
        )}

        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Banner 16:9 · 2560 × 1440</p>
          <MediaField
            postId={draft.id}
            url={draft.banner_url}
            alt={draft.banner_alt}
            kind="image"
            aspectClass="aspect-video"
            helper="Recomendado 2560 × 1440. Se muestra recortado a 16:9."
            onChange={({ url, alt }) => {
              setDraft((prev) => ({ ...prev, banner_url: url, banner_alt: alt }));
            }}
          />
        </section>

        <div className="space-y-4 mb-8">
          <input
            value={draft.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Título del artículo"
            className="w-full text-3xl font-bold text-slate-800 bg-transparent border-b border-slate-200 pb-2 outline-none focus:border-[#1717AF]"
          />
          <input
            value={draft.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            placeholder="Subtítulo"
            className="w-full text-lg text-slate-600 bg-transparent border-b border-slate-200 pb-2 outline-none focus:border-[#1717AF]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categoría</span>
            <select
              value={draft.category_id || ''}
              onChange={(e) => setField('category_id', e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
            >
              <option value="">Selecciona…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Autor</span>
            <input
              value={draft.author_name}
              onChange={(e) => setField('author_name', e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</span>
            <input
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setField('slug', slugify(e.target.value));
              }}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha de publicación</span>
            <input
              type="datetime-local"
              value={toLocalInput(draft.published_at)}
              onChange={(e) => setField('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-6 mb-10">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(draft.destacado)}
              onChange={(e) => setField('destacado', e.target.checked)}
              className="rounded border-slate-300"
            />
            Destacado
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(draft.novedades)}
              onChange={(e) => setField('novedades', e.target.checked)}
              className="rounded border-slate-300"
            />
            Novedades
          </label>
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-3">Cuerpo del artículo</h3>
        <BlockEditor
          postId={draft.id}
          blocks={draft.body}
          onChange={(body) => setField('body', body)}
        />
      </main>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => persist('draft')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => persist('published')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#02214A] to-[#1717AF] text-white font-semibold disabled:opacity-60"
          >
            {saving ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
