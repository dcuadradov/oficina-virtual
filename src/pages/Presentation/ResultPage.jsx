import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  getSlide,
  getSlideAnim,
  loadPresentationManifest,
} from '../../lib/presentation/loadManifest'
import { useSlideAnim } from '../../lib/presentation/useSlideAnim'
import { getPresentationRun } from '../../lib/presentation/runs'
import {
  getPresentationDataByRun,
  normalizePresentationData,
} from '../../lib/presentation/presentationData'
import {
  emptyBudget,
  emptyBudgetOptions,
  getBudgetByRun,
  getBudgetOptionsByRun,
  normalizeBudget,
  normalizeBudgetOptions,
} from '../../lib/presentation/budget'
import SlideFrame from './SlideFrame'
import SlideStage from './SlideStage'
import SlideFormPanel from './SlideFormPanel'
import HistorialMedicoForm from './HistorialMedicoForm'
import ConfirmacionClinicaForm from './ConfirmacionClinicaForm'
import PlanVinculacionForm from './PlanVinculacionForm'
import EmbajadoresForm from './EmbajadoresForm'
import SlideNavSidebar from './SlideNavSidebar'

/**
 * Replay público de una presentación generada.
 * Datos asociados al run_id (presentation_data + budget + options).
 */
export default function ResultPage() {
  const { cardId, version } = useParams()

  const [manifest, setManifest] = useState(null)
  const [run, setRun] = useState(null)
  const [lead, setLead] = useState(null)
  const [formData, setFormData] = useState({})
  const [budget, setBudget] = useState(() => emptyBudget())
  const [budgetOptions, setBudgetOptions] = useState(() => emptyBudgetOptions(4))
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  /** El último movimiento fue hacia atrás: el slide se muestra ya animado. */
  const [navBack, setNavBack] = useState(false)

  const path = useMemo(() => {
    const raw = run?.path
    return Array.isArray(raw) ? raw : []
  }, [run])

  const currentEntry = path[index] || null
  const slide = useMemo(
    () => (manifest && currentEntry ? getSlide(manifest, currentEntry.slideId) : null),
    [manifest, currentEntry],
  )

  const activeForm = useMemo(() => {
    if (!manifest || !slide?.formKey) return null
    return manifest.forms?.[slide.formKey] || null
  }, [manifest, slide])

  const slideAnim = useMemo(() => getSlideAnim(manifest, slide), [manifest, slide])
  const anim = useSlideAnim(slideAnim, { startRevealed: navBack })
  const waitingClick = anim.pending && !slideAnim?.steps?.[anim.step]?.auto

  const goNext = useCallback(() => {
    if (waitingClick) {
      anim.advance()
      return
    }
    setNavBack(false)
    setIndex((i) => Math.min(i + 1, Math.max(path.length - 1, 0)))
  }, [waitingClick, anim, path.length])

  const goPrev = useCallback(() => {
    setNavBack(true)
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  const jumpToPathIndex = useCallback(
    (nextIndex) => {
      if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= path.length) return
      if (nextIndex === index) return
      setNavBack(nextIndex < index)
      setIndex(nextIndex)
    },
    [path.length, index],
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [m, r] = await Promise.all([
          loadPresentationManifest(),
          getPresentationRun(cardId, version),
        ])
        if (!active) return
        if (!r) throw new Error('No se encontró esta presentación')

        const [dataRow, budgetRow, optionRows, leadRes] = await Promise.all([
          getPresentationDataByRun(r.id).catch(() => null),
          getBudgetByRun(r.id).catch(() => null),
          getBudgetOptionsByRun(r.id).catch(() => []),
          supabase
            .from('leads')
            .select('card_id, nombre, ocupacion, edad, nivel_ingles')
            .eq('card_id', cardId)
            .maybeSingle()
            .then((res) => res)
            .catch(() => ({ data: null, error: null })),
        ])
        if (!active) return

        const liveLead = !leadRes?.error ? leadRes?.data : null
        const snap = r.lead_snapshot || {}
        setLead(
          liveLead || {
            nombre: snap.nombre,
            ocupacion: snap.ocupacion,
            edad: snap.edad,
            nivel_ingles: snap.nivel_ingles,
          },
        )
        setFormData(normalizePresentationData(dataRow || r.form_data))
        setBudget(normalizeBudget(budgetRow))
        setBudgetOptions(normalizeBudgetOptions(optionRows))
        setManifest(m)
        setRun(r)
        setIndex(0)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [cardId, version])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        setChromeVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-white/60" size={28} />
      </div>
    )
  }

  if (error || !manifest || !run || !slide) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3 p-6">
        <p className="text-sm text-white/70">{error || 'Presentación no disponible'}</p>
        <Link to="/login" className="text-sm text-sky-400 hover:underline">
          Ir al portal
        </Link>
      </div>
    )
  }

  const atStart = index <= 0
  const atEnd = index >= path.length - 1
  const isHistorial = activeForm?.layout === 'historial_medico'
  const isConfirmacion = activeForm?.layout === 'confirmacion_clinica'
  const isPlan = activeForm?.layout === 'plan_vinculacion'
  const isEmbajadores = activeForm?.layout === 'embajadores'
  const lightSlide = activeForm?.theme === 'light'
  const lightBg = isPlan || isConfirmacion ? '#F4F3F0' : '#F3EDE4'

  return (
    <div className={`fixed inset-0 text-white select-none ${lightSlide ? '' : 'bg-black'}`} style={lightSlide ? { background: lightBg } : undefined}>
      <SlideFrame>
        <SlideStage manifest={manifest} slide={slide} anim={slideAnim} step={anim.step} />

        {isHistorial && (
          <HistorialMedicoForm leadValues={lead || {}} values={formData} readOnly />
        )}

        {isConfirmacion && (
          <ConfirmacionClinicaForm values={formData} readOnly />
        )}

        {isPlan && (
          <PlanVinculacionForm
            budget={budget}
            options={budgetOptions}
            readOnly
            twoPersons={
              Number(budget.beneficio_exclusivo) > 0 &&
              Number(budget.valor_vinculacion || budget.inversion_final_hoy) > 0 &&
              Number(budget.beneficio_exclusivo) /
                Number(budget.valor_vinculacion || budget.inversion_final_hoy) >
                0.17
            }
            descuentoLabel={
              Number(budget.beneficio_exclusivo) > 0 &&
              Number(budget.valor_vinculacion || budget.inversion_final_hoy) > 0 &&
              Number(budget.beneficio_exclusivo) /
                Number(budget.valor_vinculacion || budget.inversion_final_hoy) >
                0.17
                ? '20%'
                : '15%'
            }
            showTopMoney={activeForm?.showTopMoney !== false}
            showOptionsTable={activeForm?.showOptionsTable !== false}
            showModalidad={activeForm?.showModalidad !== false}
            showExtraPlan
          />
        )}

        {isEmbajadores && !anim.pending && (
          <EmbajadoresForm values={formData} readOnly />
        )}

        {activeForm && !isHistorial && !isConfirmacion && !isPlan && !isEmbajadores && (
          <SlideFormPanel formDef={activeForm} values={formData} readOnly />
        )}
      </SlideFrame>

      {chromeVisible && (
        <SlideNavSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          manifest={manifest}
          items={path}
          activeIndex={index}
          onSelect={jumpToPathIndex}
          light={lightSlide}
          title="Recorrido"
        />
      )}

      {chromeVisible && (
        <header
          className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 ${
            lightSlide
              ? 'bg-gradient-to-b from-white/80 to-transparent'
              : 'bg-gradient-to-b from-black/70 to-transparent'
          }`}
        >
          <div className={`text-[10px] font-mono ${lightSlide ? 'text-slate-400' : 'text-white/45'}`}>
            v{run.version}
          </div>
          <div className="text-center min-w-0 px-3">
            <p className={`text-xs font-medium truncate ${lightSlide ? 'text-slate-800' : 'text-white/90'}`}>
              {lead?.nombre || 'Presentación'}
            </p>
            <p className={`text-[10px] truncate ${lightSlide ? 'text-slate-500' : 'text-white/45'}`}>
              {slide.label}
              {lead?.ocupacion ? ` · ${lead.ocupacion}` : ''}
            </p>
          </div>
          <p className={`text-[10px] tabular-nums ${lightSlide ? 'text-slate-400' : 'text-white/40'}`}>
            {index + 1} / {path.length}
          </p>
        </header>
      )}

      {chromeVisible && (
        <footer
          className={`absolute bottom-0 inset-x-0 z-20 px-4 ${
            lightSlide
              ? 'pb-4 pt-2 pointer-events-none'
              : 'pb-5 pt-10 bg-gradient-to-t from-black/80 to-transparent'
          }`}
        >
          <div className={`max-w-md mx-auto flex flex-col items-center gap-3 ${lightSlide ? 'pointer-events-auto' : ''}`}>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={atStart}
                onClick={goPrev}
                className={`w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                  lightSlide
                    ? 'bg-black/5 hover:bg-black/10 text-slate-800'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
                aria-label="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                disabled={atEnd && !waitingClick}
                onClick={goNext}
                className={`h-11 rounded-full flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-md ${
                  waitingClick ? 'px-5 text-sm font-semibold' : 'w-11'
                } ${
                  lightSlide
                    ? 'bg-[#0B1B4A] text-white hover:bg-[#071230]'
                    : 'bg-white text-slate-900 hover:bg-white/90'
                }`}
                aria-label={waitingClick ? 'Continuar' : 'Siguiente'}
              >
                {waitingClick ? 'Continuar' : <ChevronRight size={20} />}
              </button>
            </div>
            {!lightSlide && (
              <p className="text-center text-[10px] text-white/35">
                Solo lectura · recorrido generado
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
