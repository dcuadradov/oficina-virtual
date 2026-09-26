/** Query de cache-bust: subir si cambia el grafo (manifest) o las capas (anim). */
const MANIFEST_URL = '/presentation/manifest.json?v=order-s03-s06'
const ANIM_URL = '/presentation/anim.json?v=fucs-lockup'

let cachedManifest = null

export async function loadPresentationManifest() {
  if (cachedManifest) return cachedManifest
  const [res, animRes] = await Promise.all([
    fetch(MANIFEST_URL),
    fetch(ANIM_URL).catch(() => null),
  ])
  if (!res.ok) throw new Error('No se pudo cargar el manifest de la presentación')
  const manifest = await res.json()
  // Las animaciones son opcionales: sin anim.json el deck se ve completo y fijo.
  manifest.anim = animRes?.ok ? await animRes.json() : { slides: {} }
  cachedManifest = manifest
  return cachedManifest
}

export function getSlide(manifest, slideId) {
  return manifest?.slides?.[slideId] ?? null
}

/** Destinos a recorrer al armar el catálogo (orden de presentación, no de id). */
function navFollowIds(nav) {
  if (!nav) return []
  if (nav.type === 'next') return nav.next ? [nav.next] : []
  if (nav.type === 'optional_extra') {
    return [nav.extra, nav.next].filter(Boolean)
  }
  if (nav.type === 'branch' || nav.type === 'fork') {
    const ids = []
    for (const opt of nav.options || []) {
      if (opt.next) ids.push(opt.next)
      for (const nested of opt.then?.options || []) {
        if (nested.next) ids.push(nested.next)
      }
    }
    if (nav.skip) ids.push(nav.skip)
    if (nav.next) ids.push(nav.next)
    return ids
  }
  return []
}

/** Slides del deck en orden del grafo (`next` / extras / forks), para el sidebar. */
export function listManifestSlides(manifest) {
  const slides = manifest?.slides
  if (!slides) return []

  const order = []
  const seen = new Set()
  const visit = (id) => {
    if (!id || !slides[id] || seen.has(id)) return
    seen.add(id)
    order.push(id)
    for (const next of navFollowIds(slides[id].nav)) visit(next)
  }
  visit(manifest.start)

  const leftover = Object.keys(slides)
    .filter((id) => !seen.has(id))
    .sort((a, b) => {
      const na = Number.parseInt(String(a).replace(/\D/g, ''), 10)
      const nb = Number.parseInt(String(b).replace(/\D/g, ''), 10)
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
      return String(a).localeCompare(String(b))
    })

  return [...order, ...leftover].map((id) => ({ id, ...slides[id] }))
}

/** Capas de animación del slide (generadas por presentation-raw/build-anim.mjs). */
export function getSlideAnim(manifest, slide) {
  if (!slide?.folder) return null
  const def = manifest?.anim?.slides?.[slide.folder]
  return def?.steps?.length ? def : null
}

export function buildSlideFileUrl(manifest, slide, file) {
  return `${manifest.assetBase.replace(/\/$/, '')}/${slide.folder}/${file}`
}

/**
 * URLs candidatas del asset de un slide, en orden de preferencia.
 * `slide.asset` (con extensión) va primero; detrás quedan `assetFile` con cada
 * extensión de `assetExtensions` como fallback si el archivo preferido falla.
 */
export function buildAssetCandidates(manifest, slide, fileName = null) {
  const base = manifest.assetBase.replace(/\/$/, '')
  const folder = slide.folder
  const explicit = fileName || slide.asset
  const name = manifest.assetFile || 'full'
  const extensions = manifest.assetExtensions || ['jpg', 'png']
  const fallbacks = extensions.map((ext) => `${base}/${folder}/${name}.${ext}`)

  if (!explicit) return fallbacks
  if (/\.[a-z0-9]+$/i.test(explicit)) {
    return [`${base}/${folder}/${explicit}`, ...fallbacks]
  }
  return extensions.map((ext) => `${base}/${folder}/${explicit}.${ext}`)
}

/** Imagen estática del slide, para usar como poster mientras arranca el video. */
export function buildPosterUrl(manifest, slide) {
  const base = manifest.assetBase.replace(/\/$/, '')
  const name = manifest.assetFile || 'full'
  const ext = (manifest.assetExtensions || ['jpg'])[0]
  return `${base}/${slide.folder}/${name}.${ext}`
}

export function isVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url || '')
}
