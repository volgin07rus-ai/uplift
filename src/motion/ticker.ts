/**
 * Один общий rAF-цикл на все анимации.
 *
 * У Lusion так же: никаких CSS-переходов на скролловых анимациях,
 * один тик, внутри которого каждый элемент двигает своё время.
 * Заводить по циклу на компонент нельзя — они разъедутся по фазе.
 */

type TickFn = (dt: number) => void

const subs = new Set<TickFn>()
let raf = 0
let last = 0

/** Ушли со вкладки — delta накопится в секунды и всё выстрелит рывком. */
const MAX_DT = 1 / 20

function loop(now: number) {
  raf = requestAnimationFrame(loop)
  const dt = Math.min(MAX_DT, (now - last) / 1000)
  last = now
  for (const fn of subs) fn(dt)
}

export function onTick(fn: TickFn) {
  subs.add(fn)
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
  return () => {
    subs.delete(fn)
    if (subs.size === 0 && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
}

/** Возврат на вкладку: сбрасываем базу времени, иначе первый dt будет огромным. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) last = performance.now()
  })
}
