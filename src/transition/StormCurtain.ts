/**
 * Занавес между двумя сторонами сайта.
 *
 * Это не загрузочный экран, а погода, которая проходит по экрану.
 *
 * В тепло она идёт слева направо: метель накатывает от левого края,
 * закрывает кадр целиком, под белизной снежинки оборачиваются
 * листьями — и уходит дальше вправо, унося листья за правый край.
 * Обратно всё зеркально: листья накатывают справа, становятся
 * метелью, и метель уходит за левый край.
 *
 * Ничего не «пропадает на месте»: и накат, и сход — это движение
 * фронта поперёк экрана. Отставшие частицы догорают в самом конце,
 * когда фронт уже ушёл.
 *
 * Смена страницы происходит на пике, когда экран закрыт целиком.
 * Занавес умеет ждать: onSwap может вернуть обещание, и буря будет
 * держать белизну, пока новая сторона не готова. Поэтому отдельного
 * «идёт загрузка» здесь нет и быть не должно.
 */

export type CurtainDirection = 'toWarm' | 'toCold'

export interface CurtainHooks {
  /**
   * Момент подмены — экран закрыт полностью. Если вернуть обещание,
   * занавес подождёт его, но не дольше MAX_HOLD.
   */
  onSwap?: () => void | Promise<void>
  onDone?: () => void
}

/* ---------------------------------------------------------------- */
/* Хронометраж, секунды                                              */
/* ---------------------------------------------------------------- */

const RAMP = 0.9 // фронт накатывает и закрывает кадр
const MIN_HOLD = 0.34 // столько держим закрытым в любом случае
const MAX_HOLD = 1.7 // дольше не ждём даже недогруженную сторону
const CLEAR = 1.35 // фронт уходит за противоположный край

/** Перерождение частиц укладываем целиком в выдержку — под закрытым кадром. */
const MORPH_TIME = 0.3
/** Тон белизны теплеет чуть медленнее, чем меняются частицы. */
const TINT_TIME = 0.38

/** При выключенном движении в системе — просто короткая шторка. */
const REDUCED_RAMP = 0.26
const REDUCED_CLEAR = 0.3

/**
 * Страховка. Занавес живёт на кадрах, а кадры перестают идти, если
 * вкладку увели в фон посреди перехода. Без неё человек вернулся бы
 * на застывшую белизну. Считаем по таймеру — он в фоне тоже
 * замедляется, но срабатывает.
 */
const WATCHDOG_MS = 9000

/* ---------------------------------------------------------------- */
/* Фронт                                                             */
/* ---------------------------------------------------------------- */

/**
 * Ширина размытого края фронта в долях экрана. Резкая граница
 * читалась бы как штора по линейке, а не как погода.
 */
export const WIPE_BAND = 0.38

/**
 * Наклон фронта. Ветер идёт под углом, поэтому и граница не вертикаль:
 * низ экрана открывается чуть позже верха.
 */
export const WIPE_TILT = 0.35

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeIn = (t: number) => t * t
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Насколько накатил фронт в точке u. */
export const wipeOn = (u: number, on: number) => clamp01((on - u) / WIPE_BAND)

/**
 * Плотность занавеса в точке u (0 — начало движения фронта, 1 — конец).
 * Накат минус сход: сперва закрывает, потом открывает — и оба раза
 * в одну и ту же сторону.
 */
export function wipeCover(u: number, on: number, off: number) {
  return wipeOn(u, on) * (1 - wipeOn(u, off))
}

/** Полный путь фронта: от «ещё за краем» до «уже за противоположным». */
const frontFrom = -WIPE_BAND
const frontTo = 1 + WIPE_BAND
const frontAt = (t: number) => frontFrom + (frontTo - frontFrom) * easeInOut(clamp01(t))

/* ---------------------------------------------------------------- */
/* Спрайты                                                           */
/* ---------------------------------------------------------------- */

const FLAKE_SPRITE = 24
const LEAF_SPRITE = 40

/**
 * Снежинка. Раньше это было широкое мягкое пятно, которое ветер ещё и
 * растягивал втрое, — получались не снежинки, а капли и смазы. Теперь
 * плотное ядро с коротким ореолом: мелкое, чёткое, и берёт числом.
 */
function makeFlake() {
  const c = document.createElement('canvas')
  c.width = c.height = FLAKE_SPRITE
  const g = c.getContext('2d')
  if (!g) return c
  const r = FLAKE_SPRITE / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.42, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.66, 'rgba(240,247,255,0.45)')
  grad.addColorStop(1, 'rgba(226,238,252,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, FLAKE_SPRITE, FLAKE_SPRITE)
  return c
}

/** Лист — вытянутая капля с прожилкой. Рисуем один раз на цвет. */
function makeLeaf(fill: string, vein: string) {
  const c = document.createElement('canvas')
  c.width = c.height = LEAF_SPRITE
  const g = c.getContext('2d')
  if (!g) return c
  const w = LEAF_SPRITE * 0.46
  const h = LEAF_SPRITE * 0.92
  g.translate(LEAF_SPRITE / 2, LEAF_SPRITE / 2)
  g.beginPath()
  g.moveTo(0, -h / 2)
  g.quadraticCurveTo(w / 2, -h * 0.08, 0, h / 2)
  g.quadraticCurveTo(-w / 2, -h * 0.08, 0, -h / 2)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = vein
  g.lineWidth = Math.max(1, LEAF_SPRITE * 0.028)
  g.beginPath()
  g.moveTo(0, -h / 2 + 2)
  g.lineTo(0, h / 2 - 2)
  g.stroke()
  return c
}

const LEAF_COLORS: [string, string][] = [
  ['#c3dc4f', '#93ad2f'],
  ['#8fbf3a', '#5f8a24'],
  ['#e2c85c', '#b39a34'],
  ['#7fa650', '#54702f'],
  ['#d8e88a', '#a8bb52'],
]

/*
  Полотно метели намеренно не белое, а на пару тонов темнее снежинок.
  На чистом белом белый же снег пропадает: под закрытым фронтом
  оставалось ровное светлое поле, и никакой метели в нём не читалось.
  Теперь это бледная ледяная дымка, а снег по ней — белый.
*/
const COLD_VEIL: [number, number, number] = [206, 221, 238]
const WARM_VEIL: [number, number, number] = [246, 242, 222]

/* ---------------------------------------------------------------- */
/* Частица                                                           */
/* ---------------------------------------------------------------- */

interface Particle {
  x: number
  y: number
  /** Глубина 0.35..1 — сразу размер, скорость и прозрачность. */
  z: number
  /** Размеры разведены: снежинка мелкая, лист заметно крупнее. */
  flake: number
  leafSize: number
  sway: number
  swayAmp: number
  rot: number
  spin: number
  leaf: number
}

/* ---------------------------------------------------------------- */

type Phase = 'idle' | 'ramp' | 'hold' | 'clear'

/** Состояние одного кадра. Всё, чем описывается занавес. */
export interface CurtainFrame {
  phase: Phase
  /** Фронт наката, в долях пути. */
  on: number
  /** Фронт схода. */
  off: number
  /** Сила погоды: скорость падения и разброс. */
  storm: number
  /** Боковой снос, пикселей в секунду. К сходу растёт — уносит частицы. */
  windX: number
  /** 0 — первая погода, 1 — вторая. */
  morph: number
  /** Тон белизны: 0 — исходный, 1 — цвет новой стороны. */
  tint: number
  /** Догорание отставших, когда фронт уже ушёл. */
  tail: number
}

/** Сколько точек берём на градиент белизны. Плотность вдоль фронта монотонна. */
const VEIL_STOPS = 12

export class StormCurtain {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private flake = makeFlake()
  private leaves = LEAF_COLORS.map(([f, v]) => makeLeaf(f, v))

  private particles: Particle[] = []
  private w = 0
  private h = 0
  private dpr = 1
  /** +1 — фронт идёт слева направо, −1 — справа налево. */
  private dir = 1

  private phase: Phase = 'idle'
  private time = 0
  private holdAt = 0
  private clearAt = 0
  private swapped = false
  private raf = 0
  private watchdog = 0
  private last = 0

  private direction: CurtainDirection = 'toWarm'
  private hooks: CurtainHooks = {}
  private reduced = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  get running() {
    return this.phase !== 'idle'
  }

  /* -------------------------------------------------------------- */

  start(direction: CurtainDirection, hooks: CurtainHooks = {}) {
    if (this.running) return
    this.direction = direction
    this.dir = direction === 'toWarm' ? 1 : -1
    this.hooks = hooks
    // Настройка «уменьшить движение» не соблюдается по решению
    // владельца сайта — см. src/motion/useReducedMotion.ts
    this.reduced = false

    this.resize()
    this.seed()

    this.phase = 'ramp'
    this.time = 0
    this.swapped = false
    this.last = performance.now()
    this.canvas.dataset.active = '1'
    this.raf = requestAnimationFrame(this.tick)
    this.watchdog = window.setTimeout(() => this.finish(), WATCHDOG_MS)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.watchdog)
    this.phase = 'idle'
    delete this.canvas.dataset.active
  }

  /**
   * Убрать занавес и отдать управление странице. Зовётся и штатно —
   * когда погода договорила, — и по страховке.
   */
  private finish() {
    if (this.phase === 'idle') return
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.watchdog)
    // Если страховка сработала до пика, подмену всё равно надо сделать
    if (this.phase === 'ramp') this.hooks.onSwap?.()
    this.phase = 'idle'
    delete this.canvas.dataset.active
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.hooks.onDone?.()
  }

  /* -------------------------------------------------------------- */

  private resize() {
    /*
      Плотность пикселей режем сильнее обычного. Это метель из мягких
      точек — резкости в ней нет и на единице, а холст на два с
      половиной длится вдвое дороже по закрашиванию.
    */
    // На телефоне режем ещё вдвое: закрашивание стоит как квадрат
    // плотности, а переход — самое заметное место на сайте
    const cap = window.innerWidth < 768 ? 1 : 1.5
    this.dpr = Math.min(window.devicePixelRatio || 1, cap)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
  }

  private seed() {
    if (this.reduced) {
      this.particles = []
      return
    }

    /*
      Снежинок много и они мелкие — метель берёт числом, а не размером.
      По закрашиванию это всё равно дешевле прежнего десятка крупных
      растянутых пятен.
    */
    const target = Math.round(Math.max(400, Math.min(1200, (this.w * this.h) / 1200)))
    this.particles = new Array(target)

    for (let i = 0; i < target; i++) {
      const z = 0.35 + Math.random() * 0.65
      this.particles[i] = {
        x: Math.random() * this.w,
        // Запас сверху: пока фронт идёт, верхние успевают войти в кадр
        y: Math.random() * (this.h * 2.2) - this.h * 1.2,
        z,
        flake: (4 + Math.random() * 11) * (0.5 + z * 0.5),
        leafSize: (11 + Math.random() * 15) * (0.6 + z * 0.4),
        sway: Math.random() * Math.PI * 2,
        swayAmp: 12 + Math.random() * 34,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3.4,
        leaf: (Math.random() * LEAF_COLORS.length) | 0,
      }
    }
  }

  /* -------------------------------------------------------------- */

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 1 / 20)
    this.last = now
    this.time += dt

    const ramp = this.reduced ? REDUCED_RAMP : RAMP
    const clear = this.reduced ? REDUCED_CLEAR : CLEAR

    if (this.phase === 'ramp' && this.time >= ramp) {
      this.phase = 'hold'
      this.holdAt = this.time
      const result = this.hooks.onSwap?.()
      if (result && typeof result.then === 'function') {
        result.then(
          () => {
            this.swapped = true
          },
          () => {
            this.swapped = true
          },
        )
      } else {
        this.swapped = true
      }
    }

    if (this.phase === 'hold') {
      const held = this.time - this.holdAt
      // Перерождение обязано уложиться в выдержку — иначе его будет видно
      const minHold = this.reduced ? 0 : MIN_HOLD
      if ((this.swapped && held >= minHold) || held >= MAX_HOLD) {
        this.phase = 'clear'
        this.clearAt = this.time
      }
    }

    if (this.phase === 'clear' && this.time - this.clearAt >= clear) {
      this.finish()
      return
    }

    const f = this.frame(ramp, clear)
    this.update(dt, f)
    this.draw(f)

    this.raf = requestAnimationFrame(this.tick)
  }

  /** Все числа кадра в одном месте — так видно всю раскадровку разом. */
  private frame(ramp: number, clear: number): CurtainFrame {
    if (this.phase === 'ramp') {
      const p = clamp01(this.time / ramp)
      return {
        phase: 'ramp',
        on: frontAt(p),
        off: frontFrom,
        storm: 0.25 + 0.75 * easeInOut(p),
        windX: 240 + 340 * easeInOut(p),
        morph: 0,
        tint: 0,
        tail: 1,
      }
    }

    if (this.phase === 'hold') {
      const held = this.time - this.holdAt
      return {
        phase: 'hold',
        on: frontTo,
        off: frontFrom,
        storm: 1,
        windX: 580,
        /*
          Снежинки становятся листьями здесь и только здесь: кадр закрыт
          целиком, и подмены спрайтов не видно. Стоит начать это на
          сходе — и превращение попадёт в открытую часть экрана.
        */
        morph: easeInOut(clamp01(held / MORPH_TIME)),
        tint: clamp01(held / TINT_TIME),
        tail: 1,
      }
    }

    const p = clamp01((this.time - this.clearAt) / clear)
    return {
      phase: 'clear',
      on: frontTo,
      off: frontAt(p),
      storm: 1 - 0.6 * easeOut(p),
      // Уходя, ветер усиливается: он и уносит частицы за край
      windX: 580 + 1050 * easeIn(p),
      morph: 1,
      tint: 1,
      // Кто не успел улететь — догорает, но только в самом конце
      tail: 1 - easeIn(clamp01((p - 0.5) / 0.5)),
    }
  }

  /* -------------------------------------------------------------- */

  /**
   * Положение точки вдоль пути фронта, 0..1. Учитывает и направление,
   * и наклон: у нижнего края экрана фронт проходит позже.
   */
  private proj(x: number, y: number) {
    const nx = this.dir > 0 ? x / this.w : 1 - x / this.w
    return (nx + WIPE_TILT * (y / this.h)) / (1 + WIPE_TILT)
  }

  /**
   * Отрезок для градиента белизны, подобранный так, чтобы его параметр
   * совпал с proj: тогда стопы можно ставить прямо по долям пути.
   */
  private wipeVector(): [number, number, number, number] {
    const k = 1 + WIPE_TILT
    const a = (this.dir > 0 ? 1 : -1) / (k * this.w)
    const b = WIPE_TILT / (k * this.h)
    const n = a * a + b * b
    const x0 = this.dir > 0 ? 0 : this.w
    return [x0, 0, x0 + a / n, b / n]
  }

  /* -------------------------------------------------------------- */

  private update(dt: number, f: CurtainFrame) {
    const { w, h } = this
    const windX = f.windX * this.dir
    const fall = (120 + 640 * f.storm) * (1 - 0.55 * f.morph)
    const swayRate = 1.1 + 2.6 * f.morph
    /*
      На сходе частицы больше не заворачиваем: они должны уйти за край
      и не вернуться. Иначе вместо «погода прошла» получилось бы
      «погода погасла на месте».
    */
    const recycle = f.phase !== 'clear'

    for (const p of this.particles) {
      p.sway += dt * swayRate * (0.6 + p.z)
      p.rot += dt * p.spin * (0.3 + f.morph)

      // Снос слабее зависит от глубины, чем падение: иначе дальние
      // частицы не успевают уйти за край и висят пятнами
      p.x += (windX * (0.55 + 0.45 * p.z) + Math.cos(p.sway) * p.swayAmp * (0.35 + f.morph)) * dt
      p.y += (fall * p.z + Math.sin(p.sway * 0.7) * p.swayAmp * f.morph) * dt

      if (!recycle) continue
      if (p.y - 30 > h) {
        p.y = -30 - Math.random() * h * 0.5
        p.x = Math.random() * w
      }
      if (this.dir > 0 && p.x - 30 > w) p.x = -30
      if (this.dir < 0 && p.x + 30 < 0) p.x = w + 30
    }
  }

  /* -------------------------------------------------------------- */

  private draw(f: CurtainFrame) {
    const g = this.ctx
    if (!g) return
    const { w, h, dpr } = this

    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)

    /* ---- белизна: полоса, идущая поперёк экрана ---- */
    const toWarm = this.direction === 'toWarm'
    const a = toWarm ? COLD_VEIL : WARM_VEIL
    const b = toWarm ? WARM_VEIL : COLD_VEIL
    const r = Math.round(a[0] + (b[0] - a[0]) * f.tint)
    const gg = Math.round(a[1] + (b[1] - a[1]) * f.tint)
    const bb = Math.round(a[2] + (b[2] - a[2]) * f.tint)

    const [gx0, gy0, gx1, gy1] = this.wipeVector()
    const grad = g.createLinearGradient(gx0, gy0, gx1, gy1)
    for (let i = 0; i <= VEIL_STOPS; i++) {
      const u = i / VEIL_STOPS
      grad.addColorStop(u, `rgba(${r},${gg},${bb},${wipeCover(u, f.on, f.off)})`)
    }
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)

    if (this.reduced || !this.particles.length) return

    /* ---- частицы ---- */
    const snowFirst = toWarm
    const snowA = (snowFirst ? 1 - f.morph : f.morph) * f.tail
    const leafA = (snowFirst ? f.morph : 1 - f.morph) * f.tail
    if (snowA < 0.01 && leafA < 0.01) return

    // Листьев по замыслу «чуть-чуть» — лишние гасим, а не выключаем разом
    const thinFrom = Math.round(this.particles.length * (1 - 0.78 * (snowFirst ? f.morph : 0)))

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      /*
        Виден накат и только он. На сходе фронт частиц не гасит: им
        полагается лететь дальше, уже над открывшейся страницей.
      */
      const gate = wipeOn(this.proj(p.x, p.y), f.on)
      if (gate < 0.01) continue

      const thin = i < thinFrom ? 1 : 1 - f.morph
      const depth = 0.4 + 0.6 * p.z
      const x = p.x * dpr
      const y = p.y * dpr

      const alphaSnow = depth * snowA * gate * thin
      if (alphaSnow > 0.006) {
        /*
          Матрица целиком вместо save/translate/rotate/restore: частиц
          сотни, и стек состояния холста обходится дороже отрисовки.
          Снежинке поворот не нужен — она круглая.
        */
        g.setTransform(dpr, 0, 0, dpr, x, y)
        g.globalAlpha = alphaSnow
        const s = p.flake
        g.drawImage(this.flake, -s / 2, -s / 2, s, s)
      }

      const alphaLeaf = depth * leafA * gate * thin
      if (alphaLeaf > 0.006) {
        const c = Math.cos(p.rot) * dpr
        const s = Math.sin(p.rot) * dpr
        g.setTransform(c, s, -s, c, x, y)
        g.globalAlpha = alphaLeaf
        const l = p.leafSize
        g.drawImage(this.leaves[p.leaf], -l / 2, -l / 2, l, l)
      }
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.globalAlpha = 1
  }
}
