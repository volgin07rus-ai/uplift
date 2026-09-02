/**
 * Проверка занавеса между сторонами — без браузера.
 *
 * Занавес живёт на кадрах, а посмотреть на него глазами тут негде.
 * Поэтому подставляем холст-заглушку, крутим настоящий класс кадр за
 * кадром и проверяем то, от чего зависит всё остальное:
 *
 *   1. в самом начале экран чист — погода приходит из-за края, а не
 *      проявляется сразу везде;
 *   2. фронт проходит весь путь: от «ещё за краем» до «уже за
 *      противоположным», и только вперёд;
 *   3. подмена страницы и превращение снега в листья происходят,
 *      когда кадр закрыт целиком;
 *   4. занавес дожидается неготовую сторону, но не дольше предела;
 *   5. и в конце уходит начисто, не оставив пелены.
 *
 * Запуск:  npx tsx scripts/check-curtain.ts
 */

/* ------------------------------------------------------------------ */
/* Заглушки браузера                                                   */
/* ------------------------------------------------------------------ */

function stubContext() {
  const grad = { addColorStop: () => {} }
  const noop = () => {}
  return {
    createRadialGradient: () => grad,
    createLinearGradient: () => grad,
    fillRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    setTransform: noop,
    drawImage: noop,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  }
}

function stubCanvas() {
  return {
    width: 0,
    height: 0,
    dataset: {} as Record<string, string>,
    getContext: () => stubContext(),
  }
}

const g = globalThis as unknown as Record<string, unknown>
g.document = { createElement: () => stubCanvas() }
g.window = {
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 2,
  setTimeout: () => 0,
  clearTimeout: () => {},
}
g.matchMedia = () => ({ matches: false })
// Кадры мы подаём вручную, поэтому настоящий планировщик не нужен
g.requestAnimationFrame = () => 0
g.cancelAnimationFrame = () => {}
g.performance = { now: () => 0 }

const { StormCurtain, wipeCover, WIPE_BAND } = await import('../src/transition/StormCurtain')
type Frame = import('../src/transition/StormCurtain').CurtainFrame

/* ------------------------------------------------------------------ */
/* Прогон                                                              */
/* ------------------------------------------------------------------ */

/** Самая открытая и самая закрытая точки экрана в этом кадре. */
function coverRange(f: Frame) {
  let min = 1
  let max = 0
  for (let i = 0; i <= 40; i++) {
    const c = wipeCover(i / 40, f.on, f.off)
    if (c < min) min = c
    if (c > max) max = c
  }
  return { min, max }
}

/**
 * Крутит занавес вручную, кадр за кадром.
 *
 * @param direction  куда идём
 * @param readyAfter через сколько секунд новая сторона будет готова
 * @param fps        частота кадров
 */
async function run(direction: 'toWarm' | 'toCold', readyAfter: number, fps: number) {
  const canvas = stubCanvas()
  const curtain = new StormCurtain(canvas as unknown as HTMLCanvasElement)
  const inst = curtain as unknown as Record<string, unknown>

  const frames: { t: number; f: Frame }[] = []
  const pending: { at: number; resolve: () => void }[] = []
  let clock = 0
  let swapAt = -1
  let doneAt = -1

  // Отрисовка всё равно уходит в заглушку — перехватываем ради чисел
  inst.draw = (f: Frame) => {
    frames.push({ t: clock, f })
  }

  curtain.start(direction, {
    onSwap: () => {
      swapAt = clock
      const at = clock + readyAfter
      return new Promise<void>((resolve) => pending.push({ at, resolve }))
    },
    onDone: () => {
      doneAt = clock
    },
  })

  const dt = 1 / fps
  const tick = inst.tick as (now: number) => void

  for (let i = 0; i < fps * 20 && doneAt < 0; i++) {
    clock += dt

    for (let k = pending.length - 1; k >= 0; k--) {
      if (pending[k].at <= clock) {
        pending[k].resolve()
        pending.splice(k, 1)
      }
    }
    // Обещания разрешаются микрозадачами — даём очереди разобраться
    await Promise.resolve()

    tick(clock * 1000)
  }

  return { frames, swapAt, doneAt, canvas }
}

/* ------------------------------------------------------------------ */

const lines: string[] = []
let bad = 0

function check(name: string, ok: boolean, detail: string) {
  if (!ok) bad++
  lines.push(`${ok ? ' ок  ' : 'СБОЙ '} ${name.padEnd(44)} ${detail}`)
}

for (const direction of ['toWarm', 'toCold'] as const) {
  for (const fps of [30, 60, 144]) {
    for (const readyAfter of [0, 0.5, 5]) {
      const r = await run(direction, readyAfter, fps)
      const tag = `${direction} ${fps}к/с +${readyAfter}с`

      check(`${tag}: занавес убран`, r.doneAt > 0, `t=${r.doneAt.toFixed(2)}с`)
      check(`${tag}: холст отпущен`, !r.canvas.dataset.active, 'метка снята')

      // Первый кадр: экран ещё чист, погода только заходит из-за края
      const first = coverRange(r.frames[0].f)
      check(`${tag}: начинаем с чистого экрана`, first.max < 0.25, `максимум=${first.max.toFixed(3)}`)

      // Фронт наката проходит весь путь и только вперёд
      const ons = r.frames.map((x) => x.f.on)
      const offs = r.frames.map((x) => x.f.off)
      const monotone = (a: number[]) => a.every((v, i) => i === 0 || v >= a[i - 1] - 1e-9)
      check(
        `${tag}: накат прошёл весь путь`,
        ons[0] <= -WIPE_BAND + 0.02 && ons[ons.length - 1] >= 1 + WIPE_BAND - 1e-9,
        `${ons[0].toFixed(2)} → ${ons[ons.length - 1].toFixed(2)}`,
      )
      check(
        `${tag}: сход прошёл весь путь`,
        offs[offs.length - 1] >= 1 + WIPE_BAND - 0.02,
        `${offs[0].toFixed(2)} → ${offs[offs.length - 1].toFixed(2)}`,
      )
      check(`${tag}: фронты идут в одну сторону`, monotone(ons) && monotone(offs), 'без отката')

      // Подмена — под закрытым кадром
      const swapFrame = r.frames.find((x) => x.t >= r.swapAt)
      const swapCover = swapFrame ? coverRange(swapFrame.f).min : 0
      check(`${tag}: подмена под закрытым кадром`, swapCover > 0.995, `минимум=${swapCover.toFixed(3)}`)

      // Превращение снега в листья — тоже под закрытым
      const morphing = r.frames.filter((x) => x.f.morph > 0.02 && x.f.morph < 0.98)
      const minMorphCover = morphing.length
        ? Math.min(...morphing.map((x) => coverRange(x.f).min))
        : 1
      check(
        `${tag}: превращение под закрытым кадром`,
        minMorphCover > 0.995,
        `минимум=${minMorphCover.toFixed(3)}`,
      )

      // В конце ни белизны, ни отставших частиц
      const last = r.frames[r.frames.length - 1].f
      const lastCover = coverRange(last).max
      check(`${tag}: в конце экран чист`, lastCover < 0.03, `максимум=${lastCover.toFixed(3)}`)
      check(`${tag}: отставшие догорели`, last.tail < 0.05, `остаток=${last.tail.toFixed(3)}`)

      // Ожидание неготовой стороны ограничено: 1.7 на выдержку + 1.35 на сход
      const held = r.doneAt - r.swapAt
      check(`${tag}: ожидание в пределах`, held <= 3.1, `держали=${held.toFixed(2)}с`)
    }
  }
}

console.log(lines.join('\n'))
console.log(`\nвсего проверок: ${lines.length}   сбоев: ${bad}`)
process.exit(bad ? 1 : 0)
