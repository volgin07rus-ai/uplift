/**
 * Числовая база анимаций — повторяет утилиты Lusion.
 *
 * Вся их анимация построена на одной функции fit() и одной кривой.
 * Ничего сложнее здесь не нужно.
 */

export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v

export const saturate = (v: number) => clamp(v, 0, 1)

export const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Обратный lerp с зажимом: где находится v между a и b. */
export const unmix = (a: number, b: number, v: number) =>
  a === b ? 0 : saturate((v - a) / (b - a))

export const linearStep = (edge0: number, edge1: number, x: number) =>
  edge0 === edge1 ? 0 : saturate((x - edge0) / (edge1 - edge0))

/**
 * Главная рабочая лошадь: перекладывает значение из одного диапазона
 * в другой, по дороге пропуская через кривую.
 *
 * fit(time - i/20, 0, 1, 1, 0, ease.lusion) — «за секунду увести с 1em в 0,
 * начав на 50 мс позже предыдущего элемента».
 */
export function fit(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  ease?: (t: number) => number,
) {
  let t = unmix(inMin, inMax, v)
  if (ease) t = ease(t)
  return outMin + t * (outMax - outMin)
}

/**
 * Экспоненциальное сглаживание, не зависящее от частоты кадров.
 * У Lusion ровно эта же формула, коэффициент скролла у них 12.
 */
export const damp = (current: number, target: number, tau: number, dt: number) =>
  mix(current, target, 1 - Math.exp(-tau * dt))

/* ------------------------------------------------------------------ */
/* Кривые                                                              */
/* ------------------------------------------------------------------ */

/**
 * Решатель CSS-кривой cubic-bezier(x1, y1, x2, y2).
 * Ньютон с откатом на деление пополам — так же, как это делает браузер.
 */
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (x1 === y1 && x2 === y2) return t // прямая

  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx

  let s = t
  for (let i = 0; i < 8; i++) {
    const x = sampleX(s) - t
    if (Math.abs(x) < 1e-6) return sampleY(s)
    const d = slopeX(s)
    if (Math.abs(d) < 1e-6) break
    s -= x / d
  }

  let lo = 0
  let hi = 1
  s = t
  while (lo < hi) {
    const x = sampleX(s)
    if (Math.abs(x - t) < 1e-6) break
    if (t > x) lo = s
    else hi = s
    s = (hi - lo) * 0.5 + lo
  }
  return sampleY(s)
}

export const ease = {
  /**
   * Фирменная кривая Lusion. В их CSS она же — cubic-bezier(.35,0,0,1),
   * встречается 32 раза. Резкий старт, длинное оседание.
   */
  lusion: (t: number) => cubicBezier(t, 0.35, 0, 0, 1),
  /** Вторая их кривая, для интерфейса и наведений. */
  ui: (t: number) => cubicBezier(t, 0.4, 0, 0.1, 1),

  quadInOut: (t: number) => ((t *= 2) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1)),
  cubicInOut: (t: number) => ((t *= 2) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2)),
  expoOut: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : (t *= 2) < 1 ? 0.5 * Math.pow(1024, t - 1) : 0.5 * (-Math.pow(2, -10 * (t - 1)) + 2),
  sineInOut: (t: number) => 0.5 * (1 - Math.cos(Math.PI * t)),
}
