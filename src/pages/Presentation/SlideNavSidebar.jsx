import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { buildPosterUrl, getSlide } from '../../lib/presentation/loadManifest'

/**
 * Sidebar de navegación rápida entre slides.
 * `items` es la lista a mostrar (`{ slideId }[]`): el deck completo o el recorrido.
 */
export default function SlideNavSidebar({
  open,
  onToggle,
  manifest,
  items = [],
  activeIndex,
  onSelect,
  light = false,
  title = 'Slides',
}) {
  const listRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const el = activeRef.current
    if (!el) return
    const nearEnd = activeIndex >= items.length - 2
    el.scrollIntoView({
      block: nearEnd ? 'center' : 'nearest',
      behavior: 'smooth',
    })
  }, [open, activeIndex, items.length])

  if (!manifest || items.length === 0) return null

  /** Evita que header/footer (z-20) tapen el primer/último thumb. */
  const chromeTop = '3.25rem'
  const chromeBottom = '6rem'

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Cerrar navegación de slides' : 'Abrir navegación de slides'}
        aria-expanded={open}
        className={`absolute left-0 top-1/2 z-30 -translate-y-1/2 flex items-center justify-center transition-transform duration-200 ease-out ${
          open ? 'translate-x-[8.5rem]' : 'translate-x-0'
        }`}
        style={{
          width: '1.65rem',
          height: '2.75rem',
          borderRadius: open ? '0.5rem 0 0 0.5rem' : '0 0.75rem 0.75rem 0',
          background: light ? 'rgba(11,27,74,0.88)' : 'rgba(234,179,8,0.92)',
          color: light ? '#fff' : '#0B1B4A',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
        }}
      >
        {open ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
      </button>

      <aside
        aria-hidden={!open}
        className={`absolute left-0 z-30 flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          top: chromeTop,
          bottom: chromeBottom,
          width: '8.5rem',
          background: light ? 'rgba(244,243,240,0.96)' : 'rgba(8,12,24,0.92)',
          borderRight: light ? '1px solid rgba(11,27,74,0.1)' : '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          className={`px-2.5 pt-3 pb-2 text-[10px] font-semibold tracking-wide uppercase ${
            light ? 'text-slate-500' : 'text-white/45'
          }`}
        >
          {title}
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1 pb-6 space-y-2 scrollbar-thin"
        >
          {items.map((entry, index) => {
            const slide = getSlide(manifest, entry.slideId)
            if (!slide) return null
            const active = index === activeIndex
            const thumb = buildPosterUrl(manifest, slide)
            const num = slide.folder || String(index + 1)

            return (
              <button
                key={`${entry.slideId}-${index}`}
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => onSelect?.(index)}
                disabled={active}
                title={slide.label || `Slide ${num}`}
                className={`relative w-full aspect-video rounded-md overflow-hidden border transition-all ${
                  active
                    ? light
                      ? 'border-[#0B1B4A] ring-2 ring-[#0B1B4A]/25'
                      : 'border-amber-300/80 ring-2 ring-amber-400/30'
                    : light
                      ? 'border-slate-300/80 hover:border-slate-500 opacity-90 hover:opacity-100'
                      : 'border-white/15 hover:border-white/40 opacity-85 hover:opacity-100'
                } ${active ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ background: light ? '#e8e6e1' : '#1a2238' }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-white/30">
                    <ImageIcon size={18} />
                  </span>
                )}

                <span
                  className={`absolute top-1 right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded text-[9px] font-bold tabular-nums flex items-center justify-center ${
                    light ? 'bg-white/90 text-slate-800' : 'bg-black/55 text-white'
                  }`}
                >
                  {num}
                </span>

                {active && (
                  <span
                    aria-hidden
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow"
                  />
                )}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
