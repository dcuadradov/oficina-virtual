import { useState } from 'react'

const MAX_OBS = 220

/**
 * Modal al pulsar "Generar resultado".
 * Observaciones opcionales → se guardan en lead_presentation_data.observaciones.
 */
export default function ObservacionesDialog({
  saving = false,
  error = null,
  onCancel,
  onGenerate,
}) {
  const [text, setText] = useState('')
  const count = text.length
  const tooLong = count > MAX_OBS

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="observaciones-title"
        className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl p-5 space-y-4"
      >
        <div>
          <h2 id="observaciones-title" className="text-base font-semibold">
            Ingresar observaciones (opcional)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Este texto aparecerá en la propuesta, en “Observaciones de su asesor”.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Máximo {MAX_OBS} caracteres (incluidos espacios).
          </p>
        </div>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_OBS))}
            disabled={saving}
            rows={5}
            maxLength={MAX_OBS}
            placeholder="Escribe aquí…"
            className="w-full resize-y min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/30 focus:border-[#1717AF]"
          />
          <p
            className={`mt-1.5 text-xs text-right tabular-nums ${
              count >= MAX_OBS ? 'text-rose-600 font-medium' : 'text-slate-400'
            }`}
          >
            {count}/{MAX_OBS}
          </p>
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || tooLong}
            onClick={() => {
              if (text.length > MAX_OBS) return
              onGenerate?.(text)
            }}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Generando…' : 'Generar'}
          </button>
        </div>
      </div>
    </div>
  )
}
