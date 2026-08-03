import { useEffect, useState } from 'react'

/**
 * Diálogo al salir de un slide con cambios sin guardar.
 * - Sí → upsert + navega (y opcionalmente un webhook si marcan el checkbox)
 * - Cancelar → no guarda y continúa
 *
 * @param {null | { label: string }} [webhookOption] — si hay, muestra checkbox opcional
 */
export default function SaveChangesDialog({
  open,
  saving = false,
  error = null,
  webhookOption = null,
  onSave,
  onSkip,
}) {
  const [sendWebhook, setSendWebhook] = useState(false)

  useEffect(() => {
    if (open) setSendWebhook(false)
  }, [open])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-changes-title"
        className="w-full max-w-sm rounded-2xl bg-white text-slate-900 shadow-2xl p-5 space-y-4"
      >
        <div>
          <h2 id="save-changes-title" className="text-base font-semibold">
            ¿Guardar cambios y continuar?
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Hay cambios en este slide. Si cancelas, no se guardan y se continúa.
          </p>
        </div>

        {webhookOption?.label && (
          <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={sendWebhook}
              onChange={(e) => setSendWebhook(e.target.checked)}
              disabled={saving}
              className="mt-0.5 accent-[#1717AF] cursor-pointer"
            />
            <span className="text-sm text-slate-700 leading-snug">{webhookOption.label}</span>
          </label>
        )}

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave?.({ sendWebhook })}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-[#1717AF] text-white hover:bg-[#14148f] disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando…' : 'Sí, guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
