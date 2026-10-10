import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Columns2,
  Plus,
  Trash2,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { BLOCK_TYPES, createBlock } from '../../../lib/cms/blocks';
import RichTextBlock from './RichTextBlock';
import MediaField from './MediaField';

const ADD_OPTIONS = [
  { type: BLOCK_TYPES.H2, label: 'Título', icon: Heading2 },
  { type: BLOCK_TYPES.H3, label: 'Subtítulo', icon: Heading3 },
  { type: BLOCK_TYPES.PARAGRAPH, label: 'Párrafo', icon: Type },
  { type: BLOCK_TYPES.OL, label: 'Numeración', icon: ListOrdered },
  { type: BLOCK_TYPES.UL, label: 'Viñetas', icon: List },
  { type: BLOCK_TYPES.MEDIA, label: 'Media 16:9', icon: ImageIcon },
  { type: BLOCK_TYPES.SPLIT, label: 'Texto + media 1:1', icon: Columns2 },
];

function ListItems({ items, onChange }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            placeholder={`Ítem ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="p-2 text-slate-400 hover:text-rose-600"
            disabled={items.length === 1}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="text-sm font-medium text-[#1717AF] hover:underline"
      >
        + Añadir ítem
      </button>
    </div>
  );
}

function BlockBody({ block, postId, onChange }) {
  switch (block.type) {
    case BLOCK_TYPES.H2:
    case BLOCK_TYPES.H3: {
      const isH2 = block.type === BLOCK_TYPES.H2;
      return (
        <input
          value={block.text || ''}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder={isH2 ? 'Título de sección' : 'Subtítulo'}
          className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${isH2 ? 'text-xl font-bold' : 'text-lg font-semibold'} text-slate-800`}
        />
      );
    }
    case BLOCK_TYPES.PARAGRAPH:
      return (
        <RichTextBlock
          value={block.html || ''}
          onChange={(html) => onChange({ ...block, html })}
        />
      );
    case BLOCK_TYPES.OL:
    case BLOCK_TYPES.UL:
      return <ListItems items={block.items || ['']} onChange={(items) => onChange({ ...block, items })} />;
    case BLOCK_TYPES.MEDIA:
      return (
        <MediaField
          postId={postId}
          url={block.url}
          alt={block.alt}
          kind={block.kind}
          aspectClass="aspect-video"
          helper="16:9 — se recorta al marco si el archivo no coincide"
          onChange={({ url, kind, alt }) => onChange({ ...block, url, kind, alt })}
        />
      );
    case BLOCK_TYPES.SPLIT:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <RichTextBlock
            value={block.html || ''}
            onChange={(html) => onChange({ ...block, html })}
            placeholder="Texto de la columna…"
          />
          <MediaField
            postId={postId}
            url={block.media?.url}
            alt={block.media?.alt}
            kind={block.media?.kind}
            aspectClass="aspect-square"
            helper="1:1 — media cuadrado"
            onChange={(media) => onChange({ ...block, media })}
          />
        </div>
      );
    default:
      return null;
  }
}

export default function BlockEditor({ postId, blocks, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const updateAt = (index, next) => {
    const copy = [...blocks];
    copy[index] = next;
    onChange(copy);
  };

  const move = (index, dir) => {
    const next = index + dir;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
  };

  const remove = (index) => onChange(blocks.filter((_, i) => i !== index));

  const add = (type) => {
    onChange([...blocks, createBlock(type)]);
    setMenuOpen(false);
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {ADD_OPTIONS.find((o) => o.type === block.type)?.label || block.type}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100" disabled={index === 0}>
                <ChevronUp size={16} />
              </button>
              <button type="button" onClick={() => move(index, 1)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100" disabled={index === blocks.length - 1}>
                <ChevronDown size={16} />
              </button>
              <button type="button" onClick={() => remove(index)} className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <BlockBody block={block} postId={postId} onChange={(next) => updateAt(index, next)} />
        </div>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-medium hover:border-[#1717AF] hover:text-[#1717AF] hover:bg-indigo-50/40"
        >
          <Plus size={18} /> Añadir bloque
        </button>
        {menuOpen && (
          <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ADD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => add(opt.type)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-indigo-50 hover:text-[#1717AF] text-left"
                >
                  <Icon size={16} /> {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
