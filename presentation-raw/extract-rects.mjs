/**
 * Extrae del PDF original, por cada GIF, dos rectángulos:
 *   rect = dónde y a qué tamaño se coloca la imagen
 *   clip = el recorte que el deck le aplica (en Slides, el "cropped" de la imagen)
 *
 * Cairo exporta cada imagen como <image id="source-N" width= height=> y la pinta
 * con  <g clip-path="url(#clip-K)"><g mask="url(#mask-K)">
 *        <use xlink:href="#source-N" transform="matrix(sx,0,0,sy,tx,ty)"/>
 * Sin el clip la imagen se desborda sobre elementos que en el deck la recortan.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { ANIMATED_SLIDES, PAGE_H, PAGE_W } from './slides.config.mjs'

const here = new URL('.', import.meta.url).pathname
const PDF = join(here, '../public/presentation/_source/deck.pdf')

const work = mkdtempSync(join(tmpdir(), 'rects-'))

/** bbox del path de un clipPath (los recortes de Slides son rectangulares). */
function clipBox(svg, id) {
  const m = svg.match(new RegExp(`<clipPath id="${id}">([\\s\\S]*?)</clipPath>`))
  if (!m) return null
  const nums = (m[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  const ys = nums.filter((_, i) => i % 2 === 1)
  if (!xs.length || !ys.length) return null
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  }
}

function placementsForPage(page, [imgW, imgH]) {
  const svgPath = join(work, `p${page}.svg`)
  execFileSync('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), PDF, svgPath])
  const svg = readFileSync(svgPath, 'utf8')

  const gifIds = new Set()
  for (const m of svg.matchAll(/<image id="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)) {
    if (Number(m[2]) === imgW && Number(m[3]) === imgH) gifIds.add(m[1])
  }

  // Recorremos las etiquetas manteniendo la pila de clip-path activos, para
  // saber qué recorte envuelve cada <use> de una imagen del tamaño de un GIF.
  const found = new Map()
  const clipStack = []
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  const openStack = []
  let m
  while ((m = tagRe.exec(svg))) {
    const [, close, tag, attrs, self] = m
    if (close) {
      const popped = openStack.pop()
      if (popped?.clip) clipStack.pop()
      continue
    }

    if (tag === 'use') {
      const href = attrs.match(/xlink:href="#([^"]+)"/)?.[1]
      const matrix = attrs.match(/transform="matrix\(([^)]+)\)"/)?.[1]
      if (href && matrix && gifIds.has(href)) {
        const [sx, , , sy, tx, ty] = matrix.split(',').map((n) => Number(n.trim()))
        const key = `${tx.toFixed(2)}:${ty.toFixed(2)}`
        const clipId = clipStack[clipStack.length - 1] ?? null
        const prev = found.get(key)
        // El <use> de dentro del <mask> comparte matriz pero no lleva clip:
        // nos quedamos con la aparición que sí lo tiene.
        if (!prev || (!prev.clipId && clipId)) {
          found.set(key, {
            clipId,
            rect: { x: tx, y: ty, w: imgW * sx, h: imgH * sy },
          })
        }
      }
    }

    const clip = attrs.match(/clip-path="url\(#([^)]+)\)"/)?.[1]
    if (!self) openStack.push({ tag, clip })
    if (clip && !self) clipStack.push(clip)
  }

  return [...found.values()]
    .map((e) => ({
      rect: e.rect,
      clip: e.clipId ? clipBox(svg, e.clipId) : null,
    }))
    .sort((a, b) => a.rect.x - b.rect.x)
}

const pct = (v, total) => +((v / total) * 100).toFixed(4)

const out = {}
for (const [folder, cfg] of Object.entries(ANIMATED_SLIDES)) {
  const places = placementsForPage(Number(folder), cfg.imgSize)
  if (places.length !== cfg.sources.length) {
    console.error(`${folder}: ${places.length} imágenes para ${cfg.sources.length} fuente(s)`)
  }
  out[folder] = cfg.sources.map((src, i) => {
    const name = basename(src).replace(/\.[^.]+$/, '')
    const p = places[i]
    if (!p) return { gif: name, src, missing: true }
    // Recorte efectivo: intersección de la imagen con su clip (o toda la página).
    const c = p.clip ?? { x: 0, y: 0, w: PAGE_W, h: PAGE_H }
    const vx = Math.max(p.rect.x, c.x)
    const vy = Math.max(p.rect.y, c.y)
    const vx2 = Math.min(p.rect.x + p.rect.w, c.x + c.w)
    const vy2 = Math.min(p.rect.y + p.rect.h, c.y + c.h)
    return {
      gif: name,
      src,
      /** Imagen completa, en % de la página. */
      xPct: pct(p.rect.x, PAGE_W),
      yPct: pct(p.rect.y, PAGE_H),
      wPct: pct(p.rect.w, PAGE_W),
      hPct: pct(p.rect.h, PAGE_H),
      /** Zona visible tras el recorte, en % de la página. */
      visXPct: pct(vx, PAGE_W),
      visYPct: pct(vy, PAGE_H),
      visWPct: pct(vx2 - vx, PAGE_W),
      visHPct: pct(vy2 - vy, PAGE_H),
      clipped: !!p.clip,
    }
  })
  console.log(
    folder,
    out[folder]
      .map((r) =>
        r.missing
          ? `${r.gif}=?`
          : `${r.gif}${r.clipped ? '' : '(sin clip)'} vis ${r.visWPct}x${r.visHPct}% @${r.visXPct},${r.visYPct}`,
      )
      .join('  '),
  )
}

writeFileSync(join(here, 'rects.json'), JSON.stringify(out, null, 2))
console.log('\n-> rects.json')
