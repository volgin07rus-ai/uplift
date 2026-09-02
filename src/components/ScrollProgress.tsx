import { useEffect, useRef } from 'react'

/** Сколько бар держится на экране после остановки прокрутки, мс. */
const HIDE_DELAY = 900
/** Минимальная высота ползунка, чтобы он не превращался в точку. */
const MIN_THUMB = 28
/** Как часто перечитываем высоту документа. */
const DOC_REFRESH = 500

/**
 * Собственная полоса прокрутки.
 *
 * Системную прячем в CSS: на Windows она толстая и ломает картинку.
 * Взамен — тонкая полоса справа, которая проявляется на время
 * прокрутки и гаснет через секунду покоя.
 *
 * Полосу можно тянуть мышью. Это не украшение: спрятав системную,
 * мы бы иначе отобрали у пользователя привычный способ листать.
 * Наведение тоже показывает бар — иначе невидимую полосу не поймать.
 *
 * ── Почему не покадровый цикл ──────────────────────────────────────
 *
 * Сначала бар пересчитывался в общем тике и каждый кадр спрашивал
 * clientHeight. Рядом, тем же кадром, прогресс видео пишет стили
 * четырём элементам — и между записью и чтением браузер обязан
 * пересчитать раскладку прямо сейчас, шестьдесят раз в секунду.
 *
 * Теперь размеры меряются при появлении, при смене окна и изредка
 * на прокрутке, а между замерами ползунок двигается по кэшу. Гаснет
 * по таймеру. Кадры для этого не нужны вовсе.
 */
export function ScrollProgress() {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trackEl = track.current
    const thumbEl = thumb.current
    if (!trackEl || !thumbEl) return

    // Кэш геометрии: обновляется только там, где она правда меняется
    let viewport = 0
    let trackH = 0
    let docHeight = 0
    let lastMeasure = 0

    let dragging = false
    let grabOffset = 0
    let hideTimer = 0
    let shown = ''
    let prevTop = -1
    let prevHeight = -1

    const setShown = (value: string) => {
      if (value === shown) return
      shown = value
      trackEl.dataset.visible = value
    }

    /** Единственное место, где читается раскладка. */
    const measure = () => {
      lastMeasure = performance.now()
      viewport = window.innerHeight
      trackH = trackEl.clientHeight
      docHeight = document.documentElement.scrollHeight
      paint()
    }

    /** Рисование по кэшу: только положение прокрутки и запись стилей. */
    const paint = () => {
      const scrollable = docHeight - viewport
      if (scrollable <= 0 || trackH <= 0) {
        setShown('0')
        return
      }

      const thumbH = Math.max(MIN_THUMB, (viewport / docHeight) * trackH)
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
      const top = progress * (trackH - thumbH)

      if (Math.abs(thumbH - prevHeight) > 0.5) {
        prevHeight = thumbH
        thumbEl.style.height = `${thumbH}px`
      }
      if (Math.abs(top - prevTop) > 0.25) {
        prevTop = top
        thumbEl.style.transform = `translate3d(0, ${top}px, 0)`
      }
    }

    const wake = () => {
      setShown('1')
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => {
        if (!dragging) setShown('0')
      }, HIDE_DELAY)
    }

    const onScroll = () => {
      // Высота документа меняется редко — перемеряем изредка
      if (performance.now() - lastMeasure > DOC_REFRESH) measure()
      else paint()
      wake()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    measure()

    /* ------------------------- Перетаскивание ------------------------- */

    const scrollTo = (clientY: number) => {
      const rect = trackEl.getBoundingClientRect()
      const span = rect.height - thumbEl.offsetHeight
      if (span <= 0) return
      const top = Math.min(span, Math.max(0, clientY - rect.top - grabOffset))
      // Высоту читаем на месте: протяжка — редкое событие, зато
      // промахнуться из-за подросшей страницы уже нельзя
      docHeight = document.documentElement.scrollHeight
      window.scrollTo({ top: (top / span) * (docHeight - window.innerHeight), behavior: 'instant' })
    }

    const onPointerDown = (e: PointerEvent) => {
      const thumbRect = thumbEl.getBoundingClientRect()
      // Клик мимо ползунка — берём его за середину
      grabOffset =
        e.clientY >= thumbRect.top && e.clientY <= thumbRect.bottom
          ? e.clientY - thumbRect.top
          : thumbRect.height / 2
      dragging = true
      wake()
      trackEl.setPointerCapture(e.pointerId)
      scrollTo(e.clientY)
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      wake()
      scrollTo(e.clientY)
    }

    const onPointerUp = () => {
      dragging = false
      wake()
    }

    trackEl.addEventListener('pointerdown', onPointerDown)
    trackEl.addEventListener('pointermove', onPointerMove)
    trackEl.addEventListener('pointerup', onPointerUp)
    trackEl.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.clearTimeout(hideTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      trackEl.removeEventListener('pointerdown', onPointerDown)
      trackEl.removeEventListener('pointermove', onPointerMove)
      trackEl.removeEventListener('pointerup', onPointerUp)
      trackEl.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  return (
    <div ref={track} className="scrollbar" data-visible="0" aria-hidden>
      <div ref={thumb} className="scrollbar-thumb" />
    </div>
  )
}
