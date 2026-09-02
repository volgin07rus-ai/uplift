import { useLayoutEffect, type RefObject } from 'react'
import { onTick } from './ticker'

export interface ScrambleOptions {
  active: () => boolean
  /** Букв в секунду. У Lusion 40. */
  letterPerSecond?: number
  /** Сколько случайных символов бежит впереди готового текста. */
  randCount?: number
  /** Пауза перед началом, секунды. */
  delay?: number
  /**
   * Как часто перетасовывать случайный хвост. На 60 кадрах он мельтешит,
   * поэтому Lusion обновляет его 15 раз в секунду.
   */
  refreshRate?: number
  enabled?: boolean
}

/**
 * Проявление текста «расшифровкой»: готовая часть слева, за ней —
 * несколько случайных печатных символов, дальше пусто.
 */
export function useScramble(
  ref: RefObject<HTMLElement | null>,
  text: string,
  {
    active,
    letterPerSecond = 40,
    randCount = 5,
    delay = 0,
    refreshRate = 1 / 15,
    enabled = true,
  }: ScrambleOptions,
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (!enabled) {
      el.textContent = text
      return
    }

    let time = 0
    let lastRefresh = -Infinity
    let printed = ''
    el.textContent = ''

    // Полная длина плюс хвост из случайных символов
    const total = delay + (text.length + randCount) / letterPerSecond

    return onTick((dt) => {
      const next = Math.min(total, Math.max(0, time + (active() ? dt : -dt)))
      if (next === time && time !== 0) return
      time = next

      /*
        Тасовку случайного хвоста придерживаем, чтобы он не мельтешил
        по шестьдесят раз в секунду. Но края отсчёта пропускать нельзя:
        именно из-за этого последние буквы залипали случайными.

        Время упирается в потолок и перестаёт расти, а до следующего
        разрешённого обновления не дотягивает — и кадр с уже готовой
        строкой просто не отрисовывался. Слово навсегда оставалось
        с мусорным хвостом: «БЮДЖЕА» вместо «БЮДЖЕТ».
      */
      const settled = time >= total || time <= 0
      if (!settled && time < lastRefresh + refreshRate) return
      lastRefresh = time

      let out = ''
      if (time >= total) {
        /*
          На финише выводим строку целиком, не считая позиции.
          Через дроби ответ не сходится: total складывается из задержки
          и длины, а потом задержка вычитается обратно — и при делении
          на сорок последний знак теряется. Из-за этого «бизнеса»
          заканчивалось случайным символом на любой частоте кадров.
        */
        out = text
      } else {
        const head = Math.max(0, Math.floor(letterPerSecond * (time - delay)))
        const solid = Math.min(text.length, head - randCount)
        const edge = Math.min(text.length, head)
        if (head > 0) {
          out = text.slice(0, Math.max(0, solid))
          for (let i = 0; i < edge - solid; i++) {
            out += String.fromCharCode(33 + ((Math.random() * 93) | 0))
          }
        }
      }
      if (out !== printed) {
        printed = out
        el.textContent = out
      }
    })
  }, [ref, text, active, letterPerSecond, randCount, delay, refreshRate, enabled])
}
