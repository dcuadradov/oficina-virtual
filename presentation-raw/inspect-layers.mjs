/**
 * Mide los elementos de dibujo de páginas del deck y los agrupa en líneas /
 * bloques (por proximidad), con bbox en % del marco. Sirve para definir las
 * regiones que se animan en public/presentation/anim.json.
 *
 * Uso: node inspect-layers.mjs 6 7 9
 */
import { loadPage, measureChildren } from './layers-lib.mjs'

const args = process.argv.slice(2)
const RAW = args.includes('--raw')
const pages = args.filter((a) => a !== '--raw')
if (!pages.length) {
  console.error('uso: node inspect-layers.mjs <page...>')
  process.exit(1)
}

/** Une bboxes que se solapan o casi (tolerancia en % del marco). */
function cluster(boxes, tolX, tolY) {
  const groups = boxes.map((b) => ({ items: [b], x: b.x, y: b.y, r: b.x + b.w, b: b.y + b.h }))
  let merged = true
  while (merged) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i]
        const c = groups[j]
        if (a.x - tolX < c.r && c.x - tolX < a.r && a.y - tolY < c.b && c.y - tolY < a.b) {
          a.items.push(...c.items)
          a.x = Math.min(a.x, c.x)
          a.y = Math.min(a.y, c.y)
          a.r = Math.max(a.r, c.r)
          a.b = Math.max(a.b, c.b)
          groups.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return groups
    .map((g) => ({
      x: +g.x.toFixed(1),
      y: +g.y.toFixed(1),
      w: +(g.r - g.x).toFixed(1),
      h: +(g.b - g.y).toFixed(1),
      n: g.items.length,
      idx: g.items.map((i) => i.i).sort((a, b) => a - b),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
}

const fmt = (g) =>
  `  x=${String(g.x).padStart(5)} y=${String(g.y).padStart(5)} w=${String(g.w).padStart(5)} h=${String(g.h).padStart(5)}  n=${String(g.n).padStart(2)}  #${g.idx[0]}${g.idx.length > 1 ? `..${g.idx[g.idx.length - 1]}` : ''}`

for (const page of pages) {
  const parsed = loadPage(Number(page))
  const boxes = measureChildren(parsed, page).filter((b) => b.w > 0 || b.h > 0)
  // Elementos con bbox gigante (fondo, clips raros): no sirven para medir.
  const big = boxes.filter((b) => b.w > 70 || b.h > 70)
  const small = boxes.filter((b) => !(b.w > 70 || b.h > 70))
  console.log(`\n=== página ${page} — ${parsed.chunks.length} elementos ===`)
  for (const b of big) console.log(`  GRANDE #${b.i} ${b.tag} x=${b.x} y=${b.y} w=${b.w} h=${b.h}`)
  if (RAW) {
    console.log('  -- elementos --')
    for (const b of small) {
      console.log(
        `  #${String(b.i).padStart(3)} ${b.tag.padEnd(5)} x=${String(b.x).padStart(5)} y=${String(b.y).padStart(5)} w=${String(b.w).padStart(5)} h=${String(b.h).padStart(5)}`,
      )
    }
  }
  console.log('  -- líneas --')
  for (const g of cluster(small, 1.4, 0.7)) console.log(fmt(g))
  console.log('  -- bloques --')
  for (const g of cluster(small, 3, 2.5)) console.log(fmt(g))
}
