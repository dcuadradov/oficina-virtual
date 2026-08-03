/**
 * Motor de navegación del grafo de slides.
 * Tipos: next | optional_extra | branch | fork | end
 */

export function createPathEntry(slideId, choice = null) {
  return {
    slideId,
    at: new Date().toISOString(),
    ...(choice ? { choice } : {}),
  }
}

/** Avanza con el "siguiente" principal (ignora comodín). */
export function resolvePrimaryNext(slide) {
  const nav = slide?.nav
  if (!nav) return null
  if (nav.type === 'next' || nav.type === 'optional_extra') {
    return nav.next || null
  }
  return null
}

/** Avanza al slide comodín (optional_extra). */
export function resolveExtraNext(slide) {
  const nav = slide?.nav
  if (nav?.type === 'optional_extra' && nav.extra) return nav.extra
  return null
}

/** Resuelve opción de branch o fork (opción con `next` directo). */
export function resolveOptionNext(slide, optionId) {
  const nav = slide?.nav
  if (!nav) return null

  if (nav.type === 'branch') {
    const opt = nav.options?.find((o) => o.id === optionId)
    return opt?.next || null
  }

  if (nav.type === 'fork') {
    const opt = nav.options?.find((o) => o.id === optionId)
    if (!opt) return null
    if (opt.next) return opt.next
    // Opciones con `then` se manejan en UI (segundo paso); no navegan aún.
    return null
  }

  return null
}

export function getForkOption(slide, optionId) {
  if (slide?.nav?.type !== 'fork') return null
  return slide.nav.options?.find((o) => o.id === optionId) || null
}

export function isEndSlide(slide) {
  return slide?.nav?.type === 'end'
}
