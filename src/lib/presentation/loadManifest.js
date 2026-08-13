const MANIFEST_URL = '/presentation/manifest.json'
const ANIM_URL = '/presentation/anim.json'

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

/** Slides del deck en orden de id (s01, s02, …), para el sidebar de salto libre. */
export function listManifestSlides(manifest) {
  const slides = manifest?.slides
  if (!slides) return []
  return Object.keys(slides)
    .sort((a, b) => {
      const na = Number.parseInt(String(a).replace(/\D/g, ''), 10)
      const nb = Number.parseInt(String(b).replace(/\D/g, ''), 10)
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
      return String(a).localeCompare(String(b))
    })
    .map((id) => ({ id, ...slides[id] }))
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
