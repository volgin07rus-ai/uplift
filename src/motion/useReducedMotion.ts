import { useEffect, useState } from 'react'

/**
 * Системная настройка «уменьшить движение».
 *
 * ── Здесь она намеренно не соблюдается ─────────────────────────────
 *
 * Решение владельца сайта, принято сознательно и дважды подтверждено.
 * Ниже — что это значит, чтобы тот, кто откроет файл через полгода,
 * не счёл это недосмотром и не «починил» вслепую.
 *
 * Настройку включают не ради вкуса. У части людей движение на экране
 * вызывает настоящее укачивание: тошноту, головную боль, потерю
 * равновесия. Для них сайт теперь будет двигаться так же, как для
 * всех, и уйти им придётся вручную.
 *
 * Чтобы вернуть уважение к настройке, достаточно поставить здесь
 * true — весь остальной код читает решение отсюда. Кроме одного:
 * из CSS сняты правила @media (prefers-reduced-motion: reduce),
 * гасившие переходы. Они были в index.css (два блока), sections.css
 * (три блока) и восстанавливаются из истории по этому коммиту.
 */
const RESPECT_REDUCED_MOTION = false

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      RESPECT_REDUCED_MOTION &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!RESPECT_REDUCED_MOTION) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
