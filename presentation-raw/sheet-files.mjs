/**
 * Hoja de contactos a partir de rutas explícitas (para inspeccionar fondos).
 * Uso: node sheet-files.mjs out.png etiqueta=ruta [etiqueta=ruta...]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHROME, TMP } from './layers-lib.mjs'

const [out, ...pairs] = process.argv.slice(2)
if (!out || !pairs.length) {
  console.error('uso: node sheet-files.mjs <out.png> <label=path...>')
  process.exit(1)
}

const COLS = 2
const TW = 960
const TH = 540

const cells = pairs
  .map((p) => {
    const i = p.indexOf('=')
    const label = p.slice(0, i)
    const path = p.slice(i + 1)
    return `<div class="c"><img src="file://${path}"><div class="tag">${label}</div></div>`
  })
  .join('\n')

const html = `<!doctype html><html><body style="margin:0;background:#000">
<style>
  .grid { display:grid; grid-template-columns: repeat(${COLS}, ${TW}px) }
  .c { position:relative; width:${TW}px; height:${TH}px; overflow:hidden; outline:2px solid #0ff }
  .c img { width:100%; height:100%; display:block }
  .tag { position:absolute; left:0; top:0; font:700 22px monospace; color:#fff; background:#0f172a; padding:2px 10px }
</style>
<div class="grid">${cells}</div>
</body></html>`

mkdirSync(TMP, { recursive: true })
const htmlPath = join(TMP, 'sheetf.html')
writeFileSync(htmlPath, html)
const rows = Math.ceil(pairs.length / COLS)
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
