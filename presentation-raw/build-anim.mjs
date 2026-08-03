/**
 * Descompone las slides animadas en capas para el visor.
 *
 *   anim.src.json  (pasos + rects medidos a mano)
 *        │
 *        ├─ plate.jpg / plate.mp4   todo lo que se ve desde el principio
 *        └─ sN-*.png / sN-gif.mp4   lo que entra en cada paso
 *
 * El PDF exporta cada página como una secuencia plana de elementos en orden de
 * dibujo (layers-lib). Medimos el bbox de cada uno y lo asignamos al paso cuyo
 * rect lo contiene; lo que no cae en ningún paso es el plate. Los GIF se
 * localizan igual que en extract-fg.mjs y se recortan/codifican a mp4 (los
 * originales pesan 10-25 MB, impensable en el navegador).
 *
 * Salida: public/presentation/Slides/NN/anim/* y public/presentation/anim.json
 * Uso: node build-anim.mjs [slide...]   (sin args = todas)
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildLayerSvg, loadPage, measureChildren, rasterize, OUT_H, OUT_W, TMP } from './layers-lib.mjs'
import { ANIMATED_SLIDES } from './slides.config.mjs'

const FFMPEG = '/tmp/ffmpeg'
const here = new URL('.', import.meta.url).pathname
const slidesDir = join(here, '../public/presentation/Slides')
const srcPath = join(here, 'anim.src.json')
const outPath = join(here, '../public/presentation/anim.json')

const src = JSON.parse(readFileSync(srcPath, 'utf8'))
const gifRects = JSON.parse(readFileSync(join(here, 'rects.json'), 'utf8'))
const only = process.argv.slice(2)
const folders = Object.keys(src.slides).filter((f) => !only.length || only.includes(f))

const even = (n) => (n % 2 ? n + 1 : n)
const pct = (v, total) => (v / total) * 100

/** Grosor mínimo: sin él las líneas (alto 0) no "caben" en ningún rect. */
const inflate = (r) => [r[0], r[1], Math.max(r[2], 0.3), Math.max(r[3], 0.3)]

/** Área de intersección de dos rects [x, y, w, h] en %. */
function overlap(a, b) {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])
  return w > 0 && h > 0 ? w * h : 0
}

/** Qué parte del rect `a` cae dentro de `b` (0..1). */
function inside(a, b) {
  const r = inflate(a)
  return overlap(r, b) / (r[2] * r[3])
}

/**
 * Caja de lo que el elemento realmente pinta. getBoundingClientRect ignora los
 * recortes del PDF, así que una foto recortada mide de más y parece no caber en
 * su paso; el alfa del render sí dice la verdad.
 */
function paintedBox(pageData, idx, tag) {
  const png = join(TMP, `pb-${tag}.png`)
  rasterize(buildLayerSvg(pageData, [idx]), png, `pb-${tag}`)
  const res = spawnSync(FFMPEG, [
    '-hide_banner', '-i', png,
    '-vf', 'alphaextract,cropdetect=limit=0:round=2:reset=1:skip=0',
    '-frames:v', '1', '-f', 'null', '-',
  ])
  const m = [...(res.stderr?.toString() ?? '').matchAll(/crop=(\d+):(\d+):(-?\d+):(-?\d+)/g)].pop()
  if (!m) return null
  const [w, h, x, y] = m.slice(1).map(Number)
  if (x < 0 || y < 0) return null
  return [pct(x, OUT_W), pct(y, OUT_H), pct(w, OUT_W), pct(h, OUT_H)]
}

/** Rect que envuelve a todos. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r[0]))
  const y = Math.min(...rects.map((r) => r[1]))
  const x2 = Math.max(...rects.map((r) => r[0] + r[2]))
  const y2 = Math.max(...rects.map((r) => r[1] + r[3]))
  return [x, y, x2 - x, y2 - y].map((v) => +v.toFixed(3))
}

/** Geometría del gif en píxeles: tamaño al que se escala y recorte visible. */
function pxGeom(r) {
  const px = (v, total) => Math.round((v / 100) * total)
  const ix = px(r.xPct, OUT_W)
  const iy = px(r.yPct, OUT_H)
  const iw = Math.max(2, px(r.wPct, OUT_W))
  const ih = Math.max(2, px(r.hPct, OUT_H))
  const vx = px(r.visXPct, OUT_W)
  const vy = px(r.visYPct, OUT_H)
  const vw = Math.min(Math.max(2, px(r.visWPct, OUT_W)), iw)
  const vh = Math.min(Math.max(2, px(r.visHPct, OUT_H)), ih)
  return {
    iw,
    ih,
    cropX: Math.min(Math.max(0, vx - ix), iw - vw),
    cropY: Math.min(Math.max(0, vy - iy), ih - vh),
    vw,
    vh,
    vx,
    vy,
  }
}

function durationSec(file) {
  let stderr = ''
  try {
    execFileSync(FFMPEG, ['-nostdin', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (err) {
    stderr = err.stderr?.toString() ?? ''
  }
  const m = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 3
}

function toJpg(png, out) {
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', png, '-q:v', '3', out])
}

/** Chunks que dibujan cada GIF de la slide, en orden de dibujo. */
function findGifGroups(pageData, folder) {
  const cfg = ANIMATED_SLIDES[folder]
  if (!cfg) return []
  const [imgW, imgH] = cfg.imgSize
  const ids = new Set()
  for (const m of pageData.defs.matchAll(/<image id="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)) {
    if (Number(m[2]) === imgW && Number(m[3]) === imgH) ids.add(m[1])
  }
  const byId = new Map()
  pageData.chunks.forEach((chunk, i) => {
    for (const id of ids) {
      if (chunk.includes(`#${id}"`)) {
        if (!byId.has(id)) byId.set(id, [])
        byId.get(id).push(i)
      }
    }
  })
  const groups = [...byId.values()].map((idxs) => ({ idxs: new Set(idxs), first: Math.min(...idxs) }))
  groups.sort((a, b) => a.first - b.first)
  const entries = gifRects[folder] || []
  return groups.map((g, i) => {
    const entry = entries[i]
    if (!entry) throw new Error(`${folder}: gif ${i + 1} sin rect en rects.json`)
    return { ...g, entry, box: [entry.visXPct, entry.visYPct, entry.visWPct, entry.visHPct] }
  })
}

const out = { version: 2, _doc: src._doc, slides: {} }
const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { slides: {} }
if (only.length) out.slides = { ...prev.slides }

for (const folder of folders) {
  const def = src.slides[folder]
  const page = Number(folder)
  const pageData = loadPage(page)
  const boxes = measureChildren(pageData, page)
  const gifs = findGifGroups(pageData, folder)
  const gifIdx = new Set(gifs.flatMap((g) => [...g.idxs]))

  const dir = join(slidesDir, folder, 'anim')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  // 1. repartir elementos vectoriales entre pasos (bbox contenido en el rect)
  const stepEls = def.steps.map(() => [])
  const hidden = []
  const staticEls = []
  // Pertenece al paso que más lo cubre; con menos de la mitad dentro es fondo.
  const MIN_INSIDE = 0.55
  const zones = [...def.steps.map((s) => s.rects), def.hide || []].flat()
  for (const b of boxes) {
    if (gifIdx.has(b.i)) continue
    let bb = [b.x, b.y, b.w, b.h]
    const best = (rects) => Math.max(0, ...rects.map((r) => inside(bb, r)))
    // Si roza una zona animada pero "no cabe", puede ser un recorte: remedir.
    if (best(zones) < MIN_INSIDE && zones.some((r) => overlap(inflate(bb), r) > 0)) {
      const real = paintedBox(pageData, b.i, `${folder}-${b.i}`)
      if (real) bb = real
    }
    if (best(def.hide || []) >= MIN_INSIDE) {
      hidden.push(b.i)
      continue
    }
    const scores = def.steps.map((s) => best(s.rects))
    const top = Math.max(...scores)
    if (top >= MIN_INSIDE) {
      stepEls[scores.indexOf(top)].push({ ...b, x: bb[0], y: bb[1], w: bb[2], h: bb[3] })
    } else {
      staticEls.push(b.i)
    }
  }

  // 2. cada gif entra con el paso que lo contiene (si no, va en el plate)
  const stepGifs = def.steps.map(() => [])
  const staticGifs = []
  for (const g of gifs) {
    const step = def.steps.findIndex((s) => s.rects.some((r) => inside(g.box, r) > 0.8))
    if (step >= 0) stepGifs[step].push(g)
    else staticGifs.push(g)
  }

  const empty = stepEls.map((els, i) => (els.length || stepGifs[i].length ? null : i + 1)).filter(Boolean)
  if (empty.length) console.warn(`  ! ${folder}: pasos sin contenido: ${empty.join(', ')}`)

  // 3. plate: lo estático. Con gif que se queda → video; si no, imagen.
  let base
  if (staticGifs.length) {
    const cuts = staticGifs.map((g) => g.first).sort((a, b) => a - b)
    const beforePng = join(TMP, `base-${folder}.png`)
    rasterize(
      buildLayerSvg(pageData, staticEls.filter((i) => i < cuts[0])),
      beforePng,
      `base-${folder}`,
    )
    const args = ['-y', '-nostdin', '-v', 'error', '-loop', '1', '-i', beforePng]
    const chains = [`[0:v]scale=${OUT_W}:${OUT_H},format=rgb24,setsar=1[base]`]
    let cur = 'base'
    staticGifs.forEach((g, n) => {
      const geom = pxGeom(g.entry)
      const until = cuts[n + 1] ?? Infinity
      const fgPng = join(TMP, `fg-${folder}-${n}.png`)
      rasterize(
        buildLayerSvg(pageData, staticEls.filter((i) => i > g.first && i < until)),
        fgPng,
        `fg-${folder}-${n}`,
      )
      args.push('-stream_loop', '-1', '-i', join(here, g.entry.src))
      args.push('-loop', '1', '-i', fgPng)
      const gifIn = 1 + n * 2
      chains.push(
        `[${gifIn}:v]scale=${geom.iw}:${geom.ih},crop=${geom.vw}:${geom.vh}:${geom.cropX}:${geom.cropY},format=rgba[g${n}]`,
        `[${cur}][g${n}]overlay=${geom.vx}:${geom.vy}:format=rgb[og${n}]`,
        `[${gifIn + 1}:v]scale=${OUT_W}:${OUT_H},format=rgba[f${n}]`,
        `[og${n}][f${n}]overlay=0:0:format=rgb[o${n}]`,
      )
      cur = `o${n}`
    })
    chains.push(`[${cur}]copy[vout]`)
    const dur = Math.max(...staticGifs.map((g) => durationSec(join(here, g.entry.src))))
    args.push(
      '-filter_complex', chains.join(';'),
      '-map', '[vout]',
      '-t', dur.toFixed(3),
      '-r', '25',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
      '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart',
      join(dir, 'plate.mp4'),
    )
    execFileSync(FFMPEG, args, { maxBuffer: 1 << 28 })
    base = 'anim/plate.mp4'
  } else {
    const png = join(TMP, `plate-${folder}.png`)
    rasterize(buildLayerSvg(pageData, staticEls), png, `plate-${folder}`)
    toJpg(png, join(dir, 'plate.jpg'))
    base = 'anim/plate.jpg'
  }

  // 4. capas de cada paso, en orden de dibujo (vector bajo gif, gif, vector sobre gif)
  const steps = def.steps.map((step, n) => {
    const els = stepEls[n].map((b) => b.i).sort((a, b) => a - b)
    const layers = []
    const cuts = stepGifs[n].map((g) => g.first).sort((a, b) => a - b)
    const slices = [
      { name: 'a', from: -Infinity, to: cuts[0] ?? Infinity },
      ...stepGifs[n].map((g, i) => ({ gif: g, name: `g${i + 1}` })),
    ]
    stepGifs[n].forEach((g, i) => {
      slices.push({ name: `b${i + 1}`, from: g.first, to: cuts[i + 1] ?? Infinity })
    })

    const emit = (name, idxs) => {
      if (!idxs.length) return
      const file = `s${n + 1}-${name}.png`
      const png = join(dir, file)
      rasterize(buildLayerSvg(pageData, idxs), png, `s-${folder}-${n}-${name}`)
      return file
    }

    const under = els.filter((i) => i < (cuts[0] ?? Infinity))
    const fileUnder = emit('a', under)
    if (fileUnder) layers.push({ file: `anim/${fileUnder}` })

    stepGifs[n].forEach((g, i) => {
      const geom = pxGeom(g.entry)
      const w = even(geom.vw)
      const h = even(geom.vh)
      const file = `s${n + 1}-g${i + 1}.mp4`
      // El gif tiene alfa y el mp4 no: se hornea sobre lo que el deck dibuja
      // debajo (fondo + la caja de su propio paso), recortado a su rect.
      const underPng = join(TMP, `under-${folder}-${n}-${i}.png`)
      const underIdx = [...staticEls, ...els]
        .filter((idx) => idx < g.first)
        .sort((a, b) => a - b)
      rasterize(buildLayerSvg(pageData, underIdx), underPng, `under-${folder}-${n}-${i}`)
      execFileSync(
        FFMPEG,
        [
          '-y', '-nostdin', '-v', 'error',
          '-loop', '1', '-i', underPng,
          '-stream_loop', '-1', '-i', join(here, g.entry.src),
          '-filter_complex',
          [
            `[0:v]scale=${OUT_W}:${OUT_H},crop=${geom.vw}:${geom.vh}:${geom.vx}:${geom.vy},format=rgb24,setsar=1[bg]`,
            `[1:v]scale=${geom.iw}:${geom.ih},crop=${geom.vw}:${geom.vh}:${geom.cropX}:${geom.cropY},format=rgba[gif]`,
            `[bg][gif]overlay=0:0:format=rgb,scale=${w}:${h}[v]`,
          ].join(';'),
          '-map', '[v]',
          '-t', durationSec(join(here, g.entry.src)).toFixed(3),
          '-r', '25',
          '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
          '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart',
          join(dir, file),
        ],
        { maxBuffer: 1 << 28 },
      )
      layers.push({
        file: `anim/${file}`,
        x: +pct(geom.vx, OUT_W).toFixed(3),
        y: +pct(geom.vy, OUT_H).toFixed(3),
        w: +pct(geom.vw, OUT_W).toFixed(3),
        h: +pct(geom.vh, OUT_H).toFixed(3),
      })
      const over = els.filter((idx) => idx > g.first && idx < (cuts[i + 1] ?? Infinity))
      const fileOver = emit(`b${i + 1}`, over)
      if (fileOver) layers.push({ file: `anim/${fileOver}` })
    })

    // caja real del paso: bbox de su contenido (para que el barrido sea suyo)
    const parts = [
      ...stepEls[n].map((b) => [b.x, b.y, b.w, b.h]),
      ...stepGifs[n].map((g) => g.box),
    ]
    return {
      in: step.in || 'fade',
      ...(step.auto ? { auto: true, delay: step.delay ?? 400 } : {}),
      box: parts.length ? union(parts) : union(step.rects),
      layers,
    }
  })

  out.slides[folder] = { base, steps }
  const size = (f) => Math.round(statSync(join(dir, f)).size / 1024)
  console.log(
    `${folder}  ${base.replace('anim/', '')} ${size(base.replace('anim/', ''))}KB  ` +
      `${steps.length} pasos [${steps.map((s) => s.layers.length).join(',')}]  ` +
      `estáticos ${staticEls.length}${hidden.length ? `  ocultos ${hidden.length}` : ''}`,
  )
}

writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`)
console.log(`\n→ ${outPath}`)
