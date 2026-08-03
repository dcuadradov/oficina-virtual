/**
 * Comprueba que plate + todas las capas reconstruyen el slide original.
 *
 * Compone las capas con ffmpeg (los mp4 por un fotograma) y las compara con el
 * asset que ve hoy el usuario. Imprime la diferencia media de luma: si sube de
 * ~2 es que algún elemento se perdió o quedó en el orden equivocado.
 *
 * Uso: node verify-anim.mjs [slide...]  → .layertmp/verify-NN.png
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OUT_H, OUT_W, TMP } from './layers-lib.mjs'

const FFMPEG = '/tmp/ffmpeg'
const here = new URL('.', import.meta.url).pathname
const slidesDir = join(here, '../public/presentation/Slides')
const anim = JSON.parse(readFileSync(join(here, '../public/presentation/anim.json'), 'utf8'))

const only = process.argv.slice(2)
const folders = Object.keys(anim.slides).filter((f) => !only.length || only.includes(f))

/** Primer fotograma utilizable (los videos, ya arrancados). */
function still(file, out) {
  const args = /\.mp4$/.test(file)
    ? ['-y', '-v', 'error', '-ss', '1', '-i', file, '-frames:v', '1', out]
    : ['-y', '-v', 'error', '-i', file, out]
  execFileSync(FFMPEG, args)
  return out
}

for (const folder of folders) {
  const dir = join(slidesDir, folder)
  const def = anim.slides[folder]
  const files = [still(join(dir, def.base), join(TMP, `v-${folder}-base.png`))]
  const geoms = [null]
  def.steps.forEach((step, n) => {
    step.layers.forEach((layer, i) => {
      files.push(still(join(dir, layer.file), join(TMP, `v-${folder}-${n}-${i}.png`)))
      geoms.push(layer.x == null ? null : layer)
    })
  })

  const args = ['-y', '-v', 'error']
  for (const f of files) args.push('-i', f)
  const chains = [`[0:v]scale=${OUT_W}:${OUT_H},format=rgba,setsar=1[c0]`]
  files.slice(1).forEach((_, i) => {
    const g = geoms[i + 1]
    const px = (v, total) => Math.round((v / 100) * total)
    const scale = g
      ? `scale=${px(g.w, OUT_W)}:${px(g.h, OUT_H)}`
      : `scale=${OUT_W}:${OUT_H}`
    chains.push(`[${i + 1}:v]${scale},format=rgba[l${i}]`)
    chains.push(
      `[c${i}][l${i}]overlay=${g ? `${px(g.x, OUT_W)}:${px(g.y, OUT_H)}` : '0:0'}:format=auto[c${i + 1}]`,
    )
  })
  const composed = join(TMP, `verify-${folder}.png`)
  args.push('-filter_complex', `${chains.join(';')};[c${files.length - 1}]format=rgb24[out]`, '-map', '[out]', composed)
  execFileSync(FFMPEG, args, { maxBuffer: 1 << 28 })

  const orig = ['full.mp4', 'full.jpg', 'bg.png']
    .map((f) => join(dir, f))
    .find((f) => existsSync(f))
  let diff = 'sin original'
  if (orig) {
    const ref = still(orig, join(TMP, `v-${folder}-orig.png`))
    const res = spawnSync(
      FFMPEG,
      [
        '-hide_banner', '-i', composed, '-i', ref,
        '-filter_complex',
        `[0:v]scale=${OUT_W}:${OUT_H},format=rgb24[a];[1:v]scale=${OUT_W}:${OUT_H},format=rgb24[b];[a][b]blend=all_mode=difference,signalstats,metadata=print`,
        '-f', 'null', '-',
      ],
      { maxBuffer: 1 << 28 },
    )
    diff = res.stderr?.toString() ?? ''
  }
  const m = String(diff).match(/YAVG=([\d.]+)/)
  console.log(`${folder}  YAVG=${m ? m[1] : diff}  → ${composed}`)
}
