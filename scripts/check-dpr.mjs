import { readFileSync } from 'node:fs'

const file = new URL('../public/oasis/index.html', import.meta.url)
const src = readFileSync(file, 'utf8')

// Берём НАСТОЯЩИЙ код лестницы из файла, а не его копию.
// Конец ищем по отступу в два таба: та же строка есть внутри applyDPR,
// но там отступ в три — иначе срез обрывается на полуслове.
const TAB = String.fromCharCode(9)
const from = src.indexOf('const DPR_STEPS = [')
const to = src.indexOf('\n' + TAB + TAB + 'renderer.setPixelRatio(DPR_STEPS', from)
if (from < 0 || to < 0) throw new Error('блок лестницы не найден')
const ladder = src.slice(from, to)

let fails = 0, checks = 0
const ok = (cond, name, got) => {
  checks++
  if (cond) console.log(' ок   ' + name)
  else { fails++; console.log(' СБОЙ ' + name + '  →  ' + got) }
}

/** Поднимает лестницу в изоляции. screenDPR — плотность экрана. */
function makeLadder(screenDPR, isMobile = false) {
  const applied = []
  const body = new Function('applied', `
    const window = { devicePixelRatio: ${screenDPR} };
    const isMobile = ${isMobile};
    let innerWidth = 1920, innerHeight = 1080;
    const renderer = { setPixelRatio(v) { applied.push(v) }, setSize() {} };
    ${ladder}
    return {
      tune: tuneQuality,
      steps: DPR_STEPS,
      cur: () => DPR_STEPS[dprStep],
      manual: () => { dprAuto = false },
    };
  `)
  const api = body(applied)
  api.applied = applied
  return api
}

/* ── A. Экран 2x, сильная видеокарта: доходит до потолка ─────────── */
{
  const L = makeLadder(2)
  ok(L.steps.join() === '0.75,1,1.25,1.5', 'экран 2x: все ступени доступны', L.steps.join())
  ok(L.cur() === 0.75, 'старт всегда с 0.75', L.cur())
  for (let i = 0; i < 60; i++) L.tune(60)
  ok(L.cur() === 1.5, 'сильная машина доходит до 1.5', L.cur())
}

/* ── B. Прогрев: первые 3 секунды замеры игнорируются ────────────── */
{
  const L = makeLadder(2)
  for (let i = 0; i < 6; i++) L.tune(60)
  ok(L.cur() === 0.75, 'во время прогрева не поднимается', L.cur())
  for (let i = 0; i < 4; i++) L.tune(60)
  ok(L.cur() === 1, 'после прогрева поднимается на ступень', L.cur())
}

/* ── C. Слабая видеокарта: остаётся на полу ──────────────────────── */
{
  const L = makeLadder(2)
  for (let i = 0; i < 100; i++) L.tune(28)
  ok(L.cur() === 0.75, 'слабая машина остаётся на 0.75', L.cur())
  ok(L.applied.length === 0, 'ниже пола не опускается — лишних вызовов нет', L.applied.length)
}

/* ── D. Средняя: тянет 1, но не 1.25 — садится на 1 навсегда ─────── */
{
  const L = makeLadder(2)
  const fpsAt = { 0.75: 60, 1: 60, 1.25: 38, 1.5: 24 }
  let atMinute = -1, halfway = 0
  for (let i = 0; i < 200; i++) {
    L.tune(fpsAt[L.cur()])
    if (i === 60) atMinute = L.cur()
    if (i === 100) halfway = L.applied.length
  }
  ok(L.cur() === 1, 'средняя машина садится на 1', L.cur())
  ok(atMinute === 1, 'и садится быстро, за полминуты', atMinute)
  // Во второй половине прогона плотность не должна меняться вовсе
  ok(L.applied.length === halfway, 'после посадки картинка не скачет',
     'переключений во второй половине: ' + (L.applied.length - halfway))
  ok(L.applied.length <= 3, 'на посадку ушло не больше трёх переключений', L.applied.length)
}

/* ── E. Обычный экран 1x: выше единицы не лезем ──────────────────── */
{
  const L = makeLadder(1)
  ok(L.steps.join() === '0.75,1', 'экран 1x: ступени обрезаны', L.steps.join())
  for (let i = 0; i < 60; i++) L.tune(60)
  ok(L.cur() === 1, 'на 1x потолок — единица, лишних пикселей не рисуем', L.cur())
}

/* ── F. Ручной выбор глушит автоматику ───────────────────────────── */
{
  const L = makeLadder(2)
  for (let i = 0; i < 10; i++) L.tune(60)
  const before = L.cur()
  L.manual()
  for (let i = 0; i < 100; i++) L.tune(60)
  ok(L.cur() === before, 'после ручного выбора лестница молчит', before + ' → ' + L.cur())
}

/* ── G. Просадка на верхней ступени — откат и запрет наверх ──────── */
{
  const L = makeLadder(2)
  for (let i = 0; i < 60; i++) L.tune(60)
  ok(L.cur() === 1.5, 'подготовка: забрались на верх', L.cur())
  L.tune(30)
  ok(L.cur() === 1.25, 'просадка роняет на ступень вниз', L.cur())
  for (let i = 0; i < 100; i++) L.tune(60)
  ok(L.cur() === 1.25, 'обратно наверх уже не пробует', L.cur())
}

/* ── H. Телефон: выше пола не поднимаемся никогда ────────────────── */
{
  const L = makeLadder(3, true)   // плотный экран, быстрая машина
  for (let i = 0; i < 200; i++) L.tune(60)
  ok(L.cur() === 0.75, 'на телефоне лестница заперта на 0.75', L.cur())
  ok(L.applied.length === 0, 'и ни разу не переключает плотность', L.applied.length)
}
console.log('\nвсего проверок: ' + checks + '   сбоев: ' + fails)
process.exit(fails ? 1 : 0)
