import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Wand2,
  Users,
  Loader2,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  getSlide,
  getSlideAnim,
  listManifestSlides,
  loadPresentationManifest,
} from '../../lib/presentation/loadManifest'
import {
  createPathEntry,
  getForkOption,
  isEndSlide,
  resolveExtraNext,
  resolveOptionNext,
  resolvePrimaryNext,
} from '../../lib/presentation/navEngine'
import {
  createPresentationRun,
  notifyPresentationGenerated,
  propuestaUrl,
  resultUrl,
} from '../../lib/presentation/runs'
import {
  emptyBudget,
  emptyBudgetOption,
  emptyBudgetOptions,
  isPlanDraftDirty,
  notifyContract,
  notifyPaymentLink,
  resolveSelectedPlanName,
  upsertBudgetDraft,
} from '../../lib/presentation/budget'
import {
  computeModalidadFromPlan,
  findPlanByUsuarios,
  listBudgetPlanOptions,
} from '../../lib/presentation/budgetPlanOptions'
import {
  associateDraftsToRun,
  discardPresentationDrafts,
} from '../../lib/presentation/draftLifecycle'
import {
  isHistorialDirty,
  loadAgeOptions,
  normalizeLeadDraft,
  saveHistorialChanges,
  AGE_OPTIONS_FALLBACK,
} from '../../lib/presentation/historialSave'
import { upsertPresentationData } from '../../lib/presentation/presentationData'
import { useSlideAnim } from '../../lib/presentation/useSlideAnim'
import SlideFrame from './SlideFrame'
import SlideStage from './SlideStage'
import SlideFormPanel from './SlideFormPanel'
import HistorialMedicoForm from './HistorialMedicoForm'
import ConfirmacionClinicaForm from './ConfirmacionClinicaForm'
import PlanVinculacionForm from './PlanVinculacionForm'
import EmbajadoresForm from './EmbajadoresForm'
import SaveChangesDialog from './SaveChangesDialog'
import ObservacionesDialog from './ObservacionesDialog'
import SlideNavSidebar from './SlideNavSidebar'

export default function PresentationPage() {
  const { cardId } = useParams()
  const navigate = useNavigate()

  const [manifest, setManifest] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [currentSlideId, setCurrentSlideId] = useState(null)
  const [path, setPath] = useState([])
  /** Índice actual dentro del recorrido visitado (no se trunca al saltar atrás). */
  const [pathIndex, setPathIndex] = useState(0)
  /** Segundo paso del fork (ej. ejercicios a/b/c/d en slide 16). */
  const [forkBranchOptions, setForkBranchOptions] = useState(null)
  /** El último movimiento fue hacia atrás: el slide se muestra ya animado. */
  const [navBack, setNavBack] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(null) // { version, url, propuestaUrl }
  const [generateError, setGenerateError] = useState(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exiting, setExiting] = useState(false)

  /** Valores editables en memoria (lead_presentation_data). */
  const [formData, setFormData] = useState({})
  /** Última versión persistida — para detectar dirty. */
  const [savedData, setSavedData] = useState({})
  /** Draft editable de campos del lead en este slide. */
  const [leadDraft, setLeadDraft] = useState({})
  const [savedLead, setSavedLead] = useState({})
  const [ageOptions, setAgeOptions] = useState(AGE_OPTIONS_FALLBACK)

  const [budget, setBudget] = useState(() => emptyBudget())
  const [savedBudget, setSavedBudget] = useState(() => emptyBudget())
  const [budgetOptions, setBudgetOptions] = useState(() => emptyBudgetOptions(4))
  const [savedBudgetOptions, setSavedBudgetOptions] = useState(() => emptyBudgetOptions(4))
  /** 'full' | 'comentarios' — según variante del plan visitado (31/32 vs 33). */
  const [planBudgetFields, setPlanBudgetFields] = useState('full')
  /** Toggle “2 personas” (Platinum vs Elite). */
  const [twoPersons, setTwoPersons] = useState(false)
  const [planCatalog, setPlanCatalog] = useState([])

  const [pendingNav, setPendingNav] = useState(null) // { nextId, choice } | { jumpToIndex } | { jumpToSlideId }
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const slide = useMemo(
    () => (manifest && currentSlideId ? getSlide(manifest, currentSlideId) : null),
    [manifest, currentSlideId],
  )

  const catalog = useMemo(() => listManifestSlides(manifest), [manifest])
  const catalogItems = useMemo(
    () => catalog.map((s) => ({ slideId: s.id })),
    [catalog],
  )
  const catalogIndex = useMemo(
    () => catalog.findIndex((s) => s.id === currentSlideId),
    [catalog, currentSlideId],
  )

  const activeForm = useMemo(() => {
    if (!manifest || !slide?.formKey) return null
    return manifest.forms?.[slide.formKey] || null
  }, [manifest, slide])

  const slideAnim = useMemo(() => getSlideAnim(manifest, slide), [manifest, slide])
  const anim = useSlideAnim(slideAnim, { startRevealed: navBack })
  // Mientras el paso pendiente sea de click, el avance manda sobre la navegación.
  const waitingClick = anim.pending && !slideAnim?.steps?.[anim.step]?.auto

  const isPlanForm = activeForm?.layout === 'plan_vinculacion'
  const budgetFieldsMode =
    (isPlanForm && activeForm?.budgetFields) || planBudgetFields || 'full'
  const formPersists = Boolean(activeForm?.persist)
  const dirty =
    formPersists &&
    (isHistorialDirty({ formData, savedData, leadDraft, savedLead }) ||
      (isPlanForm &&
        isPlanDraftDirty(budget, savedBudget, budgetOptions, savedBudgetOptions, {
          budgetFields: budgetFieldsMode,
        })))

  const isEmbajadores = activeForm?.layout === 'embajadores'
  const selectedPlanName = resolveSelectedPlanName(budget, budgetOptions, { twoPersons })

  /** Lectura síncrona al navegar (evita closure stale si el usuario pulsa Siguiente al instante). */
  const persistStateRef = useRef({})
  persistStateRef.current = {
    formPersists,
    formData,
    savedData,
    leadDraft,
    savedLead,
    budget,
    savedBudget,
    budgetOptions,
    savedBudgetOptions,
    isPlanForm,
    isEmbajadores,
    budgetFieldsMode,
    twoPersons,
    selectedPlanName,
  }
  const pathIndexRef = useRef(0)
  pathIndexRef.current = pathIndex
  const pathRef = useRef(path)
  pathRef.current = path

  const computePersistDirty = useCallback(() => {
    const s = persistStateRef.current
    if (!s.formPersists) return false
    return (
      isHistorialDirty({
        formData: s.formData,
        savedData: s.savedData,
        leadDraft: s.leadDraft,
        savedLead: s.savedLead,
      }) ||
      (s.isPlanForm &&
        isPlanDraftDirty(s.budget, s.savedBudget, s.budgetOptions, s.savedBudgetOptions, {
          budgetFields: s.budgetFieldsMode,
        }))
    )
  }, [])

  useEffect(() => {
    if (isPlanForm && activeForm?.budgetFields) {
      setPlanBudgetFields(activeForm.budgetFields)
    }
  }, [isPlanForm, activeForm?.budgetFields])

  /**
   * Avanza a un slide nuevo. Si estabas a mitad del recorrido, descarta solo
   * el "futuro" desde el índice actual y continúa desde ahí.
   */
  const goTo = useCallback((nextId, choice = null) => {
    if (!nextId) return
    setForkBranchOptions(null)
    setPendingNav(null)
    setSaveError(null)
    setNavBack(false)
    setPath((prev) => {
      const idx = pathIndexRef.current
      const base = prev.slice(0, idx + 1)
      const next = [...base, createPathEntry(nextId, choice)]
      setPathIndex(next.length - 1)
      setCurrentSlideId(nextId)
      return next
    })
  }, [])

  /**
   * Navega. Abre el diálogo si hay cambios; en embajadores también si ya hay plan
   * guardado (para preguntar por el contrato).
   */
  const requestNavigate = useCallback(
    (nextId, choice = null) => {
      if (!nextId) return
      const s = persistStateRef.current
      const askSave =
        computePersistDirty() || (s.isEmbajadores && Boolean(s.selectedPlanName))
      if (askSave) {
        setSaveError(null)
        setPendingNav({ nextId, choice })
        return
      }
      goTo(nextId, choice)
    },
    [computePersistDirty, goTo],
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // Cada entrada a la presentación empieza limpia (solo se conserva `leads`).
        await discardPresentationDrafts(cardId).catch((err) => {
          console.warn('[presentation] reset drafts:', err?.message || err)
        })

        const [m, leadRes, ages, plans] = await Promise.all([
          loadPresentationManifest(),
          supabase
            .from('leads')
            .select('card_id, nombre, ocupacion, edad, nivel_ingles')
            .eq('card_id', cardId)
            .maybeSingle(),
          loadAgeOptions(AGE_OPTIONS_FALLBACK),
          listBudgetPlanOptions().catch((err) => {
            console.warn('[presentation] plan catalog:', err?.message || err)
            return []
          }),
        ])
        if (!active) return
        if (leadRes.error) throw leadRes.error
        if (!leadRes.data) throw new Error('No se encontró el lead')

        setManifest(m)
        setLead(leadRes.data)
        const leadNorm = normalizeLeadDraft(leadRes.data)
        setLeadDraft(leadNorm)
        setSavedLead(leadNorm)
        setAgeOptions(ages)
        setPlanCatalog(plans)
        setFormData({})
        setSavedData({})
        setBudget(emptyBudget())
        setSavedBudget(emptyBudget())
        setBudgetOptions(emptyBudgetOptions(4))
        setSavedBudgetOptions(emptyBudgetOptions(4))
        setPlanBudgetFields('full')
        setTwoPersons(false)
        const startId = m.start
        setCurrentSlideId(startId)
        setPath([createPathEntry(startId)])
        setPathIndex(0)
        setForkBranchOptions(null)
        setGenerated(null)
        setGenerateError(null)
        setPendingNav(null)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [cardId])

  /** Replay: avanzar al siguiente del path sin truncar. */
  const advanceAlongPath = useCallback(() => {
    const prev = pathRef.current
    const idx = pathIndexRef.current
    if (idx >= prev.length - 1) return false
    const entry = prev[idx + 1]
    if (!entry?.slideId) return false
    setPendingNav(null)
    setForkBranchOptions(null)
    setNavBack(false)
    setPathIndex(idx + 1)
    setCurrentSlideId(entry.slideId)
    return true
  }, [])

  const handlePrimaryNext = useCallback(() => {
    if (!slide) return
    // A mitad del recorrido: rehacer el camino ya visitado.
    if (pathIndex < path.length - 1) {
      const replayId = path[pathIndex + 1]?.slideId
      const next = resolvePrimaryNext(slide)
      if (next && replayId && next === replayId) {
        advanceAlongPath()
        return
      }
      // Bifurcó distinto al camino guardado → se recorta el futuro en goTo.
      if (next) requestNavigate(next)
      return
    }
    const next = resolvePrimaryNext(slide)
    if (next) requestNavigate(next)
  }, [slide, pathIndex, path, requestNavigate, advanceAlongPath])

  const handleExtra = useCallback(() => {
    if (!slide) return
    const next = resolveExtraNext(slide)
    if (next) requestNavigate(next, { type: 'extra' })
  }, [slide, requestNavigate])

  const handleBranchOption = useCallback(
    (optionId) => {
      if (!slide) return
      const next = resolveOptionNext(slide, optionId)
      if (next) requestNavigate(next, { type: 'branch', optionId })
    },
    [slide, requestNavigate],
  )

  const handleForkOption = useCallback(
    (optionId) => {
      if (!slide) return
      const opt = getForkOption(slide, optionId)
      if (!opt) return
      if (opt.next) {
        requestNavigate(opt.next, { type: 'fork', optionId })
        return
      }
      if (opt.then?.type === 'branch' && opt.then.options) {
        setForkBranchOptions(opt.then.options)
      }
    },
    [slide, requestNavigate],
  )

  const handleForkBranchOption = useCallback(
    (optionId) => {
      const opt = forkBranchOptions?.find((o) => o.id === optionId)
      if (!opt?.next) return
      requestNavigate(opt.next, { type: 'fork_branch', optionId })
    },
    [forkBranchOptions, requestNavigate],
  )

  const handleBack = useCallback(() => {
    const idx = pathIndexRef.current
    const prev = pathRef.current
    if (idx <= 0 || !prev[idx - 1]) return
    setPendingNav(null)
    setNavBack(true)
    setForkBranchOptions(null)
    setPathIndex(idx - 1)
    setCurrentSlideId(prev[idx - 1].slideId)
  }, [])

  /** Salta a un slide ya visitado sin borrar el resto del recorrido. */
  const jumpToPathIndex = useCallback((index) => {
    const prev = pathRef.current
    if (!Number.isInteger(index) || index < 0 || index >= prev.length) return
    const entry = prev[index]
    if (!entry?.slideId) return
    const from = pathIndexRef.current
    setPendingNav(null)
    setSaveError(null)
    setNavBack(index < from)
    setForkBranchOptions(null)
    setPathIndex(index)
    setCurrentSlideId(entry.slideId)
  }, [])

  /** Salta a cualquier slide del deck. Si ya está en el path, no recorta el futuro. */
  const jumpToSlideId = useCallback((slideId) => {
    if (!slideId) return
    if (slideId === currentSlideId) return
    const prev = pathRef.current
    let existing = -1
    for (let i = prev.length - 1; i >= 0; i -= 1) {
      if (prev[i]?.slideId === slideId) {
        existing = i
        break
      }
    }
    if (existing >= 0) {
      jumpToPathIndex(existing)
      return
    }
    goTo(slideId, { type: 'jump' })
  }, [currentSlideId, jumpToPathIndex, goTo])

  const requestJumpToSlideId = useCallback(
    (slideId) => {
      if (!slideId || slideId === currentSlideId) return
      const s = persistStateRef.current
      const askSave =
        computePersistDirty() || (s.isEmbajadores && Boolean(s.selectedPlanName))
      if (askSave) {
        setSaveError(null)
        setPendingNav({ jumpToSlideId: slideId })
        return
      }
      jumpToSlideId(slideId)
    },
    [currentSlideId, computePersistDirty, jumpToSlideId],
  )

  const saveWebhookOption =
    selectedPlanName && isPlanForm
      ? { type: 'payment_link', label: 'Enviar link de pago' }
      : selectedPlanName && isEmbajadores
        ? { type: 'contract', label: 'Enviar el contrato' }
        : null

  const persistAllDrafts = useCallback(
    async ({ sendPaymentLink = false, sendContract = false } = {}) => {
      const saved = await saveHistorialChanges({
        cardId,
        formData,
        leadDraft,
        savedData,
        savedLead,
      })
      setFormData(saved.formData)
      setSavedData(saved.formData)
      setLeadDraft(saved.lead)
      setSavedLead(saved.lead)
      setLead((prev) => ({ ...prev, ...saved.lead }))

      const selectedPlan = resolveSelectedPlanName(budget, budgetOptions, { twoPersons })
      if (
        isPlanDraftDirty(budget, savedBudget, budgetOptions, savedBudgetOptions, {
          budgetFields: planBudgetFields,
        })
      ) {
        const bud = await upsertBudgetDraft(cardId, budget, budgetOptions, {
          budgetFields: planBudgetFields,
          twoPersons,
        })
        setBudget({ ...bud.budget })
        setSavedBudget({ ...bud.budget })
        setBudgetOptions(bud.options.map((row) => ({ ...row })))
        setSavedBudgetOptions(bud.options.map((row) => ({ ...row })))
      }

      if (sendPaymentLink && selectedPlan) {
        await notifyPaymentLink({ cardId, plan: selectedPlan })
      }
      if (sendContract && selectedPlan) {
        await notifyContract({ cardId, plan: selectedPlan })
      }

      return { formData: saved.formData, lead: saved.lead }
    },
    [
      cardId,
      formData,
      leadDraft,
      savedData,
      savedLead,
      budget,
      savedBudget,
      budgetOptions,
      savedBudgetOptions,
      planBudgetFields,
      twoPersons,
    ],
  )

  const applyPendingNav = useCallback(
    (nav) => {
      if (!nav) return
      if (Number.isInteger(nav.jumpToIndex)) {
        jumpToPathIndex(nav.jumpToIndex)
        return
      }
      if (nav.jumpToSlideId) {
        jumpToSlideId(nav.jumpToSlideId)
        return
      }
      goTo(nav.nextId, nav.choice)
    },
    [jumpToPathIndex, jumpToSlideId, goTo],
  )

  const handleSaveAndContinue = useCallback(
    async ({ sendWebhook = false } = {}) => {
      if (!pendingNav) return
      setSaving(true)
      setSaveError(null)
      try {
        await persistAllDrafts({
          sendPaymentLink: sendWebhook && saveWebhookOption?.type === 'payment_link',
          sendContract: sendWebhook && saveWebhookOption?.type === 'contract',
        })
        applyPendingNav(pendingNav)
      } catch (err) {
        setSaveError(
          err instanceof Error
            ? err.message
            : 'No se pudo guardar. ¿Aplicaste las migraciones de presentación?',
        )
      } finally {
        setSaving(false)
      }
    },
    [pendingNav, persistAllDrafts, applyPendingNav, saveWebhookOption],
  )

  const handleSkipAndContinue = useCallback(() => {
    if (!pendingNav) return
    setFormData(savedData)
    setLeadDraft(savedLead)
    setBudget(savedBudget)
    setBudgetOptions(savedBudgetOptions)
    applyPendingNav(pendingNav)
  }, [pendingNav, savedData, savedLead, savedBudget, savedBudgetOptions, applyPendingNav])

  const handleGenerate = useCallback(async (observaciones = '') => {
    if (!lead || generating) return
    setGenerating(true)
    setGenerateError(null)
    setCopied(false)
    try {
      const snapshot = await persistAllDrafts()
      await upsertPresentationData(cardId, {
        observaciones: String(observaciones || '').trim(),
      })

      const run = await createPresentationRun({
        cardId,
        path,
        formData: snapshot.formData,
        leadSnapshot: {
          nombre: snapshot.lead.nombre,
          ocupacion: snapshot.lead.ocupacion,
          edad: snapshot.lead.edad,
          nivel_ingles: snapshot.lead.nivel_ingles,
        },
      })
      await associateDraftsToRun(cardId, run.id)
      setNotesOpen(false)
      setGenerated({
        version: run.version,
        url: resultUrl(run.card_id, run.version),
        propuestaUrl: propuestaUrl(run.card_id, run.version),
      })

      try {
        await notifyPresentationGenerated({
          cardId: run.card_id,
          version: run.version,
        })
      } catch (whErr) {
        console.warn('[presentation] webhook:', whErr?.message || whErr)
      }
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar. ¿Aplicaste las migraciones de presentación?',
      )
    } finally {
      setGenerating(false)
    }
  }, [lead, cardId, path, generating, persistAllDrafts])

  const handleExit = useCallback(async () => {
    if (exiting) return
    setExiting(true)
    try {
      // Solo borra drafts (run_id IS NULL). Lo asociado a un Generar se conserva.
      await discardPresentationDrafts(cardId)
    } catch (err) {
      console.warn('[presentation] discard drafts:', err?.message || err)
    } finally {
      navigate(`/dashboard/${cardId}`)
    }
  }, [exiting, cardId, navigate])

  const handleFormChange = useCallback((fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleLeadChange = useCallback((fieldId, value) => {
    setLeadDraft((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleBudgetChange = useCallback((next) => {
    setBudget(next)
  }, [])

  const handleOptionChange = useCallback((index, field, value) => {
    setBudgetOptions((prev) => {
      const copy = prev.map((row) => ({ ...row }))
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }, [])

  const handleClearOption = useCallback((index) => {
    setBudgetOptions((prev) => {
      const copy = prev.map((row) => ({ ...row }))
      copy[index] = emptyBudgetOption()
      return copy
    })
  }, [])

  /** Solo un plan a la vez: alternativa / fila extra / modalidad. */
  const handleSelectOption = useCallback((index, on) => {
    setBudget((prev) => ({ ...prev, modalidad_selected: false }))
    setBudgetOptions((prev) =>
      prev.map((row, i) => ({ ...row, selected: on ? i === index : false })),
    )
  }, [])

  const handleSelectModalidad = useCallback((on) => {
    setBudget((prev) => ({ ...prev, modalidad_selected: Boolean(on) }))
    if (on) {
      setBudgetOptions((prev) => prev.map((row) => ({ ...row, selected: false })))
    }
  }, [])

  const canFillModalidad = Boolean(String(budget.inversion_final_hoy || '').trim())

  const handleFillModalidad = useCallback(() => {
    if (!canFillModalidad) return
    const fromCatalog = findPlanByUsuarios(planCatalog, twoPersons ? 2 : 1)
    const plan = fromCatalog || {
      descuento: twoPersons ? '20%' : '15%',
      plan_nombre: twoPersons ? 'Platinum' : 'Elite',
    }
    if (!fromCatalog) {
      console.warn('[presentation] catálogo de planes vacío; usando descuento Elite/Platinum')
    }
    const m = computeModalidadFromPlan(plan, budget.inversion_final_hoy)
    setBudget((prev) => ({
      ...prev,
      beneficio_exclusivo: m.beneficio_exclusivo,
      valor_vinculacion: m.valor_vinculacion,
      inversion_final: m.inversion_final,
      modalidad_selected: true,
    }))
    setBudgetOptions((prev) => prev.map((row) => ({ ...row, selected: false })))
  }, [canFillModalidad, planCatalog, twoPersons, budget.inversion_final_hoy])

  // Teclado: → / Space = siguiente (solo next / optional_extra); ← = atrás
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      if (pendingNav) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (waitingClick) {
          e.preventDefault()
          anim.advance()
          return
        }
        const navType = slide?.nav?.type
        if (navType === 'next' || navType === 'optional_extra') {
          e.preventDefault()
          handlePrimaryNext()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      } else if (e.key === 'Escape') {
        setChromeVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slide, handlePrimaryNext, handleBack, pendingNav, waitingClick, anim])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-white/60" size={28} />
      </div>
    )
  }

  if (error || !manifest || !slide) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 p-6">
        <p className="text-sm text-white/70">{error || 'No se pudo iniciar la presentación'}</p>
        <Link to={`/dashboard/${cardId}`} className="text-sm text-sky-400 hover:underline">
          Volver al lead
        </Link>
      </div>
    )
  }

  const nav = slide.nav
  const atEnd = isEndSlide(slide)
  const isHistorial = activeForm?.layout === 'historial_medico'
  const isConfirmacion = activeForm?.layout === 'confirmacion_clinica'
  const isPlan = activeForm?.layout === 'plan_vinculacion'
  const showModalidad = isPlan && activeForm?.showModalidad !== false
  const descuentoLabel = twoPersons ? '20%' : '15%'
  const lightSlide = activeForm?.theme === 'light'
  const lightBg = isPlan || isConfirmacion ? '#F4F3F0' : '#F3EDE4'

  return (
    <div className={`fixed inset-0 text-white select-none ${lightSlide ? '' : 'bg-black'}`} style={lightSlide ? { background: lightBg } : undefined}>
      <SlideFrame>
        <SlideStage manifest={manifest} slide={slide} anim={slideAnim} step={anim.step} />

        {isHistorial && (
          <HistorialMedicoForm
            leadValues={leadDraft}
            values={formData}
            onLeadChange={handleLeadChange}
            onChange={handleFormChange}
            ageOptions={ageOptions}
          />
        )}

        {isConfirmacion && (
          <ConfirmacionClinicaForm
            values={formData}
            onChange={handleFormChange}
          />
        )}

        {isPlan && (
          <PlanVinculacionForm
            budget={budget}
            options={budgetOptions}
            onBudgetChange={handleBudgetChange}
            onOptionChange={handleOptionChange}
            onClearOption={handleClearOption}
            onSelectOption={handleSelectOption}
            onSelectModalidad={handleSelectModalidad}
            planCatalog={planCatalog}
            twoPersons={twoPersons}
            descuentoLabel={descuentoLabel}
            showTopMoney={activeForm?.showTopMoney !== false}
            showOptionsTable={activeForm?.showOptionsTable !== false}
            showModalidad={activeForm?.showModalidad !== false}
            showExtraPlan
          />
        )}

        {isEmbajadores && !anim.pending && (
          <EmbajadoresForm values={formData} onChange={handleFormChange} />
        )}

        {activeForm && !isHistorial && !isConfirmacion && !isPlan && !isEmbajadores && (
          <SlideFormPanel
            formDef={activeForm}
            values={formData}
            onChange={handleFormChange}
          />
        )}
      </SlideFrame>

      <SaveChangesDialog
        open={Boolean(pendingNav)}
        saving={saving}
        error={saveError}
        webhookOption={saveWebhookOption}
        onSave={handleSaveAndContinue}
        onSkip={handleSkipAndContinue}
      />

      {notesOpen && (
        <ObservacionesDialog
          saving={generating}
          error={generateError}
          onCancel={() => {
            if (generating) return
            setNotesOpen(false)
            setGenerateError(null)
          }}
          onGenerate={handleGenerate}
        />
      )}

      {chromeVisible && (
        <SlideNavSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          manifest={manifest}
          items={catalogItems}
          activeIndex={catalogIndex}
          onSelect={(index) => requestJumpToSlideId(catalog[index]?.id)}
          light={lightSlide}
          title="Slides"
        />
      )}

      {/* Chrome superior */}
      {chromeVisible && (
        <header
          className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 ${
            lightSlide
              ? 'bg-gradient-to-b from-white/80 to-transparent text-slate-800'
              : 'bg-gradient-to-b from-black/70 to-transparent'
          }`}
        >
          <button
            type="button"
            onClick={handleExit}
            disabled={exiting}
            className={`inline-flex items-center gap-2 text-xs transition-colors disabled:opacity-50 ${
              lightSlide ? 'text-slate-600 hover:text-slate-900' : 'text-white/70 hover:text-white'
            }`}
          >
            {exiting ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeft size={14} />}
            Salir
          </button>
          <div className="text-center min-w-0 px-3">
            <p className={`text-xs font-medium truncate ${lightSlide ? 'text-slate-800' : 'text-white/90'}`}>
              {leadDraft?.nombre || lead?.nombre || 'Lead'}
            </p>
            <p className={`text-[10px] truncate ${lightSlide ? 'text-slate-500' : 'text-white/45'}`}>
              {slide.label}
              {(leadDraft?.ocupacion || lead?.ocupacion)
                ? ` · ${leadDraft?.ocupacion || lead?.ocupacion}`
                : ''}
              {(leadDraft?.edad || lead?.edad)
                ? ` · ${leadDraft?.edad || lead?.edad}`
                : ''}
              {(leadDraft?.nivel_ingles || lead?.nivel_ingles)
                ? ` · ${leadDraft?.nivel_ingles || lead?.nivel_ingles}`
                : ''}
            </p>
          </div>
          <p className={`text-[10px] font-mono tabular-nums ${lightSlide ? 'text-slate-400' : 'text-white/40'}`}>
            {catalogIndex >= 0 ? catalogIndex + 1 : '—'} / {catalog.length}
            {dirty ? ' · ·' : ''}
          </p>
        </header>
      )}

      {/* Controles inferiores */}
      {chromeVisible && (
        <footer
          className={`absolute bottom-0 inset-x-0 z-20 px-4 ${
            lightSlide ? 'pb-4 pt-2 pointer-events-none' : 'pb-5 pt-10 bg-gradient-to-t from-black/80 to-transparent'
          }`}
        >
          <div
            className={`max-w-3xl mx-auto flex flex-col items-center gap-3 ${
              lightSlide ? 'pointer-events-auto' : ''
            }`}
          >
            {waitingClick && (
              <button
                type="button"
                onClick={anim.advance}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-md ${
                  lightSlide
                    ? 'bg-[#0B1B4A] text-white hover:bg-[#071230]'
                    : 'bg-white text-slate-900 hover:bg-white/90'
                }`}
              >
                Continuar
                <span className="text-[10px] font-mono opacity-50 tabular-nums">
                  {anim.step + 1}/{anim.total}
                </span>
              </button>
            )}

            {!waitingClick && forkBranchOptions && (
              <div className="flex flex-wrap justify-center gap-2">
                {forkBranchOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleForkBranchOption(opt.id)}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-900 hover:bg-white/90 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setForkBranchOptions(null)}
                  className={`px-3 py-2 rounded-full text-xs transition-colors ${
                    lightSlide ? 'text-slate-500 hover:text-slate-800' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            )}

            {!waitingClick && !forkBranchOptions && nav?.type === 'fork' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {nav.options?.map((opt) => {
                  if (opt.icon === 'sparkles') {
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleForkOption(opt.id)}
                        title={opt.label || 'Comodín'}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                          lightSlide
                            ? 'text-amber-700 hover:bg-black/5'
                            : 'text-amber-300/90 hover:text-amber-200 hover:bg-white/10'
                        }`}
                        aria-label={opt.label || 'Comodín'}
                      >
                        <Sparkles size={16} />
                        {opt.label}
                      </button>
                    )
                  }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleForkOption(opt.id)}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 transition-colors"
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            {!waitingClick && !forkBranchOptions && nav?.type === 'branch' && (
              <div className="flex flex-wrap justify-center gap-2">
                {nav.options?.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleBranchOption(opt.id)}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {!waitingClick && !forkBranchOptions && (nav?.type === 'next' || nav?.type === 'optional_extra') && (
              <div className="flex items-center gap-2">
                {nav?.type === 'optional_extra' && (
                  <button
                    type="button"
                    onClick={handleExtra}
                    title={nav.extraLabel || 'Ver slide extra (comodín)'}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                      lightSlide
                        ? 'text-amber-700 hover:bg-black/5'
                        : 'text-amber-300/90 hover:text-amber-200 hover:bg-white/10'
                    }`}
                    aria-label={nav.extraLabel || 'Comodín'}
                  >
                    <Sparkles size={16} />
                    {nav.extraLabel || 'Comodín'}
                  </button>
                )}

                {isPlan && (
                  <button
                    type="button"
                    onClick={() => setTwoPersons((v) => !v)}
                    title={twoPersons ? '2 personas (activo)' : '2 personas (apagado)'}
                    className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                      twoPersons
                        ? lightSlide
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-amber-400/20 text-amber-200'
                        : lightSlide
                          ? 'text-slate-400 hover:bg-black/5'
                          : 'text-white/40 hover:bg-white/10'
                    }`}
                    aria-pressed={twoPersons}
                    aria-label="2 personas"
                  >
                    <Users size={16} />
                    <span>2</span>
                  </button>
                )}

                {showModalidad && (
                  <button
                    type="button"
                    onClick={handleFillModalidad}
                    disabled={!canFillModalidad}
                    title={
                      canFillModalidad
                        ? `Autocompletar modalidad (${twoPersons ? 'Platinum' : 'Elite'})`
                        : 'Completa “Inversión final hoy” primero'
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                      lightSlide
                        ? 'text-amber-700 hover:bg-black/5'
                        : 'text-amber-300/90 hover:text-amber-200 hover:bg-white/10'
                    }`}
                    aria-label="Autocompletar modalidad de contado"
                  >
                    <Wand2 size={16} />
                    Contado
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrimaryNext}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-md ${
                    lightSlide
                      ? 'bg-[#0B1B4A] text-white hover:bg-[#071230]'
                      : 'bg-white text-slate-900 hover:bg-white/90'
                  }`}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {!waitingClick && atEnd && !generated && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => {
                    setGenerateError(null)
                    setNotesOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-60"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Generar resultado
                </button>
                {generateError && !notesOpen && (
                  <p className="text-xs text-rose-300 text-center max-w-sm">{generateError}</p>
                )}
              </div>
            )}

            {atEnd && generated && (
              <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/15 p-4 space-y-3">
                <p className="text-sm font-medium text-center">
                  Versión {generated.version} generada
                </p>
                <p className="text-[11px] text-white/55 text-center break-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}${generated.propuestaUrl || generated.url}`
                    : generated.propuestaUrl || generated.url}
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={async () => {
                      const full = `${window.location.origin}${generated.propuestaUrl || generated.url}`
                      try {
                        await navigator.clipboard.writeText(full)
                        setCopied(true)
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white text-slate-900"
                  >
                    <Copy size={13} />
                    {copied ? 'Copiado' : 'Copiar propuesta'}
                  </button>
                  <a
                    href={generated.propuestaUrl || generated.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-500 text-white"
                  >
                    <ExternalLink size={13} />
                    Abrir
                  </a>
                </div>
              </div>
            )}

            {!lightSlide && (
              <p className="text-[10px] text-white/35">
                ← atrás · → siguiente · Esc oculta controles
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
