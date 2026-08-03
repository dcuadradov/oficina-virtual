/**
 * Previsualización de slides con rejilla en % del marco, para poder definir las
 * regiones que se animan (x/y/w/h en % sobre 1920x1080).
 *
 * Uso: node grid-preview.mjs out.png 06 07 08 09
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHROME, TMP } from './layers-lib.mjs'

const [out, ...folders] = process.argv.slice(2)
if (!out || !folders.length) {
  console.error('uso: node grid-preview.mjs <out.png> <folder...>')
  process.exit(1)
}

const here = new URL('.', import.meta.url).pathname
const slides = join(here, '../public/presentation/Slides')
const COLS = folders.length > 1 ? 2 : 1
const TW = 960
const TH = 540

const cell = (f) => {
  const jpg = join(slides, f, 'full.jpg')
  const png = join(slides, f, 'bg.png')
  const src = existsSync(jpg) ? jpg : existsSync(png) ? png : null
  const vLines = []
  for (let p = 10; p < 100; p += 10) {
    vLines.push(`<div class="v" style="left:${p}%"><span>${p}</span></div>`)
  }
  const hLines = []
  for (let p = 10; p < 100; p += 10) {
    hLines.push(`<div class="h" style="top:${p}%"><span>${p}</span></div>`)
  }
  return `<div class="c">
    ${src ? `<img src="file://${src}">` : '<div class="m">sin asset</div>'}
    ${vLines.join('')}${hLines.join('')}
    <div class="tag">${f}</div>
  </div>`
}

const html = `<!doctype html><html><body style="margin:0;background:#000">
<style>
  .grid { display:grid; grid-template-columns: repeat(${COLS}, ${TW}px); }
  .c { position:relative; width:${TW}px; height:${TH}px; overflow:hidden; outline:2px solid #f0f }
  .c img { width:100%; height:100%; display:block }
  .v { position:absolute; top:0; bottom:0; width:0; border-left:1px solid rgba(255,0,255,.55) }
  .h { position:absolute; left:0; right:0; height:0; border-top:1px solid rgba(255,0,255,.55) }
  .v span { position:absolute; top:2px; left:2px; font:700 13px monospace; color:#f0f; background:rgba(0,0,0,.6); padding:0 2px }
  .h span { position:absolute; left:2px; top:2px; font:700 13px monospace; color:#f0f; background:rgba(0,0,0,.6); padding:0 2px }
  .tag { position:absolute; right:0; bottom:0; font:700 20px monospace; color:#fff; background:#1e293b; padding:2px 8px }
  .m { color:#f87171; font:16px system-ui; padding:8px }
</style>
<div class="grid">${folders.map(cell).join('\n')}</div>
</body></html>`

mkdirSync(TMP, { recursive: true })
const htmlPath = join(TMP, 'grid.html')
writeFileSync(htmlPath, html)
const rows = Math.ceil(folders.length / COLS)
execFileSync(CHROME, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--window-size=${COLS * TW},${rows * TH}`,
  `--screenshot=${out}`,
  `file://${htmlPath}`,
])
console.log(out)
