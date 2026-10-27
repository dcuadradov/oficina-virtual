import React from 'react';
import { BarChart3, Pause, Play, Pencil, Trash2, Star, Sparkles, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { viewCountFromPost } from '../../../lib/cms/api';

function formatDate(value) {
  if (!value) return 'Sin publicar';
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ArticleCard({ post, onEdit, onPerformance, onTogglePause, onDelete }) {
  const views = viewCountFromPost(post);
  const isPaused = post.status === 'paused';

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all overflow-hidden flex flex-col">
      <button type="button" onClick={onEdit} className="block text-left">
        <div className="aspect-video bg-slate-100 overflow-hidden">
          {post.banner_url ? (
            <img src={post.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">Sin banner</div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge status={post.status} />
            {post.category?.name && (
              <span className="text-xs font-medium text-[#1717AF] bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {post.category.name}
              </span>
            )}
            {post.destacado && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Star size={11} /> Destacado
              </span>
            )}
            {post.novedades && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                <Sparkles size={11} /> Novedades
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 line-clamp-2 mb-2">
            {post.title || 'Sin título'}
          </h3>
          <p className="text-sm text-slate-500">
            {post.author_name || 'Sin autor'} · {formatDate(post.published_at || post.updated_at)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Eye size={13} /> {views} visita{views === 1 ? '' : 's'}
          </p>
        </div>
      </button>
      <div className="px-5 pb-4 mt-auto flex items-center gap-1 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#1717AF] py-2 rounded-lg hover:bg-indigo-50"
        >
          <Pencil size={14} /> Editar
        </button>
        <button
          type="button"
          onClick={onPerformance}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#1717AF] py-2 rounded-lg hover:bg-indigo-50"
        >
          <BarChart3 size={14} /> Performance
        </button>
        {(post.status === 'published' || isPaused) && (
          <button
            type="button"
            onClick={onTogglePause}
            title={isPaused ? 'Reanudar' : 'Pausar'}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          title="Eliminar"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
