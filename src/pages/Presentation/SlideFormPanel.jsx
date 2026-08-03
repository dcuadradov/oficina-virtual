/**
 * Panel de formulario sobre un slide (editable o solo lectura).
 */
export default function SlideFormPanel({
  formDef,
  values,
  onChange,
  readOnly = false,
}) {
  if (!formDef?.fields?.length) return null

  const align = formDef.panel?.align || 'center'
  const alignClass =
    align === 'left'
      ? 'items-start pl-[8%] pr-[35%]'
      : align === 'right'
        ? 'items-end pl-[35%] pr-[8%]'
        : 'items-center px-[18%]'

  return (
    <div
      className={`absolute inset-0 z-10 flex ${alignClass} justify-center pointer-events-none`}
    >
      <div className="pointer-events-auto w-full max-w-md my-auto rounded-2xl bg-white/92 backdrop-blur-sm border border-slate-200/80 shadow-xl p-5 space-y-3">
        {formDef.title && (
          <h3 className="text-sm font-semibold text-slate-800">{formDef.title}</h3>
        )}
        {formDef.subtitle && (
          <p className="text-xs text-slate-500 -mt-1">{formDef.subtitle}</p>
        )}

        <div className="space-y-3">
          {formDef.fields.map((field) => {
            const value = values?.[field.id] ?? ''
            const label = field.label || field.id

            if (readOnly) {
              return (
                <div key={field.id} className="rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    {label}
                  </p>
                  <p className={`text-sm ${value ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {value || 'Sin dato'}
                  </p>
                </div>
              )
            }

            if (field.type === 'select' && Array.isArray(field.options)) {
              return (
                <div key={field.id}>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    {label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => onChange?.(field.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/25 focus:border-[#1717AF]/40"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.id}>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    {label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => onChange?.(field.id, e.target.value)}
                    rows={field.rows || 3}
                    placeholder={field.placeholder || ''}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/25 focus:border-[#1717AF]/40 resize-none"
                  />
                </div>
              )
            }

            return (
              <div key={field.id}>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  {label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange?.(field.id, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1717AF]/25 focus:border-[#1717AF]/40"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
