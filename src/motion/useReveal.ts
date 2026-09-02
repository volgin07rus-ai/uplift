import { useLayoutEffect, type RefObject } from 'react'
import { clamp, ease, fit } from './math'
import { revertText, splitText } from './split'
import { onTick } from './ticker'

export interface RevealOptions {
  /** По чему разбивать. lines — без разбора на буквы, дешевле всего. */
  split: 'chars' | 'words' | 'lines'
  /** Откуда выезжает. Для букв и слов — em, для строк удобнее %. */
  from?: number
  unit?: 'em' | '%'
  /** Начальный наклон в градусах. Без него выезд выглядит дёшево. */
  rotate?: number
  /** За сколько условных секунд элемент доезжает. */
  duration?: number
  /**
   * Отдельное окно для наклона. У Lusion в первом экране 0.7 против 1:
   * слово выпрямляется раньше, чем встаёт на место.
   */
  rotateDuration?: number
  /** Множитель хода времени. */
  speed?: number
  /** Задержка на каждый следующий элемент, секунды. У Lusion 1/20. */
  stagger?: number
  /** Гасить ли прозрачность вместе с выездом. */
  fade?: boolean
  /** Идёт анимация вперёд или отматывается назад. */
  active: () => boolean
  /** На мобильном побуквенную анимацию не крутим — как и Lusion. */
  enabled?: boolean
}

/**
 * Появление текста по образцу Lusion.
 *
 * Ключевое отличие от CSS-переходов: у элемента есть собственное время,
 * которое идёт вперёд, пока блок виден, и назад, когда он ушёл. Поэтому
 * анимация корректно отыгрывается в обратную сторону и никогда не
 * рассинхронизируется — что при прокрутке туда-сюда случается постоянно.
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  {
    split,
    from = 1,
    unit = 'em',
    rotate = 0,
    duration = 1,
    rotateDuration,
    speed = 1,
    stagger = 1 / 20,
    fade = false,
    active,
    enabled = true,
  }: RevealOptions,
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (!enabled) {
      revertText(el)
      el.style.removeProperty('opacity')
      return
    }

    const parts = splitText(el, split === 'lines' ? 'words' : split)

    /*
      Страховка. Строка работает маской с overflow: hidden, поэтому текст,
      который в неё не влез, просто срежет — и заметить это можно только
      глазами на конкретной ширине окна. Ловим два случая:

        перенос      — строка выше полутора межстрочных;
        выезд вбок   — длинное слово не переносится, а вылезает за край.

      В обоих откатываемся к обычному тексту: пусть без анимации, но
      целиком и читаемо.
    */
    const doesNotFit = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      const wrapped =
        Number.isFinite(lh) && parts.lines.some((l) => l.getBoundingClientRect().height > lh * 1.5)
      // Допуск 2px: у строки есть боковые отступы под наклон
      const overflows = parts.lines.some((l) => l.scrollWidth > l.clientWidth + 2)
      if (!wrapped && !overflows) return false
      if (import.meta.env.DEV) {
        console.warn(
          `[reveal] строка не помещается (${wrapped ? 'перенос' : 'выезд вбок'}), анимация выключена:`,
          el,
        )
      }
      return true
    }

    if (doesNotFit()) {
      revertText(el)
      return
    }

    /*
      Первый замер попадает на запасной шрифт: свой ещё грузится, и он
      обычно шире. Поэтому проверяем ещё раз, когда шрифты доехали, —
      иначе строка молча обрежется уже после первой отрисовки.
    */
    let stopTicker: (() => void) | null = null
    let bailed = false
    const bail = () => {
      bailed = true
      stopTicker?.()
      revertText(el)
    }
    document.fonts?.ready.then(() => {
      if (!bailed && doesNotFit()) bail()
    })

    const targets =
      split === 'chars' ? parts.chars : split === 'words' ? parts.words : parts.lines

    const rotWindow = rotateDuration ?? duration

    // Стартовое положение выставляем сразу, до первого кадра, иначе
    // текст успевает моргнуть на месте.
    const write = (time: number) => {
      for (let i = 0; i < targets.length; i++) {
        const t = time * speed - i * stagger
        const y = fit(t, 0, duration, from, 0, ease.lusion)
        const r = rotate ? fit(t, 0, rotWindow, rotate, 0, ease.lusion) : 0
        const el2 = targets[i]
        el2.style.transform = `translate3d(0, ${y}${unit}, 0)${r ? ` rotate(${r}deg)` : ''}`
        if (fade) el2.style.opacity = String(fit(t, 0, duration * 0.6, 0, 1, ease.lusion))
      }
    }

    let time = 0
    let prev = -1
    write(0)

    stopTicker = onTick((dt) => {
      time = clamp(time + (active() ? dt : -dt), 0, 2)
      if (time === prev) return // в покое ничего не трогаем
      prev = time
      write(time)
    })

    return () => {
      bailed = true
      stopTicker?.()
    }
  }, [ref, split, from, unit, rotate, duration, rotateDuration, speed, stagger, fade, active, enabled])
}
