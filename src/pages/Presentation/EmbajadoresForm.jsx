/**
 * Input del número de contactos (slide 34), centrado en el hueco del texto
 * "Obtenga uno de estos … Contactos…". Solo la cifra + su línea dorada.
 */

const FONT_SANS = '"Montserrat", system-ui, sans-serif'
const GOLD = '#E8C547'

export default function EmbajadoresForm({
  values = {},
  onChange,
  readOnly = false,
}) {
  const value = values.beneficio ?? ''

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
      style={{ containerType: 'size' }}
    >
      <div
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-end"
        style={{
          top: '81cqh',
          width: '5.2cqw',
          minWidth: '1.8rem',
          height: '4.2cqh',
        }}
      >
        {readOnly ? (
          <p
            style={{
              margin: 0,
              color: '#FFFFFF',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '2.2cqw',
              lineHeight: 1,
              textAlign: 'center',
              width: '100%',
              paddingBottom: '0.25cqh',
              borderBottom: `1.5px solid ${GOLD}`,
            }}
          >
            {value || '\u00A0'}
          </p>
        ) : (
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={value}
            onChange={(e) =>
              onChange?.('beneficio', e.target.value.replace(/\D/g, '').slice(0, 2))
            }
            placeholder=""
            aria-label="Beneficio — número de contactos (máx. 2 dígitos)"
            className="bg-transparent border-0 outline-none text-center focus:outline-none"
            style={{
              color: '#FFFFFF',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '2.2cqw',
              lineHeight: 1,
              width: '100%',
              padding: 0,
              paddingBottom: '0.25cqh',
              caretColor: GOLD,
              borderBottom: `1.5px solid ${GOLD}`,
              background: 'transparent',
            }}
          />
        )}
      </div>
    </div>
  )
}
