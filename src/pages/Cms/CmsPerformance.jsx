import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, CalendarDays, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import CmsHeader from './components/CmsHeader';
import StatusBadge from './components/StatusBadge';
import { fetchPost, fetchPostViews, viewCountFromPost } from '../../lib/cms/api';

function dayKey(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function formatDay(key) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

function inLastDays(iso, days) {
  const t = new Date(iso).getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export default function CmsPerformance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPost(id), fetchPostViews(id)])
      .then(([p, v]) => {
        if (cancelled) return;
        setPost(p);
        setViews(v);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar el performance');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const kpis = useMemo(() => {
    const total = views.length || (post ? viewCountFromPost(post) : 0);
    const last7 = views.filter((v) => inLastDays(v.viewed_at, 7)).length;
    const last30 = views.filter((v) => inLastDays(v.viewed_at, 30)).length;
    const unique = new Set(views.map((v) => v.visitor_id).filter(Boolean)).size;
    return { total, last7, last30, unique };
  }, [views, post]);

  const chartData = useMemo(() => {
    const map = new Map();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    views.forEach((v) => {
      const key = dayKey(v.viewed_at);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([day, count]) => ({ day, label: formatDay(day), count }));
  }, [views]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse shadow-xl shadow-[#02214A]/20" />
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-[#1717AF]/20 border-t-[#1717AF] animate-spin" />
        </div>
        <p className="text-[#02214A] mt-6 font-medium font-bookman">Cargando performance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <CmsHeader subtitle="Performance del artículo" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => navigate('/cms')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft size={16} /> Volver al listado
        </button>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>
        )}

        {post && (
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0">
              {post.banner_url ? (
                <img src={post.banner_url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <div className="mb-2"><StatusBadge status={post.status} /></div>
              <h2 className="text-2xl font-bold text-slate-800">{post.title || 'Sin título'}</h2>
              <p className="text-slate-500 text-sm mt-1">
                {post.category?.name || 'Sin categoría'} · {post.author_name || 'Sin autor'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi icon={Eye} label="Visitas totales" value={kpis.total} />
          <Kpi icon={TrendingUp} label="Últimos 7 días" value={kpis.last7} />
          <Kpi icon={CalendarDays} label="Últimos 30 días" value={kpis.last30} />
          <Kpi icon={Eye} label="Visitantes únicos" value={kpis.unique} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Visitas en el tiempo (30 días)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cmsViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1717AF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1717AF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#1717AF" fill="url(#cmsViews)" name="Visitas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#1717AF] flex items-center justify-center mb-3">
        {icon({ size: 18 })}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
