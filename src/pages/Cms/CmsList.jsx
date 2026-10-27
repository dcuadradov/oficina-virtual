import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, FilePlus2, Newspaper, Search } from 'lucide-react';
import CmsHeader from './components/CmsHeader';
import ArticleCard from './components/ArticleCard';
import { deletePost, fetchPosts, searchPostTitles, updatePostStatus } from '../../lib/cms/api';

const STATUS_FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'draft', label: 'Borrador' },
  { id: 'published', label: 'Publicados' },
  { id: 'paused', label: 'Pausados' },
];

const BOOL_FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'si', label: 'Sí' },
  { id: 'no', label: 'No' },
];

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((opt) => opt.id === value);
  const isActive = value !== '';

  useEffect(() => {
    const onDoc = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
          isActive
            ? 'bg-[#1717AF] text-white border-[#1717AF] shadow-md shadow-[#1717AF]/20'
            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1717AF]/50 hover:text-[#1717AF]'
        }`}
      >
        <span>{isActive ? `${label}: ${selected?.label}` : label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === opt.id
                  ? 'bg-[#1717AF]/10 text-[#1717AF] font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CmsList() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [destacado, setDestacado] = useState('');
  const [novedades, setNovedades] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPosts({ search: debouncedSearch, status, destacado, novedades });
      setPosts(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los artículos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, destacado, novedades]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        setSuggestions(await searchPostTitles(search));
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(suggestTimer.current);
  }, [search]);

  const handleTogglePause = async (post) => {
    const next = post.status === 'paused' ? 'published' : 'paused';
    try {
      await updatePostStatus(post.id, next);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (post) => {
    const ok = window.confirm(`¿Eliminar “${post.title || 'Sin título'}”? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await deletePost(post.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const emptyCatalog = !loading && !debouncedSearch && !status && !destacado && !novedades && posts.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-20" />
      </div>
      <CmsHeader subtitle="CMS Blog página WEB MD" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {!emptyCatalog && (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Buscar por título..."
                  className={`pl-9 pr-4 py-2.5 w-64 rounded-xl text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 ${
                    search
                      ? 'border-[#1717AF] bg-[#1717AF]/5 text-slate-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => navigate(`/cms/${s.id}`)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700"
                        >
                          {s.title || 'Sin título'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <FilterDropdown label="Estado" value={status} options={STATUS_FILTERS} onChange={setStatus} />
              <FilterDropdown label="Destacado" value={destacado} options={BOOL_FILTERS} onChange={setDestacado} />
              <FilterDropdown label="Novedades" value={novedades} options={BOOL_FILTERS} onChange={setNovedades} />
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/cms/nuevo')}
            className="ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1717AF] text-white text-sm font-medium shadow-md shadow-[#1717AF]/20 hover:bg-[#02214A] transition-colors"
          >
            <FilePlus2 size={16} /> Crear artículo
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && emptyCatalog && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-8 py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Newspaper className="text-[#1717AF]" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Aún no hay artículos</h3>
            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
              Crea el primero para el blog de MD English. Quedará en borrador hasta que lo publiques.
            </p>
            <button
              type="button"
              onClick={() => navigate('/cms/nuevo')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1717AF] text-white text-sm font-medium"
            >
              <FilePlus2 size={18} /> Crear primer artículo
            </button>
          </div>
        )}

        {!loading && !emptyCatalog && posts.length === 0 && (
          <p className="text-center text-slate-500 py-16">No hay artículos con esos filtros.</p>
        )}

        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <ArticleCard
                key={post.id}
                post={post}
                onEdit={() => navigate(`/cms/${post.id}`)}
                onPerformance={() => navigate(`/cms/${post.id}/performance`)}
                onTogglePause={() => handleTogglePause(post)}
                onDelete={() => handleDelete(post)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
