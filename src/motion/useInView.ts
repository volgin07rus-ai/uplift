import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Триггер появления для блоков в обычном потоке.
 *
 * Lusion проверяет положение секции через свой скролл-менеджер; нам
 * достаточно наблюдателя. Возвращает стабильную функцию-геттер для
 * useReveal и попутно ставит на элемент data-inview, чтобы выезды
 * карточек можно было описать в CSS без единой строки JS.
 *
 * Нижний отступ в rootMargin сдвигает запуск: блок начинает
 * проявляться, когда он уже заметно вошёл в экран, а не краем.
 */
/**
 * То же наблюдение, но результат отдаётся состоянием.
 *
 * Нужно там, где видимость влияет на пропсы — например, тяжёлую сцену
 * надо остановить, пока секция за краем экрана. Геттер из useInView
 * для этого не годится: он не вызывает перерисовку.
 *
 * Запас по краям щедрый: сцена должна успеть завестись до того, как
 * её увидят, иначе на входе будет видно пустое место.
 */
export function useInViewFlag(
  ref: RefObject<HTMLElement | null>,
  rootMargin = '40% 0px 40% 0px',
) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])

  return inView
}

export function useInView(
  ref: RefObject<HTMLElement | null>,
  rootMargin = '0px 0px -18% 0px',
) {
  const inView = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting
        el.dataset.inview = entry.isIntersecting ? '1' : '0'
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])

  return useCallback(() => inView.current, [])
}
