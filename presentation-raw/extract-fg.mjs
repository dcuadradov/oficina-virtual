/**
 * Genera, por slide animada, la capa que va DELANTE del GIF (fg-NN.png con alfa).
 *
 * Cairo exporta la página como una secuencia plana de elementos en orden de
 * dibujo. Localizamos el último elemento que contiene una de las imágenes del
 * tamaño de los GIF y nos quedamos sólo con lo que viene después: eso es, por
 * definición, lo que el deck pinta encima. Se rasteriza con Chrome headless y
 * fondo transparente, así que el orden de capas es exacto (sin comparar píxeles).
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ANIMATED_SLIDES, OUT_H, OUT_W } from './slides.config.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const W = OUT_W
const H = OUT_H

const here = new URL('.', import.meta.url).pathname
const PDF = join(here, '../public/presentation/_source/deck.pdf')
const outDir = join(here, 'fg')
const tmp = join(here, '.fgtmp')
mkdirSync(outDir, { recursive: true })
mkdirSync(tmp, { recursive: true })

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(ANIMATED_SLIDES).sort()

/** Divide el contenido del <svg> en sus hijos de primer nivel, en orden de dibujo. */
function topLevelChildren(body) {
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

for (const folder of targets) {
  const page = Number(folder)
  const [imgW, imgH] = ANIMATED_SLIDES[folder].imgSize
  const svgPath = join(tmp, `p${folder}.svg`)
  execFileSync('pdftocairo', ['-svg', '-f', String(page), '-l', String(page), PDF, svgPath])
  const svg = readFileSync(svgPath, 'utf8')

  // ids de las imágenes animadas (y su smask, que comparte grupo de dibujo)
  const gifIds = new Set()
  for (const m of svg.matchAll(/<image id="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)) {
    if (Number(m[2]) === imgW && Number(m[3]) === imgH) gifIds.add(m[1])
  }
  if (!gifIds.size) {
    console.error(`${folder}: no encontré imágenes ${imgW}x${imgH}`)
    continue
  }

  const openTag = svg.match(/<svg[^>]*>/)[0]
  const bodyStart = svg.indexOf(openTag) + openTag.length
  const bodyEnd = svg.lastIndexOf('</svg>')
  const body = svg.slice(bodyStart, bodyEnd)

  const defsMatch = body.match(/<defs>[\s\S]*?<\/defs>/)
  const defs = defsMatch ? defsMatch[0] : ''

  const children = topLevelChildren(body)
  const gifIdx = new Set()
  children.forEach((c, i) => {
    const chunk = body.slice(c.start, c.end)
    if (chunk.startsWith('<defs')) return
    for (const id of gifIds) {
      if (chunk.includes(`#${id}"`)) {
        gifIdx.add(i)
        break
      }
    }
  })
  if (!gifIdx.size) {
    console.error(`${folder}: no localicé el <use> de los GIF en el orden de dibujo`)
    continue
  }

  // Una capa por GIF: lo que el deck dibuja entre ese GIF y el siguiente.
  // Así el compositor puede intercalar plate -> gif1 -> capa1 -> gif2 -> capa2…
  // y reproducir el orden de dibujo original incluso con varios GIF por slide.
  const gifOrder = [...gifIdx].sort((a, b) => a - b)
  const counts = []
  gifOrder.forEach((gifPos, n) => {
    const until = gifOrder[n + 1] ?? children.length
    const chunks = children
      .map((c, i) => ({ i, chunk: body.slice(c.start, c.end) }))
      .filter(({ i, chunk }) => i > gifPos && i < until && !chunk.startsWith('<defs'))
      .map(({ chunk }) => chunk)
    counts.push(chunks.length)

    const layerSvg = `${openTag.replace(
      /width="[^"]*" height="[^"]*"/,
      `width="${W}" height="${H}"`,
    )}\n${defs}\n${chunks.join('\n')}\n</svg>`
    const layerSvgPath = join(tmp, `fg-${folder}-${n + 1}.svg`)
    writeFileSync(layerSvgPath, layerSvg)

    execFileSync(CHROME, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${W},${H}`,
      `--screenshot=${join(outDir, `fg-${folder}-${n + 1}.png`)}`,
      `file://${layerSvgPath}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
  })

  console.log(
    `${folder}  ${children.length} elementos, gif en [${gifOrder.join(',')}] -> capas [${counts.join(',')}]`,
  )
}
