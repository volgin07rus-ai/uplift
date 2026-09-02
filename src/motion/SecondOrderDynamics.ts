/**
 * Пружина второго порядка — то, чем Lusion двигает всё, что реагирует
 * на курсор (у каждой карточки кейса их три, с разными характерами).
 *
 * В отличие от lerp здесь есть скорость и инерция, а параметр r даёт
 * предвосхищение: при r > 1 значение выстреливает в сторону цели
 * ещё до того, как цель успела уйти. Это и читается как «вес».
 *
 *   f — частота, Гц. Как быстро система отвечает. 1 — тяжело, 3 — резко.
 *   z — затухание. < 1 даёт перелёт и покачивание, 1 — точный приход,
 *       > 1 — вязкое приближение без перелёта.
 *   r — отклик. 0 — трогается плавно, 1 — сразу, > 1 — предвосхищает,
 *       < 0 — сначала уходит в противоход (замах).
 *
 * Настройки Lusion для карточек:
 *   фокус  (1.0, 0.6, 2)
 *   зум    (2.2, 0.7, 3)
 *   рамка  (2.5, 0.5, 2)
 *
 * Коэффициенты пересчитываются под текущий dt, поэтому система
 * не разваливается на просевших кадрах.
 */
export class SecondOrderDynamics {
  target: number
  value: number
  velocity = 0

  private prevTarget: number
  private k1 = 0
  private k2 = 0
  private k3 = 0
  private w = 0
  private z = 0
  private d = 0

  constructor(initial = 0, f = 1.5, z = 0.8, r = 2) {
    this.target = initial
    this.prevTarget = initial
    this.value = initial
    this.setFZR(f, z, r)
  }

  setFZR(f: number, z: number, r: number) {
    const w = Math.PI * 2 * f
    this.w = w
    this.z = z
    this.d = w * Math.sqrt(Math.abs(z * z - 1))
    this.k1 = z / (Math.PI * f)
    this.k2 = 1 / (w * w)
    this.k3 = (r * z) / w
  }

  reset(v = this.target) {
    this.velocity = 0
    this.prevTarget = v
    this.target = v
    this.value = v
  }

  /**
   * Устойчивые коэффициенты для конкретного шага времени.
   * Ветка со сдвигом полюсов нужна, когда кадр длиннее периода
   * собственных колебаний — наивная схема на таком dt взрывается.
   */
  private stable(dt: number): [number, number] {
    if (this.w * dt < this.z) {
      return [this.k1, Math.max(this.k2, (dt * dt) / 2 + (dt * this.k1) / 2, dt * this.k1)]
    }
    const t = Math.exp(-this.z * this.w * dt)
    const c = 2 * t * (this.z <= 1 ? Math.cos(dt * this.d) : Math.cosh(dt * this.d))
    const n = t * t
    const a = dt / (1 + n - c)
    return [(1 - n) * a, dt * a]
  }

  update(dt: number, target = this.target) {
    if (dt <= 0) return this.value
    this.target = target
    const targetVel = (target - this.prevTarget) / dt
    this.prevTarget = target
    const [k1, k2] = this.stable(dt)
    this.velocity += ((target + this.k3 * targetVel - this.value - k1 * this.velocity) * dt) / k2
    this.value += this.velocity * dt
    return this.value
  }
}
