/**
 * Formulario "CONFIRMACIÓN CLÍNICA" (slide 29) sobre bg.png.
 * Misma tipografía / escala que Historial Médico.
 */

const ROWS = [
  { id: 'inquietudes_pendientes', label: ['Inquietudes', 'Pendientes'] },
  { id: 'hallazgos_relevantes', label: ['Hallazgos', 'Relevantes'] },
  { id: 'confirmacion_diagnostica', label: ['Confirmación', 'Diagnóstica'] },
  { id: 'contraindicaciones', label: ['Contraindicaciones'] },
  { id: 'conducta_propuesta', label: ['Conducta Propuesta'] },
]

const INK = '#0B1B4A'
const FONT_SANS = '"Montserrat", system-ui, sans-serif'
const FONT_SERIF = '"Playfair Display", Georgia, serif'

const FS = {
  title: '4.15cqw',
  label: '1.25cqw',
  body: '1.12cqw',
}

/** Líneas debajo del texto (no atraviesan el renglón). */
const LINED = {
  lineHeight: 1.7,
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.7em - 1px), rgba(11,27,74,0.22) calc(1.7em - 1px), rgba(11,27,74,0.22) 1.7em)',
  backgroundOrigin: 'content-box',
  backgroundAttachment: 'local',
}

function FormRow({ row, value, onChange, readOnly }) {
  const lines = 3

  return (
    <div
      className="grid items-start"
      style={{
        gridTemplateColumns: '18cqw 1fr',
        columnGap: '1.8cqw',
        minHeight: '11cqh',
      }}
    >
      <div className="flex items-start" style={{ paddingTop: '0.15em' }}>
        <span
          style={{
            color: INK,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: FS.label,
            letterSpacing: '0.02em',
            lineHeight: 1.2,
          }}
        >
          {row.label.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </div>

      <div style={{ minHeight: `${lines * 1.7}em` }}>
        {readOnly ? (
          <p
            className="whitespace-pre-wrap"
            style={{
              margin: 0,
              color: INK,
              fontFamily: FONT_SANS,
              fontSize: FS.body,
              minHeight: `${lines * 1.7}em`,
              ...LINED,
            }}
          >
            {value || '\u00A0'}
          </p>
        ) : (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange?.(row.id, e.target.value)}
            placeholder=""
            rows={lines}
            style={{
              width: '100%',
              height: '100%',
              minHeight: `${lines * 1.7}em`,
              resize: 'none',
              backgroundColor: 'transparent',
              border: 0,
              outline: 'none',
              color: INK,
              fontFamily: FONT_SANS,
              fontSize: FS.body,
              ...LINED,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function ConfirmacionClinicaForm({
  values = {},
  onChange,
  readOnly = false,
}) {
  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
      style={{ color: INK, containerType: 'size' }}
    >
      <div
        className="pointer-events-auto h-full w-full flex flex-col"
        style={{
          fontFamily: FONT_SANS,
          padding: '5.2cqh 14cqw 9.5cqh 8.5cqw',
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: '4.5cqh',
            color: INK,
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            fontSize: FS.title,
            letterSpacing: '0.01em',
            lineHeight: 1.05,
          }}
        >
          CONFIRMACIÓN CLÍNICA
        </h1>

        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ justifyContent: 'space-between', gap: '1.2cqh' }}
        >
          {ROWS.map((row) => (
            <FormRow
              key={row.id}
              row={row}
              value={values[row.id] ?? ''}
              onChange={onChange}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
