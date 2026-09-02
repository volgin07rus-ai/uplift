/**
 * Проверка расшифровки текста без браузера.
 *
 * Баг был в том, что последние буквы навсегда оставались случайными.
 * Здесь повторяем ту же математику покадрово и смотрим, чем всё
 * заканчивается — со старым условием и с новым.
 *
 * Запуск:  npx tsx scripts/check-scramble.ts
 */
const LPS = 40
const RAND = 5
const REFRESH = 1 / 15

function run(text: string, delay: number, fixed: boolean, fps = 60) {
  const total = delay + (text.length + RAND) / LPS
  let time = 0
  let lastRefresh = -Infinity
  let printed = ''
  const dt = 1 / fps

  for (let step = 0; step < fps * 10; step++) {
    const next = Math.min(total, Math.max(0, time + dt))
    if (next === time && time !== 0) continue
    time = next

    const settled = time >= total || time <= 0
    if (fixed) {
      if (!settled && time < lastRefresh + REFRESH) continue
    } else {
      if (time < lastRefresh + REFRESH && time > 0) continue
    }
    lastRefresh = time

    const head = Math.max(0, Math.floor(LPS * (time - delay)))
    const solid = Math.min(text.length, head - RAND)
    const edge = Math.min(text.length, head)

    let out = ''
    if (fixed && time >= total) {
      out = text
    } else if (head > 0) {
      out = text.slice(0, Math.max(0, solid))
      for (let i = 0; i < edge - solid; i++) out += '?'
    }
    if (out !== printed) printed = out
  }
  return printed
}

const cases: [string, number][] = [
  ['минимальный бюджет', 0.1],
  ['Перформанс-маркетинг для растущего бизнеса', 0.35],
  ['Медицина, образование, недвижимость и сфера услуг', 0.2],
  ['ТАРГЕТ ВК • ЯНДЕКС ДИРЕКТ', 0.25],
]

console.log('Знак ? — залипший случайный символ.\n')
console.log('строка'.padEnd(46) + 'было' + ' '.repeat(8) + 'стало')
console.log('-'.repeat(96))

let broken = 0
let ok = 0
for (const [text, delay] of cases) {
  for (const fps of [60, 30, 144]) {
    const before = run(text, delay, false, fps)
    const after = run(text, delay, true, fps)
    if (before !== text) broken++
    if (after === text) ok++
    const mark = (s: string) => (s === text ? 'верно' : 'ХВОСТ «' + s.slice(-6) + '»')
    console.log(
      `${text.slice(0, 30).padEnd(32)}${fps} к/с   ${mark(before).padEnd(18)}${mark(after)}`,
    )
  }
}
console.log(`\nбыло сломано: ${broken} из 12   стало верно: ${ok} из 12`)
