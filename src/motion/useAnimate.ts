import { useEffect, useState } from 'react'
import { MOBILE_WIDTH } from '@/config'
import { useReducedMotion } from './useReducedMotion'

/** Ниже 812px Lusion выключает побуквенные анимации. Делаем так же. */
export function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_WIDTH,
  )
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < MOBILE_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mobile
}

/**
 * Крутить ли разбор текста по буквам. Нет — на узких экранах
 * (сотни span с трансформами телефону не нужны) и при отключённом
 * движении в системных настройках.
 */
export function useAnimate() {
  // Оба хука зовём безусловно: при записи `!useIsMobile() && !useReducedMotion()`
  // короткое замыкание пропускает второй вызов, порядок хуков меняется
  // и React падает ровно в момент пересечения границы 812px.
  const mobile = useIsMobile()
  const reduced = useReducedMotion()
  return !mobile && !reduced
}
