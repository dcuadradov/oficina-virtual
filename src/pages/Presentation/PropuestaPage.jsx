import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getPresentationRun } from '../../lib/presentation/runs'
import {
  emptyBudget,
  emptyBudgetOptions,
  getBudgetByRun,
  getBudgetOptionsByRun,
  normalizeBudget,
  normalizeBudgetOptions,
} from '../../lib/presentation/budget'
import {
  discountLabelFromBudget,
  formatUsdAmount,
  hasSelectedPayment,
  isContadoPropuesta,
  orderedFinancingOptions,
} from '../../lib/presentation/propuesta'
import {
  getPresentationDataByRun,
  normalizePresentationData,
} from '../../lib/presentation/presentationData'
import './propuesta.css'

const SVG_OTRAS = '/brochure/landing-otras-desktop.svg'
const SVG_CONTADO = '/brochure/landing-contado-desktop.svg'

const OTRAS = { W: 1512, H: 8431 }
const CONTADO = { W: 1512, H: 8841 }

function usd(value) {
  return formatUsdAmount(value) || '________'
}

function pct(px, total) {
  return `${(px / total) * 100}%`
}

function ObservacionesOverlay({ text, dims, box }) {
  const note = String(text || '').trim()
  if (!note) return null
  const { W, H } = dims
  return (
    <div
      className="p-ov p-ov--observaciones"
      style={{
        left: pct(box.left, W),
        top: pct(box.top, H),
        width: pct(box.width, W),
        height: pct(box.height, H),
      }}
    >
      {note}
    </div>
  )
}

const OTRAS_OBS = { left: 80, top: 7720, width: 1340, height: 210 }
const CONTADO_OBS = { left: 80, top: 8090, width: 1340, height: 220 }

/* ─── OTRAS OPCIONES overlays ─── */
function OtrasOverlays({ budget, options, observaciones }) {
  const discount = discountLabelFromBudget(budget)
  const lines = orderedFinancingOptions(options)
  const { W, H } = OTRAS
  const showPayment = hasSelectedPayment(budget, options)

  return (
    <div className="p-overlays">
      {showPayment && (
        <>
          <div
            className="p-ov p-ov--econ-block"
            style={{
              left: pct(55, W),
              top: pct(5960, H),
              width: pct(980, W),
              height: pct(410, H),
            }}
          >
            {lines.slice(0, 3).map((item, index) => {
              const row = item.row
              const n = index + 1
              const cuotaRaw = String(row.cuota_mensual || '').trim()
              const meses = String(row.meses || '').trim() || '________'
              const inscripcion = usd(row.inscripcion)
              const noCuota = /no aplica/i.test(cuotaRaw)
              const cuota = noCuota ? null : usd(cuotaRaw)

              return (
                <div key={index} className="p-ov--option">
                  <div>
                    <strong>Opción {n}:</strong> Inscripción de USD {inscripcion}
                  </div>
                  <div>
                    {noCuota
                      ? 'Cuota mensual no aplica.'
                      : `${meses} cuotas mensuales de USD ${cuota} cada una.`}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="p-ov p-ov--contado-in-box"
            style={{
              left: pct(80, W),
              top: pct(6490, H),
              width: pct(1350, W),
              height: pct(250, H),
            }}
          >
            <div className="p-ov__heading">Pago de contado:</div>
            <div>
              Descuento del {discount}, equivalente a USD{' '}
              {usd(budget.beneficio_exclusivo)}, para un valor final de USD{' '}
              {usd(budget.inversion_final)}.
            </div>
          </div>
        </>
      )}

      <ObservacionesOverlay text={observaciones} dims={OTRAS} box={OTRAS_OBS} />
    </div>
  )
}

/* ─── CONTADO overlays ─── */
function ContadoOverlays({ budget, observaciones }) {
  const discount = discountLabelFromBudget(budget)
  const { W, H } = CONTADO
  const showPayment = hasSelectedPayment(budget)

  return (
    <div className="p-overlays">
      {showPayment && (
        <div
          className="p-ov p-ov--contado-block"
          style={{
            left: pct(480, W),
            top: pct(6980, H),
            width: pct(970, W),
            overflow: 'visible',
            textAlign: 'right',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.8cqw',
            padding: '0 3.5% 0 0',
          }}
        >
          <div style={{ fontSize: '2.52cqw' }}>
            Plan de pago seleccionado:
          </div>
          <div style={{
            fontSize: '2.8cqw',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '0.25em',
          }}>
            Pago de contado:
          </div>
          <div style={{ fontSize: '2.52cqw', lineHeight: '1.4' }}>
            Descuento del {discount}, equivalente a USD{' '}
            {usd(budget.beneficio_exclusivo)},
            <br />
            para un valor final de USD {usd(budget.inversion_final)}.
          </div>
        </div>
      )}

      <ObservacionesOverlay text={observaciones} dims={CONTADO} box={CONTADO_OBS} />
    </div>
  )
}

/* ─── MOCK DATA (preview mode) ─── */
const MOCK_BUDGET = {
  inversion_final_hoy: 2040,
  inversion_final: 1734,
  beneficio_exclusivo: 306,
  valor_vinculacion: 2040,
  modalidad_selected: null,
}
const MOCK_BUDGET_CONTADO = { ...MOCK_BUDGET, modalidad_selected: 'contado' }
const MOCK_OPTIONS = [
  { plan: 'A', inscripcion: 400, meses: '10', cuota_mensual: 164, selected: true },
  { plan: 'B', inscripcion: 200, meses: '12', cuota_mensual: 153.33, selected: false },
  { plan: 'C', inscripcion: 100, meses: '14', cuota_mensual: 138.57, selected: false },
]
const MOCK_OBSERVACIONES =
  'Quedamos pendientes de confirmar el horario de inicio y de revisar juntos el contrato antes de la vinculación.'

function isPreview(version) {
  return version === 'preview'
}

/* ─── PAGE ─── */
export default function PropuestaPage() {
  const { cardId, version } = useParams()
  const preview = isPreview(version)
  const [loading, setLoading] = useState(!preview)
  const [error, setError] = useState(null)
  const [budget, setBudget] = useState(() =>
    preview
      ? cardId === 'contado'
        ? MOCK_BUDGET_CONTADO
        : MOCK_BUDGET
      : emptyBudget(),
  )
  const [options, setOptions] = useState(() =>
    preview ? MOCK_OPTIONS : emptyBudgetOptions(4),
  )
  const [observaciones, setObservaciones] = useState(() =>
    preview ? MOCK_OBSERVACIONES : '',
  )

  useEffect(() => {
    if (preview) return
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const run = await getPresentationRun(cardId, version)
        if (!run) throw new Error('No se encontró esta propuesta')
        const [budgetRow, optionRows, dataRow] = await Promise.all([
          getBudgetByRun(run.id).catch(() => null),
          getBudgetOptionsByRun(run.id).catch(() => []),
          getPresentationDataByRun(run.id).catch(() => null),
        ])
        if (!active) return
        setBudget(normalizeBudget(budgetRow))
        setOptions(normalizeBudgetOptions(optionRows))
        setObservaciones(normalizePresentationData(dataRow).observaciones)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [cardId, version, preview])

  if (loading) {
    return (
      <div className="propuesta">
        <div className="p-state">
          <Loader2 className="animate-spin" size={28} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="propuesta">
        <div className="p-state">
          <p>{error}</p>
          <Link to="/login">Ir al portal</Link>
        </div>
      </div>
    )
  }

  const contado = isContadoPropuesta(budget)
  const svgSrc = contado ? SVG_CONTADO : SVG_OTRAS

  return (
    <div className="propuesta">
      <div className="p-svg-page">
        <img src={svgSrc} alt="Propuesta MD English" />
        {contado ? (
          <ContadoOverlays budget={budget} observaciones={observaciones} />
        ) : (
          <OtrasOverlays
            budget={budget}
            options={options}
            observaciones={observaciones}
          />
        )}
      </div>
    </div>
  )
}
