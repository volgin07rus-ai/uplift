import { useEffect, useState } from 'react'

/**
 * CSS-правило prefers-reduced-motion гасит переходы, но не трогает
 * анимации, которые пишет JS. Побуквенный выезд надо выключать явно,
 * иначе для тех, кому движение противопоказано, текст будет ездить
 * как ни в чём не бывало.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
