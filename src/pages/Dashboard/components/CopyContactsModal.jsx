import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Loader2, Mail, MessageCircle, X } from 'lucide-react';
import { joinForClipboard } from '../copyContacts';

export default function CopyContactsModal({
  isOpen,
  onClose,
  loading = false,
  phones = [],
  emails = [],
  truncated = false,
}) {
  const [kind, setKind] = useState('phone');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setKind('phone');
    setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const values = kind === 'email' ? emails : phones;
  const canCopy = !loading && values.length > 0;

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(joinForClipboard(values));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar contactos:', error);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Copiar contactos</h3>
            <p className="text-xs text-slate-500 mt-0.5">De los leads que cumplen los filtros actuales</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando coincidencias…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setKind('phone'); setCopied(false); }}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all ${
                  kind === 'phone'
                    ? 'border-[#1717AF] bg-[#1717AF]/5 text-[#1717AF] shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-[#1717AF]/40'
                }`}
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  kind === 'phone' ? 'bg-[#1717AF] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <MessageCircle size={22} />
                </span>
                <span className="text-sm font-medium">WhatsApp</span>
                <span className="text-xs text-slate-500">{phones.length} número{phones.length === 1 ? '' : 's'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setKind('email'); setCopied(false); }}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all ${
                  kind === 'email'
                    ? 'border-[#1717AF] bg-[#1717AF]/5 text-[#1717AF] shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-[#1717AF]/40'
                }`}
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  kind === 'email' ? 'bg-[#1717AF] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Mail size={22} />
                </span>
                <span className="text-sm font-medium">Correo</span>
                <span className="text-xs text-slate-500">{emails.length} correo{emails.length === 1 ? '' : 's'}</span>
              </button>
            </div>
          )}

          {!loading && truncated && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Se alcanzó el tope de 15.000 leads. Aplica más filtros si faltan contactos.
            </p>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!canCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              canCopy
                ? 'bg-[#1717AF] text-white hover:bg-[#02214A] shadow-md shadow-[#1717AF]/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
