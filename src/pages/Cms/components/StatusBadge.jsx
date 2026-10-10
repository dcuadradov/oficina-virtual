import React from 'react';

const STYLES = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-slate-100 text-slate-600 border-slate-200',
};

const LABELS = {
  draft: 'Borrador',
  published: 'Publicado',
  paused: 'Pausado',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STYLES[status] || STYLES.draft}`}>
      {LABELS[status] || status}
    </span>
  );
}
