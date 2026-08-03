/**
 * Formulario "PLAN DE VINCULACIÓN" (slides 31 / 32 / 33) sobre bg.png.
 * - 31: top money + 3 alternativas + modalidad + fila extra (plan)
 * - 32: top money + modalidad + fila extra
 * - 33: 3 alternativas + fila extra
 */

import { computeInversionFinalHoy } from '../../lib/presentation/budget'
import {
  findPlanByNumero,
  optionFieldsFromPlan,
} from '../../lib/presentation/budgetPlanOptions'

const INK = '#0B1B4A'
const FONT_SANS = '"Montserrat", system-ui, sans-serif'
const FONT_SERIF = '"Playfair Display", Georgia, serif'

const FS = {
  title: '3.6cqw',
  section: '1.15cqw',
  label: '0.95cqw',
  body: '1.05cqw',
  money: '1.2cqw',
}

/** Miles con punto: 2000000 → 2.000.000 */
function formatThousands(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function stripThousands(raw) {
  return String(raw ?? '').replace(/\D/g, '')
}

function MoneyInput({ value, onChange, readOnly, local = false, className = '' }) {
  const isText = value != null && value !== '' && Number.isNaN(Number(String(value).replace(/,/g, '')))
  const display = isText
    ? String(value)
    : local
      ? formatThousands(value)
      : String(value ?? '')

  if (readOnly) {
    return (
      <p
        className={className}
        style={{
          margin: 0,
          color: INK,
          fontFamily: FONT_SANS,
          fontSize: FS.money,
          fontWeight: 500,
        }}
      >
        {display ? (isText ? display : `$ ${display}`) : ''}
      </p>
    )
  }
  if (isText) {
    return (
      <input
        type="text"
        value={display}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder=""
        className={`bg-transparent border-0 border-b border-[#0B1B4A]/25 focus:border-[#1717AF] focus:outline-none text-center ${className}`}
        style={{
          color: INK,
          fontFamily: FONT_SANS,
          fontSize: FS.money,
          fontWeight: 500,
          width: '9cqw',
          minWidth: '5.5rem',
        }}
      />
    )
  }
  return (
    <div className={`inline-flex items-baseline gap-1 ${className}`}>
      <span style={{ fontSize: FS.money, fontWeight: 600, color: INK }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const next = local ? stripThousands(e.target.value) : e.target.value.replace(/[^\d.,]/g, '')
          onChange?.(next)
        }}
        placeholder=""
        className="bg-transparent border-0 border-b border-[#0B1B4A]/25 focus:border-[#1717AF] focus:outline-none text-center"
        style={{
          color: INK,
          fontFamily: FONT_SANS,
          fontSize: FS.money,
          fontWeight: 500,
          width: local ? '11cqw' : '9cqw',
          minWidth: local ? '6.5rem' : '5.5rem',
        }}
      />
    </div>
  )
}

function UnderlineInput({
  value,
  onChange,
  onKeyDown,
  readOnly,
  className = '',
  style = {},
}) {
  if (readOnly) {
    return (
      <p
        className={className}
        style={{
          margin: 0,
          color: INK,
          fontFamily: FONT_SANS,
          fontSize: FS.body,
          borderBottom: '1px solid rgba(11,27,74,0.2)',
          minHeight: '1.4em',
          ...style,
        }}
      >
        {value || '\u00A0'}
      </p>
    )
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder=""
      className={`bg-transparent border-0 border-b border-[#0B1B4A]/25 focus:border-[#1717AF] focus:outline-none ${className}`}
      style={{ color: INK, fontFamily: FONT_SANS, fontSize: FS.body, width: '100%', ...style }}
    />
  )
}

function InlineField({
  value,
  onChange,
  readOnly,
  width = '7cqw',
  money = false,
  local = false,
}) {
  const display = money && local ? formatThousands(value) : value ?? ''
  const shown = money ? (display ? `$ ${display}` : '') : display

  if (readOnly) {
    return (
      <span
        style={{
          display: 'inline-block',
          minWidth: width,
          borderBottom: '1px solid rgba(11,27,74,0.25)',
          fontFamily: FONT_SANS,
          fontSize: FS.body,
          fontWeight: 600,
          color: INK,
          textAlign: 'center',
          padding: '0 0.2em',
        }}
      >
        {shown || '\u00A0'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-baseline" style={{ width, minWidth: '4rem' }}>
      {money && (
        <span style={{ fontFamily: FONT_SANS, fontSize: FS.body, fontWeight: 600, color: INK }}>
          $&nbsp;
        </span>
      )}
      <input
        type="text"
        value={display}
        onChange={(e) => {
          if (money && local) onChange?.(stripThousands(e.target.value))
          else onChange?.(e.target.value)
        }}
        placeholder=""
        className="inline-block bg-transparent border-0 border-b border-[#0B1B4A]/30 focus:border-[#1717AF] focus:outline-none text-center flex-1 min-w-0"
        style={{
          color: INK,
          fontFamily: FONT_SANS,
          fontSize: FS.body,
          fontWeight: 600,
          padding: '0 0.15em',
        }}
      />
    </span>
  )
}

function PlanCheckbox({ checked, onChange, disabled, ariaLabel }) {
  return (
    <label
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: '1.6cqw', minWidth: '1.1rem' }}
      title={ariaLabel}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-label={ariaLabel}
        className="accent-[#0B1B4A] cursor-pointer disabled:cursor-not-allowed"
        style={{ width: '1.05cqw', height: '1.05cqw', minWidth: '0.95rem', minHeight: '0.95rem' }}
      />
    </label>
  )
}

function ClearOptionButton({ onClick, disabled, ariaLabel = 'Reiniciar plan' }) {
  if (disabled) {
    return <span style={{ width: '1.4cqw', minWidth: '1rem' }} aria-hidden />
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center justify-center shrink-0 leading-none"
      style={{
        width: '1.4cqw',
        minWidth: '1rem',
        color: INK,
        opacity: 0.55,
        fontFamily: FONT_SANS,
        fontSize: FS.body,
        fontWeight: 600,
        background: 'none',
        border: 0,
        padding: 0,
        cursor: 'pointer',
      }}
    >
      ×
    </button>
  )
}

function rowHasContent(row) {
  return Boolean(
    String(row?.plan || '').trim() ||
      String(row?.inscripcion || '').trim() ||
      String(row?.meses || '').trim() ||
      String(row?.cuota_mensual || '').trim() ||
      String(row?.valor_aproximado || '').trim() ||
      row?.selected,
  )
}

function optionGridColumns(showCheckbox) {
  return showCheckbox
    ? 'auto 1.4fr 1.1fr 0.7fr 1.1fr 1.1fr auto'
    : '1.4fr 1.1fr 0.7fr 1.1fr 1.1fr auto'
}

function OptionRow({
  row,
  idx,
  readOnly,
  checkboxDisabled,
  onOptionChange,
  onPlanKeyDown,
  onSelect,
  onClear,
  showCheckbox,
}) {
  return (
    <div
      className="grid items-end"
      style={{
        gridTemplateColumns: optionGridColumns(showCheckbox),
        columnGap: '0.6cqw',
        paddingTop: '0.9cqh',
        paddingBottom: '0.5cqh',
        borderTop: '1px solid rgba(11,27,74,0.2)',
      }}
    >
      {showCheckbox && (
        <PlanCheckbox
          checked={row.selected}
          onChange={(on) => onSelect?.(idx, on)}
          disabled={readOnly || checkboxDisabled}
          ariaLabel={`Seleccionar plan ${row.plan || idx + 1}`}
        />
      )}
      <UnderlineInput
        value={row.plan}
        onChange={(v) => onOptionChange?.(idx, 'plan', v)}
        onKeyDown={(e) => onPlanKeyDown?.(idx, e)}
        readOnly={readOnly}
      />
      <div style={{ paddingLeft: '0.5cqw', borderLeft: '1px dashed rgba(11,27,74,0.25)' }}>
        <MoneyInput
          value={row.inscripcion}
          onChange={(v) => onOptionChange?.(idx, 'inscripcion', v)}
          readOnly={readOnly}
        />
      </div>
      <div style={{ paddingLeft: '0.5cqw', borderLeft: '1px dashed rgba(11,27,74,0.25)' }}>
        <UnderlineInput
          value={row.meses}
          onChange={(v) => onOptionChange?.(idx, 'meses', v)}
          readOnly={readOnly}
        />
      </div>
      <div style={{ paddingLeft: '0.5cqw', borderLeft: '1px dashed rgba(11,27,74,0.25)' }}>
        <MoneyInput
          value={row.cuota_mensual}
          onChange={(v) => onOptionChange?.(idx, 'cuota_mensual', v)}
          readOnly={readOnly}
        />
      </div>
      <div style={{ paddingLeft: '0.5cqw', borderLeft: '1px dashed rgba(11,27,74,0.25)' }}>
        <MoneyInput
          value={row.valor_aproximado}
          onChange={(v) => onOptionChange?.(idx, 'valor_aproximado', v)}
          readOnly={readOnly}
          local
        />
      </div>
      <ClearOptionButton
        onClick={() => onClear?.(idx)}
        disabled={readOnly || !rowHasContent(row)}
        ariaLabel={`Reiniciar alternativa ${idx + 1}`}
      />
    </div>
  )
}

function OptionsHeader({ showCheckbox }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: optionGridColumns(showCheckbox),
        columnGap: '0.6cqw',
        marginBottom: '0.6cqh',
      }}
    >
      {showCheckbox && <span />}
      {['Plan', 'Inscripción', 'Meses', 'Cuota mensual', 'valor aproximado'].map((h, i) => (
        <span
          key={h}
          style={{
            fontWeight: 700,
            fontSize: FS.label,
            paddingLeft: i ? '0.5cqw' : 0,
            borderLeft: i ? '1px dashed rgba(11,27,74,0.25)' : 'none',
          }}
        >
          {h}
        </span>
      ))}
      <span />
    </div>
  )
}

/**
 * @param {object} props
 * @param {object[]} [props.planCatalog]
 * @param {boolean} [props.twoPersons]
 * @param {string} [props.descuentoLabel] - "15%" | "20%"
 */
export default function PlanVinculacionForm({
  budget = {},
  options = [{}, {}, {}, {}],
  onBudgetChange,
  onOptionChange,
  onClearOption,
  onSelectOption,
  onSelectModalidad,
  planCatalog = [],
  twoPersons = false,
  descuentoLabel = '15%',
  readOnly = false,
  showTopMoney = true,
  showOptionsTable = true,
  showModalidad = true,
  showExtraPlan = true,
}) {
  const setBudget = (field, value) => {
    const next = { ...budget, [field]: value }
    if (field === 'inversion_regular' || field === 'bono') {
      next.inversion_final_hoy = computeInversionFinalHoy(
        field === 'inversion_regular' ? value : next.inversion_regular,
        field === 'bono' ? value : next.bono,
      )
    }
    onBudgetChange?.(next)
  }

  const handlePlanKeyDown = (idx, e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const raw = options[idx]?.plan
    const plan = findPlanByNumero(planCatalog, raw)
    if (!plan) return
    const fields = optionFieldsFromPlan(plan)
    if (!fields) return
    for (const [key, val] of Object.entries(fields)) {
      onOptionChange?.(idx, key, val)
    }
  }

  const planTitle = twoPersons ? 'PLAN PLATINUM' : 'PLAN ELITE'
  const vinculacion = budget.valor_vinculacion || budget.inversion_final_hoy
  const rows = Array.from({ length: 4 }, (_, i) => options[i] || {})
  /** Plan ya resuelto del catálogo (no solo el número tipado). */
  const isOptionResolved = (row) => {
    const plan = String(row?.plan || '').trim()
    if (!plan) return false
    const hasDetails = Boolean(
      String(row?.inscripcion || '').trim() ||
        String(row?.meses || '').trim() ||
        String(row?.cuota_mensual || '').trim(),
    )
    if (hasDetails) return true
    return Number.isNaN(Number(plan))
  }
  const hasPlanName = isOptionResolved

  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
      style={{ color: INK, containerType: 'size' }}
    >
      <div
        className="pointer-events-auto h-full w-full flex flex-col justify-center"
        style={{
          fontFamily: FONT_SANS,
          padding: '7cqh 16cqw 8cqh 6.5cqw',
        }}
      >
        <div
          className={`flex items-start gap-4 ${showTopMoney ? 'justify-between' : ''}`}
          style={{ marginBottom: '2.8cqh' }}
        >
          <h1
            style={{
              margin: 0,
              color: INK,
              fontFamily: FONT_SERIF,
              fontWeight: 700,
              fontSize: FS.title,
              letterSpacing: '0.01em',
              lineHeight: 1.05,
            }}
          >
            PLAN DE
            <br />
            VINCULACIÓN
          </h1>

          {showTopMoney && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: '1fr 1fr 1fr',
                columnGap: '1.4cqw',
                minWidth: '42cqw',
                paddingTop: '0.6cqh',
              }}
            >
              {[
                { key: 'inversion_regular', label: 'Inversión regular' },
                { key: 'bono', label: 'Bono' },
                { key: 'inversion_final_hoy', label: 'Inversión final hoy' },
              ].map((col, i) => (
                <div
                  key={col.key}
                  className="flex flex-col items-center text-center"
                  style={{
                    paddingLeft: i ? '0.8cqw' : 0,
                    borderLeft: i ? '1.5px dashed rgba(11,27,74,0.35)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: FS.label, marginBottom: '0.5cqh' }}>
                    {col.label}
                  </span>
                  <MoneyInput
                    value={budget[col.key]}
                    onChange={(v) => setBudget(col.key, v)}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {showOptionsTable && (
          <div style={{ marginBottom: '2.8cqh' }}>
            <h2
              style={{
                margin: 0,
                marginBottom: '1.4cqh',
                fontWeight: 700,
                fontSize: FS.section,
                letterSpacing: '0.04em',
              }}
            >
              ALTERNATIVAS DE INVERSIÓN
            </h2>

            <OptionsHeader showCheckbox />
            {rows.slice(0, 3).map((row, idx) => (
              <OptionRow
                key={idx}
                row={row}
                idx={idx}
                readOnly={readOnly}
                checkboxDisabled={!hasPlanName(row) && !row.selected}
                onOptionChange={onOptionChange}
                onPlanKeyDown={handlePlanKeyDown}
                onSelect={onSelectOption}
                onClear={onClearOption}
                showCheckbox
              />
            ))}
          </div>
        )}

        {showModalidad && (
          <div style={{ marginBottom: '2.2cqh' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '1.2cqh' }}>
              <PlanCheckbox
                checked={budget.modalidad_selected}
                onChange={(on) => onSelectModalidad?.(on)}
                disabled={readOnly}
                ariaLabel="Seleccionar modalidad de contado"
              />
              <h2
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: FS.section,
                  letterSpacing: '0.03em',
                }}
              >
                MODALIDAD DE CONTADO ({planTitle})
              </h2>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: FS.body,
                lineHeight: 1.75,
                fontWeight: 400,
              }}
            >
              Accederá a un beneficio exclusivo de{' '}
              <InlineField
                value={budget.beneficio_exclusivo}
                onChange={(v) => setBudget('beneficio_exclusivo', v)}
                readOnly={readOnly}
                width="6.5cqw"
                money
              />{' '}
              correspondiente al {descuentoLabel} sobre el valor de vinculación. Esto significa que,
              en lugar de invertir{' '}
              <InlineField
                value={vinculacion}
                onChange={(v) => setBudget('valor_vinculacion', v)}
                readOnly={readOnly}
                width="6.5cqw"
                money
              />
              , su inversión final será de{' '}
              <InlineField
                value={budget.inversion_final}
                onChange={(v) => setBudget('inversion_final', v)}
                readOnly={readOnly}
                width="6.5cqw"
                money
              />
              , equivalente a cerca de{' '}
              <InlineField
                value={budget.equivalente_a}
                onChange={(v) => setBudget('equivalente_a', v)}
                readOnly={readOnly}
                width="11cqw"
                money
                local
              />{' '}
              en su moneda local, según la tasa de cambio vigente.
            </p>
          </div>
        )}

        {showExtraPlan && (
          <ExtraPlanLine
            row={rows[3]}
            readOnly={readOnly}
            onOptionChange={onOptionChange}
            onPlanKeyDown={handlePlanKeyDown}
            onSelect={onSelectOption}
            onClear={onClearOption}
            resolved={hasPlanName(rows[3])}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Bajo modalidad: línea corta vacía → número + Enter →
 * checkbox + "Plan X / Inscripción … / … / Valor aproximado: …" + ×
 */
function ExtraPlanLine({
  row,
  readOnly,
  onOptionChange,
  onPlanKeyDown,
  onSelect,
  onClear,
  resolved,
}) {
  if (!resolved) {
    return (
      <div
        style={{
          borderTop: '1px solid rgba(11,27,74,0.2)',
          paddingTop: '1.1cqh',
        }}
      >
        <UnderlineInput
          value={row.plan}
          onChange={(v) => onOptionChange?.(3, 'plan', v)}
          onKeyDown={(e) => onPlanKeyDown?.(3, e)}
          readOnly={readOnly}
          style={{ maxWidth: '8cqw', minWidth: '3.5rem', textAlign: 'center' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2"
      style={{
        borderTop: '1px solid rgba(11,27,74,0.2)',
        paddingTop: '1.1cqh',
        fontSize: FS.body,
        lineHeight: 1.7,
        fontWeight: 400,
        whiteSpace: 'nowrap',
      }}
    >
      <PlanCheckbox
        checked={row.selected}
        onChange={(on) => onSelect?.(3, on)}
        disabled={readOnly}
        ariaLabel="Seleccionar plan adicional"
      />
      <div className="flex items-baseline gap-1 min-w-0 flex-1">
        <span>
          Plan <strong style={{ fontWeight: 700 }}>{row.plan}</strong>
          {' / '}
          Inscripción <strong style={{ fontWeight: 700 }}>{row.inscripcion}</strong>
          {' / '}
          Meses <strong style={{ fontWeight: 700 }}>{row.meses}</strong>
          {' / '}
          Cuota mensual <strong style={{ fontWeight: 700 }}>{row.cuota_mensual}</strong>
          {' / '}
          Valor aproximado:
        </span>
        <MoneyInput
          value={row.valor_aproximado}
          onChange={(v) => onOptionChange?.(3, 'valor_aproximado', v)}
          readOnly={readOnly}
          local
        />
      </div>
      <ClearOptionButton
        onClick={() => onClear?.(3)}
        disabled={readOnly}
        ariaLabel="Reiniciar plan adicional"
      />
    </div>
  )
}
