import { useCallback, useEffect, useState } from 'react'

/**
 * Avance por pasos de la animación de un slide.
 *
 * Cada paso entra con un click (el mismo botón de "siguiente") salvo los
 * marcados como `auto`, que salen solos tras su `delay`. Al volver hacia atrás
 * el slide se muestra ya completo: nadie quiere repetir la animación.
 */
export function useSlideAnim(anim, { startRevealed = false } = {}) {
  const total = anim?.steps?.length ?? 0
  const initial = startRevealed ? total : 0
  // El reinicio va en el render y no en un efecto: con un efecto, el slide
  // nuevo pintaría un fotograma con los pasos del anterior ya descubiertos.
  const [state, setState] = useState({ anim, step: initial })
  if (state.anim !== anim) setState({ anim, step: initial })
  const step = state.anim === anim ? state.step : initial

  useEffect(() => {
    const current = anim?.steps?.[step]
    if (!current?.auto) return undefined
    const id = setTimeout(() => {
      setState((s) => (s.anim === anim && s.step === step ? { ...s, step: step + 1 } : s))
    }, current.delay ?? 400)
    return () => clearTimeout(id)
  }, [anim, step])

  const advance = useCallback(() => {
    setState((s) => ({ ...s, step: Math.min(s.step + 1, s.anim?.steps?.length ?? 0) }))
  }, [])

  return { step, total, pending: step < total, advance }
}
