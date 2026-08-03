import { useState } from 'react'
import {
  buildAssetCandidates,
  buildPosterUrl,
  buildSlideFileUrl,
  isVideoUrl,
} from '../../lib/presentation/loadManifest'

function Media({ src, className, style, poster, onError }) {
  if (!src) return null
  if (isVideoUrl(src)) {
    return (
      <video
        key={src}
        src={src}
        poster={poster}
        className={className}
        style={style}
        autoPlay
        muted
        loop
        playsInline
        onError={onError}
      />
    )
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      className={className}
      style={style}
      onError={onError}
      draggable={false}
    />
  )
}

/** Recorte inicial de cada dirección: el paso se descubre hacia ese lado. */
const HIDDEN_CLIP = {
  left: 'inset(0 100% 0 0)',
  right: 'inset(0 0 0 100%)',
  up: 'inset(100% 0 0 0)',
  down: 'inset(0 0 100% 0)',
  fade: 'inset(0 0 0 0)',
}

/**
 * Un paso de animación: sus capas viven dentro de la caja del contenido, así el
 * barrido dura lo que mide el elemento y no el slide entero.
 */
function AnimStep({ manifest, slide, step, visible }) {
  const [x, y, w, h] = step.box
  const dx = step.dx || 0
  const dy = step.dy || 0
  const isFade = (step.in || 'fade') === 'fade'
  const hidden = HIDDEN_CLIP[step.in] || HIDDEN_CLIP.fade

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x + dx}%`,
        top: `${y + dy}%`,
        width: `${w}%`,
        height: `${h}%`,
        overflow: 'hidden',
        // fade = solo opacity; el resto = solo clip-path (si se mezclan, el
        // video se ve semitransparente a media revelación).
        clipPath: isFade ? 'inset(0 0 0 0)' : visible ? 'inset(0 0 0 0)' : hidden,
        opacity: isFade ? (visible ? 1 : 0) : 1,
        transition: visible
          ? isFade
            ? 'opacity 450ms ease-out'
            : 'clip-path 700ms cubic-bezier(.22,.61,.36,1)'
          : 'none',
      }}
    >
      {step.layers.map((layer) => {
        // Sin x/y la capa es del tamaño del slide: se reposiciona en negativo
        // para que dentro de la caja caiga justo donde iba en el diseño.
        const style =
          layer.x == null
            ? {
                left: `${(-x / w) * 100}%`,
                top: `${(-y / h) * 100}%`,
                width: `${(100 / w) * 100}%`,
                height: `${(100 / h) * 100}%`,
              }
            : {
                left: `${((layer.x - x) / w) * 100}%`,
                top: `${((layer.y - y) / h) * 100}%`,
                width: `${(layer.w / w) * 100}%`,
                height: `${(layer.h / h) * 100}%`,
              }
        return (
          <Media
            key={layer.file}
            src={buildSlideFileUrl(manifest, slide, layer.file)}
            className="absolute max-w-none"
            style={style}
          />
        )
      })}
    </div>
  )
}

function SlideStageInner({ manifest, slide, anim: animDef, step }) {
  const [bgIndex, setBgIndex] = useState(0)
  const [layerIndexes, setLayerIndexes] = useState({})
  const [animFailed, setAnimFailed] = useState(false)

  // Si el plate no carga se cae al asset de siempre: mejor sin animación que
  // con medio slide.
  const anim = animFailed ? null : animDef
  const bgCandidates = buildAssetCandidates(manifest, slide)
  // Con animación el fondo es el "plate": el slide sin lo que va apareciendo.
  const bgSrc = anim ? buildSlideFileUrl(manifest, slide, anim.base) : bgCandidates[bgIndex] || null
  const layers = slide.layers || []

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {bgSrc ? (
        <Media
          src={bgSrc}
          poster={anim ? undefined : buildPosterUrl(manifest, slide)}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            if (anim) setAnimFailed(true)
            else setBgIndex((i) => (i + 1 < bgCandidates.length ? i + 1 : i))
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
          Sin asset para {slide.folder}
        </div>
      )}

      {anim?.steps.map((s, i) => (
        <AnimStep
          key={i}
          manifest={manifest}
          slide={slide}
          step={s}
          visible={i < step}
        />
      ))}

      {/* Layers solo si tienen posición (mp4 no tiene alpha; full-bleed taparía el bg). */}
      {layers.map((layer) => {
        if (typeof layer === 'string') return null
        if (layer.x == null && layer.y == null) return null

        const file = layer.file
        const baseName = file.replace(/\.[^.]+$/, '')
        const hasExt = /\.[a-z0-9]+$/i.test(file)
        const list = hasExt
          ? [`${manifest.assetBase.replace(/\/$/, '')}/${slide.folder}/${file}`]
          : buildAssetCandidates(manifest, slide, baseName)
        const idx = layerIndexes[file] || 0
        const src = list[idx]
        const style = {
          left: `${layer.x ?? 0}%`,
          top: `${layer.y ?? 0}%`,
          width: layer.w != null ? `${layer.w}%` : undefined,
          height: layer.h != null ? `${layer.h}%` : undefined,
        }

        return (
          <Media
            key={file}
            src={src}
            className="absolute object-contain pointer-events-none"
            style={style}
            onError={() => {
              setLayerIndexes((prev) => ({
                ...prev,
                [file]: (prev[file] || 0) + 1 < list.length ? (prev[file] || 0) + 1 : prev[file] || 0,
              }))
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Renderiza el asset principal del slide (mp4/png/…) con fallback por extensión.
 * Se remonta al cambiar de slide para resetear índices de fallback.
 */
export default function SlideStage({ manifest, slide, anim = null, step = 0 }) {
  if (!slide) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white/60 text-sm">
        Slide no encontrado
      </div>
    )
  }

  return (
    <SlideStageInner
      key={slide.folder}
      manifest={manifest}
      slide={slide}
      anim={anim}
      step={step}
    />
  )
}
