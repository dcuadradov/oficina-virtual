/**
 * Utilidades para partir una página del deck en sus elementos de dibujo.
 *
 * pdftocairo -svg exporta la página como una secuencia plana en orden de
 * dibujo. Cada hijo de primer nivel es un "elemento": rasterizando subconjuntos
 * con fondo transparente obtenemos capas apilables sin comparar píxeles.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const OUT_W = 1920
export const OUT_H = 1080

const here = new URL('.', import.meta.url).pathname
export const PDF = join(here, '../public/presentation/_source/deck.pdf')
export const TMP = join(here, '.layertmp')

/** Divide el contenido del <svg> en sus hijos de primer nivel, en orden de dibujo. */
export function topLevelChildren(body) {
  const children = []
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let depth = 0
  let start = -1
  let m
  while ((m = tagRe.exec(body))) {
    const isClose = m[1] === '/'
    const selfClose = m[4] === '/'
    if (isClose) {
      depth--
      if (depth === 0 && start >= 0) {
        children.push({ start, end: tagRe.lastIndex })
        start = -1
      }
      continue
    }
    if (depth === 0) {
      if (selfClose) {
        children.push({ start: m.index, end: tagRe.lastIndex })
        continue
      }
      start = m.index
    }
    if (!selfClose) depth++
  }
  return children
}

/** SVG de una página + sus piezas (defs y elementos en orden de dibujo). */
export function loadPage(page) {
  mkdirSync(TMP, { recursive: true })
  const svgPath = join(TMP, `p${page}.svg`)
  execFileSync('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), PDF, svgPath])
  const svg = readFileSync(svgPath, 'utf8')

  const openTag = svg.match(/<svg[^>]*>/)[0]
  const bodyStart = svg.indexOf(openTag) + openTag.length
  const bodyEnd = svg.lastIndexOf('</svg>')
  let body = svg.slice(bodyStart, bodyEnd)

  const defsMatch = body.match(/<defs>[\s\S]*?<\/defs>/)
  const defs = defsMatch ? defsMatch[0] : ''

  let chunks = topLevelChildren(body)
    .map((c) => body.slice(c.start, c.end))
    .filter((c) => !c.startsWith('<defs'))

  // Cairo a veces envuelve todo en un único <g id="surface1">: bajamos un nivel.
  while (chunks.length === 1 && /^<g[\s>]/.test(chunks[0])) {
    const inner = chunks[0].replace(/^<g[^>]*>/, '').replace(/<\/g>\s*$/, '')
    const nested = topLevelChildren(inner)
      .map((c) => inner.slice(c.start, c.end))
      .filter((c) => !c.startsWith('<defs'))
    if (nested.length <= 1) break
    chunks = nested
    body = inner
  }

  const sizedOpenTag = openTag.replace(
    /width="[^"]*" height="[^"]*"/,
    `width="${OUT_W}" height="${OUT_H}"`,
  )

  return { openTag: sizedOpenTag, defs, chunks }
}

/** Construye un SVG con solo los elementos indicados (0-based). */
export function buildLayerSvg({ openTag, defs, chunks }, indices) {
  const picked = indices.map((i) => chunks[i]).filter(Boolean)
  return `${openTag}\n${defs}\n${picked.join('\n')}\n</svg>`
}

/** Rasteriza un SVG a PNG con fondo transparente. */
export function rasterize(svgText, outPng, name = 'layer') {
  mkdirSync(TMP, { recursive: true })
  const svgPath = join(TMP, `${name}.svg`)
  writeFileSync(svgPath, svgText)
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${OUT_W},${OUT_H}`,
      `--screenshot=${outPng}`,
      `file://${svgPath}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
}

/**
 * Bounding box (en %) de cada elemento, calculado por Chrome con getBoundingClientRect.
 * Devuelve [{ i, x, y, w, h, tag }] — útil para mapear elementos a pasos.
 */
export function measureChildren({ openTag, defs, chunks }, page) {
  mkdirSync(TMP, { recursive: true })
  const wrapped = chunks
    .map((c, i) => `<g data-idx="${i}">${c}</g>`)
    .join('\n')
  const html = `<!doctype html><html><body style="margin:0">
${openTag}
${defs}
${wrapped}
</svg>
<pre id="out"></pre>
<script>
  const svg = document.querySelector('svg')
  const box = svg.getBoundingClientRect()
  const out = []
  for (const g of svg.querySelectorAll('g[data-idx]')) {
    const r = g.getBoundingClientRect()
    out.push({
      i: Number(g.dataset.idx),
      tag: g.firstElementChild ? g.firstElementChild.tagName : '?',
      x: +(((r.left - box.left) / box.width) * 100).toFixed(2),
      y: +(((r.top - box.top) / box.height) * 100).toFixed(2),
      w: +((r.width / box.width) * 100).toFixed(2),
      h: +((r.height / box.height) * 100).toFixed(2),
    })
  }
  document.getElementById('out').textContent = 'BBOX_JSON:' + JSON.stringify(out)
</script>
</body></html>`
  const htmlPath = join(TMP, `measure-${page}.html`)
  writeFileSync(htmlPath, html)
  const dom = execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--virtual-time-budget=2000',
      `--window-size=${OUT_W},${OUT_H}`,
      '--dump-dom',
      `file://${htmlPath}`,
    ],
    { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] },
  ).toString()

  const m = dom.match(/BBOX_JSON:(\[[\s\S]*?\])<\/pre>/)
  if (!m) throw new Error(`page ${page}: no pude medir los elementos`)
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
}
