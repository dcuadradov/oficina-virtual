/**
 * Formulario "HISTORIAL MÉDICO" reconstruido sobre el fondo (bg.png).
 * Tipografía calibrada al deck (Playfair Display + Montserrat) y
 * tamaños relativos al marco 16:9 (container queries).
 */

import { AGE_OPTIONS_FALLBACK } from '../../lib/presentation/historialSave'

const ENGLISH_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const OCUPACION_OPTIONS = ['Especialista', 'Estudiante', 'Médico General', 'Residente']

const EVAL_ROWS = [
  { id: 'antecedentes', resultId: 'resultado_antecedentes', label: 'ANTECEDENTES' },
  { id: 'viabilidad', resultId: 'resultado_viabilidad', label: 'VIABILIDAD' },
  { id: 'autonomia', resultId: 'resultado_autonomia', label: 'AUTONOMÍA' },
  { id: 'conducta', resultId: 'resultado_conducta', label: 'CONDUCTA' },
]

const INK = '#0B1B4A'
const PLACEHOLDER = ''
const FONT_SANS = '"Montserrat", system-ui, sans-serif'
const FONT_SERIF = '"Playfair Display", Georgia, serif'

/** Tamaños en % del ancho del marco 16:9 (cqw). */
const FS = {
  title: '4.15cqw', // ~80px @ 1920
  label: '1.25cqw', // ~24px
  body: '1.12cqw', // ~21px
  hint: '0.95cqw', // ~18px
  result: '1.05cqw',
}

const underlineField = {
  width: '100%',
  background: 'transparent',
  border: 0,
  borderBottom: '1px solid rgba(11, 27, 74, 0.28)',
  outline: 'none',
  color: INK,
  fontFamily: FONT_SANS,
  fontSize: FS.body,
  fontWeight: 400,
  padding: '0.15em 0 0.2em',
  lineHeight: 1.35,
}

function LineField({
  value,
  onChange,
  readOnly,
  placeholder = PLACEHOLDER,
  type = 'text',
  options = null,
}) {
  if (readOnly) {
    return (
      <p
        style={{
          ...underlineField,
          minHeight: '1.55em',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || '\u00A0'}
      </p>
    )
  }

  if (options) {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ ...underlineField, cursor: 'pointer', appearance: 'none', paddingRight: '1.2em' }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={underlineField}
      className="placeholder:italic placeholder:text-[#0B1B4A]/35"
    />
  )
}

function EvalRow({ row, values, onChange, readOnly }) {
  const longVal = values?.[row.id] ?? ''
  const shortVal = values?.[row.resultId] ?? ''

  return (
    <div
      className="grid items-stretch"
      style={{
        gridTemplateColumns: '14cqw 1fr auto 12.5cqw',
        columnGap: '1.6cqw',
        minHeight: '7.2cqh',
      }}
    >
      <div className="flex items-center">
        <span
          style={{
            color: INK,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: FS.label,
            letterSpacing: '0.04em',
            lineHeight: 1.2,
          }}
        >
          {row.label}
        </span>
      </div>

      <div className="relative" style={{ paddingTop: '0.35cqh', paddingBottom: '0.35cqh' }}>
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{ top: '46%', borderTop: '1px solid rgba(11,27,74,0.18)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{ bottom: '6%', borderTop: '1px solid rgba(11,27,74,0.18)' }}
          aria-hidden
        />
        {readOnly ? (
          <p
            className="relative z-[1] whitespace-pre-wrap"
            style={{
              margin: 0,
              color: INK,
              fontFamily: FONT_SANS,
              fontSize: FS.body,
              lineHeight: 1.55,
              minHeight: '2.8em',
            }}
          >
            {longVal || '\u00A0'}
          </p>
        ) : (
          <textarea
            value={longVal}
            onChange={(e) => onChange?.(row.id, e.target.value)}
            placeholder={PLACEHOLDER}
            rows={2}
            className="relative z-[1] placeholder:italic placeholder:text-[#0B1B4A]/35"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '2.8em',
              resize: 'none',
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: INK,
              fontFamily: FONT_SANS,
              fontSize: FS.body,
              lineHeight: 1.55,
            }}
          />
        )}
      </div>

      <div
        className="self-stretch"
        style={{ width: 0, borderLeft: '1.5px dashed rgba(11,27,74,0.35)' }}
        aria-hidden
      />

      <div className="flex flex-col justify-center" style={{ gap: '0.45cqh', paddingLeft: '0.4cqw' }}>
        <span
          style={{
            color: INK,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: FS.result,
          }}
        >
          Resultado:
        </span>
        <LineField
          value={shortVal}
          onChange={(v) => onChange?.(row.resultId, v)}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.leadValues
 * @param {object} props.values
 * @param {(fieldId: string, value: string) => void} props.onLeadChange
 * @param {(fieldId: string, value: string) => void} props.onChange
 * @param {string[]} [props.ageOptions]
 * @param {boolean} [props.readOnly]
 */
export default function HistorialMedicoForm({
  leadValues = {},
  values = {},
  onLeadChange,
  onChange,
  ageOptions,
  readOnly = false,
}) {
  const ages = ageOptions?.length ? ageOptions : AGE_OPTIONS_FALLBACK

  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
      style={{ color: INK, containerType: 'size' }}
    >
      <div
        className="pointer-events-auto h-full w-full flex flex-col"
        style={{
          fontFamily: FONT_SANS,
          /* Reserva inferior para el botón Siguiente (~9% del alto del marco). */
          padding: '5.2cqh 5cqw 9.5cqh 9.2cqw',
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: '3.4cqh',
            color: INK,
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            fontSize: FS.title,
            letterSpacing: '0.01em',
            lineHeight: 1.05,
          }}
        >
          HISTORIAL MÉDICO
        </h1>

        {/* Bloque superior: lead */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1.15fr 0.9fr 1fr',
            columnGap: '3.2cqw',
            marginBottom: '3.6cqh',
          }}
        >
          <div className="flex flex-col" style={{ gap: '2.4cqh' }}>
            <div>
              <label
                className="block"
                style={{
                  fontWeight: 700,
                  fontSize: FS.label,
                  letterSpacing: '0.04em',
                  marginBottom: '0.7cqh',
                }}
              >
                NOMBRE
              </label>
              <LineField
                value={leadValues.nombre}
                onChange={(v) => onLeadChange?.('nombre', v)}
                readOnly={readOnly}
              />
            </div>
            <div>
              <label
                className="block"
                style={{
                  fontWeight: 700,
                  fontSize: FS.label,
                  letterSpacing: '0.04em',
                  marginBottom: '0.7cqh',
                }}
              >
                ESPECIALIDAD
              </label>
              <LineField
                value={leadValues.ocupacion}
                onChange={(v) => onLeadChange?.('ocupacion', v)}
                readOnly={readOnly}
                options={
                  leadValues.ocupacion && !OCUPACION_OPTIONS.includes(leadValues.ocupacion)
                    ? [leadValues.ocupacion, ...OCUPACION_OPTIONS]
                    : OCUPACION_OPTIONS
                }
              />
            </div>
          </div>

          <div>
            <label
              className="block"
              style={{
                fontWeight: 700,
                fontSize: FS.label,
                letterSpacing: '0.04em',
                marginBottom: '1cqh',
              }}
            >
              RANGO DE EDAD
            </label>
            <div className="flex flex-col" style={{ gap: '0.55cqh' }}>
              {ages.map((opt) => {
                const selected = String(leadValues.edad || '') === opt
                return (
                  <label
                    key={opt}
                    className={`inline-flex items-center ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{ gap: '0.55cqw', fontSize: FS.body, lineHeight: 1.25 }}
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: '0.95em',
                        height: '0.95em',
                        border: `1.5px solid ${selected ? INK : 'rgba(11,27,74,0.55)'}`,
                      }}
                    >
                      {selected && (
                        <span
                          className="rounded-full"
                          style={{ width: '55%', height: '55%', background: INK }}
                        />
                      )}
                    </span>
                    <input
                      type="radio"
                      name="historial-edad"
                      value={opt}
                      checked={selected}
                      disabled={readOnly}
                      onChange={() => onLeadChange?.('edad', opt)}
                      className="sr-only"
                    />
                    <span style={{ fontWeight: 500 }}>{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label
              className="block"
              style={{
                fontWeight: 700,
                fontSize: FS.label,
                letterSpacing: '0.04em',
                marginBottom: '0.7cqh',
              }}
            >
              NIVEL DE INGLÉS
            </label>
            <p
              style={{
                margin: 0,
                marginBottom: '1.4cqh',
                fontSize: FS.hint,
                fontWeight: 400,
                lineHeight: 1.35,
                opacity: 0.85,
              }}
            >
              Califica tu nivel de inglés del 1 al 10.
            </p>
            <LineField
              value={leadValues.nivel_ingles != null ? String(leadValues.nivel_ingles) : ''}
              onChange={(v) => onLeadChange?.('nivel_ingles', v)}
              readOnly={readOnly}
              options={ENGLISH_LEVELS}
              placeholder=""
            />
          </div>
        </div>

        {/* Filas de evaluación — espacio inferior reservado para no quedar bajo Siguiente */}
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ justifyContent: 'space-between', gap: '0.6cqh' }}
        >
          {EVAL_ROWS.map((row) => (
            <EvalRow
              key={row.id}
              row={row}
              values={values}
              onChange={onChange}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
