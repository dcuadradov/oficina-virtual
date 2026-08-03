/**
 * Hoja de contactos de las slides (miniaturas etiquetadas con su carpeta) para
 * poder identificar visualmente qué carpeta corresponde a cada slide del deck.
 *
 * Uso: node contact-sheet.mjs out.png 01 02 03 …
 */
import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHROME, TMP } from './layers-lib.mjs'
import { mkdirSync } from 'node:fs'

const [out, ...folders] = process.argv.slice(2)
if (!out || !folders.length) {
  console.error('uso: node contact-sheet.mjs <out.png> <folder...>')
  process.exit(1)
}

const here = new URL('.', import.meta.url).pathname
const slides = join(here, '../public/presentation/Slides')
const COLS = 3
const TW = 640
const TH = 360
const LABEL = 34

const cells = folders
  .map((f) => {
    const jpg = join(slides, f, 'full.jpg')
    const png = join(slides, f, 'bg.png')
    const src = existsSync(jpg) ? jpg : existsSync(png) ? png : null
    return `<div class="c"><div class="l">${f}</div>${
      src ? `<img src="file://${src}">` : '<div class="m">sin asset</div>'
    }</div>`
  })
  .join('\n')

const html = `<!doctype html><html><body style="margin:0;background:#111">
<style>
  .grid { display:grid; grid-template-columns: repeat(${COLS}, ${TW}px); }
  .c { position:relative; width:${TW}px; height:${TH + LABEL}px; background:#000; }
  .l { height:${LABEL}px; line-height:${LABEL}px; color:#fff; font:700 22px system-ui; padding-left:10px; background:#1e293b }
  .c img { width:${TW}px; height:${TH}px; display:block }
  .m { color:#f87171; font:16px system-ui; padding:8px }
</style>
<div class="grid">${cells}</div>
</body></html>`

mkdirSync(TMP, { recursive: true })
const htmlPath = join(TMP, 'sheet.html')
writeFileSync(htmlPath, html)
const rows = Math.ceil(folders.length / COLS)
execFileSync(CHROME, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--window-size=${COLS * TW},${rows * (TH + LABEL)}`,
  `--screenshot=${out}`,
  `file://${htmlPath}`,
])
console.log(out)
