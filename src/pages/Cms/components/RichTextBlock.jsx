import React, { useEffect, useRef } from 'react';
import { Link2 } from 'lucide-react';

export default function RichTextBlock({ value, onChange, placeholder = 'Escribe el párrafo…' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      if (document.activeElement !== ref.current) {
        ref.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const addLink = () => {
    const url = window.prompt('URL del enlace');
    if (!url) return;
    ref.current?.focus();
    document.execCommand('createLink', false, url);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white focus-within:border-[#1717AF] focus-within:ring-2 focus-within:ring-[#1717AF]/10">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-100">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-[#1717AF] rounded-md hover:bg-indigo-50"
        >
          <Link2 size={12} /> Enlace
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        data-placeholder={placeholder}
        className="cms-richtext min-h-[88px] px-3 py-2 text-sm text-slate-700 outline-none"
        onInput={() => onChange(ref.current?.innerHTML || '')}
      />
    </div>
  );
}
