import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const TABS = [
  { id: 'participacion', label: 'Participación' },
  { id: 'tendencia', label: 'Tendencia' },
  { id: 'leads', label: 'Leads' },
];

export default function PitchRightPanel({
  pieData = [],
  colorMap = new Map(),
  trendData = [],
  leads = [],
  onOpenLead,
  unitSingular = 'persona',
  unitPlural = 'personas',
  pct = () => 0,
}) {
  const [tab, setTab] = useState('participacion');
  const unit = (n) => (n === 1 ? unitSingular : unitPlural);

  return (
    <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === item.id
                ? 'border-[#1717AF] text-[#1717AF]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
            {item.id === 'leads' && leads.length > 0 && (
              <span className="ml-1.5 text-xs font-medium text-slate-400 tabular-nums">
                {leads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'participacion' && (
        pieData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            Sin datos para mostrar
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={55}>
                  {pieData.map((d) => (
                    <Cell key={d.rawValue} fill={colorMap.get(d.rawValue) || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} ${unit(v)} (${pct(v)}%)`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      )}

      {tab === 'tendencia' && (
        pieData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            Sin datos para mostrar
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                {pieData.map((d) => (
                  <Line
                    key={d.rawValue}
                    type="monotone"
                    dataKey={d.name}
                    stroke={colorMap.get(d.rawValue) || '#cbd5e1'}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      )}

      {tab === 'leads' && (
        leads.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            Nadie coincide con este filtro
          </div>
        ) : (
          <div className="overflow-y-auto pr-1" style={{ maxHeight: '20rem' }}>
            {leads.map((lead) => (
              <button
                key={lead.card_id}
                type="button"
                onClick={() => onOpenLead?.(lead)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex-1 text-sm text-slate-700 truncate">{lead.nombre}</span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
