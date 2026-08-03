/**
 * Slides del deck que llevan animación y hay que recomponer a video.
 *
 * `imgSize` es el tamaño intrínseco de la imagen dentro del PDF: sirve para
 * localizarla en el SVG y así sacar su posición y su recorte exactos.
 * `sources` son los archivos animados, en orden izquierda→derecha dentro del
 * slide, con ruta relativa a esta carpeta.
 */
const PORTRAIT = [648, 1152]
const LANDSCAPE = [1152, 648]

const gif = (...names) => names.map((n) => `gifs/${n}.gif`)

export const ANIMATED_SLIDES = {
  '02': { imgSize: PORTRAIT, sources: gif('02') },
  '03': { imgSize: PORTRAIT, sources: gif('03-a', '03-b', '03-c') },
  '08': { imgSize: PORTRAIT, sources: gif('08') },
  12: { imgSize: PORTRAIT, sources: gif('12') },
  15: { imgSize: PORTRAIT, sources: gif('15') },
  18: { imgSize: PORTRAIT, sources: gif('18-a', '18-b', '18-c') },
  19: { imgSize: PORTRAIT, sources: gif('19-a', '19-b', '19-c') },
  22: { imgSize: PORTRAIT, sources: gif('22') },
  23: { imgSize: PORTRAIT, sources: gif('23') },
  24: { imgSize: PORTRAIT, sources: gif('24') },
  30: { imgSize: PORTRAIT, sources: gif('30') },
  34: { imgSize: PORTRAIT, sources: gif('34-a', '34-b') },
  // El video ocupa el slide completo, pero el texto va como vector encima.
  36: { imgSize: LANDSCAPE, sources: ['../public/presentation/Slides/36/bg.mp4'] },
}

/** Tamaño de página del deck en puntos (16:9 de Google Slides). */
export const PAGE_W = 1440
export const PAGE_H = 810

/** Resolución de salida. */
export const OUT_W = 1920
export const OUT_H = 1080
