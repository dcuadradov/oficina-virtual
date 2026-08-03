/**
 * Recompone las slides animadas en un único video por slide, idéntico al deck:
 *
 *   plate (deck sin GIF)  ->  cada GIF en su rect exacto  ->  capa frontal
 *
 * El rect sale de rects.json (matrices del PDF original) y la capa frontal de
 * fg/fg-NN.png (elementos que el deck dibuja encima del GIF). Al ser un H.264
 * opaco no depende de soporte de alfa en video, así que funciona en cualquier
 * navegador.
 *
 * Salida: public/presentation/Slides/NN/full.mp4
 * Uso: node compose.mjs [slide...]   (sin args = todas)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { OUT_H, OUT_W } from './slides.config.mjs'

const FFMPEG = '/tmp/ffmpeg'
const W = OUT_W
const H = OUT_H
const CRF = 21
const FPS = 25

const here = new URL('.', import.meta.url).pathname
const rects = JSON.parse(readFileSync(join(here, 'rects.json'), 'utf8'))
const slidesOut = join(here, '../public/presentation/Slides')

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(rects).sort()

function durationSec(file) {
  let stderr = ''
  try {
    execFileSync(FFMPEG, ['-nostdin', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (err) {
    stderr = err.stderr?.toString() ?? ''
  }
  const m = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null
}

/**
 * Geometría del GIF en píxeles del canvas: a qué tamaño se escala la imagen
 * completa, y qué trozo de ella se ve (el recorte que le aplica el deck).
 */
function pxGeom(r) {
  const px = (v, total) => Math.round((v / 100) * total)
  const ix = px(r.xPct, W)
  const iy = px(r.yPct, H)
  const iw = Math.max(2, px(r.wPct, W))
  const ih = Math.max(2, px(r.hPct, H))
  const vx = px(r.visXPct, W)
  const vy = px(r.visYPct, H)
  const vw = Math.min(Math.max(2, px(r.visWPct, W)), iw)
  const vh = Math.min(Math.max(2, px(r.visHPct, H)), ih)
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

for (const folder of targets) {
  const entries = rects[folder]
  if (!entries) {
    console.error(`${folder}: sin rects`)
    continue
  }

  const plate = join(here, 'plate', `p-${folder}.jpg`)
  if (!existsSync(plate)) throw new Error(`${folder}: falta plate (${plate})`)

  const gifs = entries.map((e, i) => ({
    ...pxGeom(e),
    name: e.gif,
    file: join(here, e.src),
    fg: join(here, 'fg', `fg-${folder}-${i + 1}.png`),
  }))
  for (const g of gifs) {
    if (!existsSync(g.file)) throw new Error(`${folder}: falta la fuente ${g.file}`)
    if (!existsSync(g.fg)) throw new Error(`${folder}: falta capa frontal ${g.fg}`)
  }

  const dur = Math.max(...gifs.map((g) => durationSec(g.file) || 3))

  // Entradas: plate, luego gif+capa frontal por cada GIF, en orden de dibujo.
  const args = ['-y', '-nostdin', '-v', 'error', '-loop', '1', '-i', plate]
  for (const g of gifs) {
    args.push('-stream_loop', '-1', '-i', g.file)
    args.push('-loop', '1', '-i', g.fg)
  }

  // Todo el compositado en RGB para que el recorte y las capas no sufran el
  // submuestreo de croma; la conversión a yuv420p ocurre sólo al codificar.
  const chains = [`[0:v]scale=${W}:${H},format=rgb24,setsar=1[base]`]
  let cur = 'base'
  gifs.forEach((g, i) => {
    const gifIn = 1 + i * 2
    const fgIn = gifIn + 1
    chains.push(
      `[${gifIn}:v]scale=${g.iw}:${g.ih},crop=${g.vw}:${g.vh}:${g.cropX}:${g.cropY},format=rgba[g${i}]`,
    )
    chains.push(`[${cur}][g${i}]overlay=${g.vx}:${g.vy}:format=rgb[og${i}]`)
    chains.push(`[${fgIn}:v]scale=${W}:${H},format=rgba[f${i}]`)
    chains.push(`[og${i}][f${i}]overlay=0:0:format=rgb[o${i}]`)
    cur = `o${i}`
  })
  chains.push(`[${cur}]copy[out]`)

  const outFile = join(slidesOut, folder, 'full.mp4')
  args.push(
    '-filter_complex', chains.join(';'),
    '-map', '[out]',
    '-t', dur.toFixed(3),
    '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
    '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart',
    outFile,
  )
  execFileSync(FFMPEG, args, { maxBuffer: 1 << 28 })

  console.log(
    `${folder}  ${gifs.length} gif  ${dur.toFixed(1)}s  -> full.mp4 ${Math.round(statSync(outFile).size / 1024)}KB`,
  )
}
