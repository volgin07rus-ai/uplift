/**
 * Проверка анимаций без браузера.
 *
 * Панель предпросмотра скрыта, в ней не идёт requestAnimationFrame,
 * поэтому глазами выезд текста не посмотреть. Зато вся математика
 * чистая — прогоняем её напрямую и смотрим на числа.
 *
 * Запуск:  npx tsx scripts/check-motion.ts
 */
import { ease, fit } from '../src/motion/math.ts'
import { SecondOrderDynamics } from '../src/motion/SecondOrderDynamics.ts'

console.log('--- кривая lusion = cubic-bezier(.35,0,0,1) ---')
console.log(
  ' ' + [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((t) => `${t}→${ease.lusion(t).toFixed(3)}`).join('  '),
)

console.log('\n--- H1: 7 слов, from 1.7em / 15°, stagger 1/20 ---')
console.log(' время | слово 0             | слово 3             | слово 6')
for (const time of [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.3]) {
  const cell = (i: number) => {
    const t = time - i / 20
    return `${fit(t, 0, 1, 1.7, 0, ease.lusion).toFixed(2)}em ${fit(t, 0, 0.7, 15, 0, ease.lusion).toFixed(1)}°`.padEnd(19)
  }
  console.log(`  ${time.toFixed(2)} | ${cell(0)} | ${cell(3)} | ${cell(6)}`)
}

console.log('\n--- Блок 2: 64 буквы, speed 1.5, stagger 1/60 ---')
const c2 = (time: number, i: number) => fit(time * 1.5 - i / 60, 0, 1, 1, 0, ease.lusion)
for (const time of [0, 0.3, 0.6, 0.9, 1.2, 1.5]) {
  console.log(
    ` t=${time.toFixed(2)}  буква 0 ${c2(time, 0).toFixed(3)}em   буква 32 ${c2(time, 32).toFixed(3)}em   буква 63 ${c2(time, 63).toFixed(3)}em`,
  )
}
let settle = -1
for (let t = 0; t < 5; t += 1 / 60) {
  if (c2(t, 63) < 0.001) {
    settle = t
    break
  }
}
console.log(` вся строка на месте к ${settle.toFixed(2)} c`)

console.log('\n--- Расшифровка подписи: 41 символ, 40 зн/с, задержка 0.35 ---')
console.log(` полностью проявится к ${(0.35 + (41 + 5) / 40).toFixed(2)} c`)

console.log('\n--- Пружина (f=1, z=0.6, r=2) — фокус карточки у Lusion ---')
const s = new SecondOrderDynamics(0, 1, 0.6, 2)
let over = 0
for (let i = 0; i < 180; i++) {
  s.update(1 / 60, 1)
  if (i < 90) over = Math.max(over, s.value)
}
console.log(` перелёт ${((over - 1) * 100).toFixed(1)}% сверх цели, через 3 c значение ${s.value.toFixed(4)}`)

console.log('\n--- Та же схема на просевших кадрах, dt = 1/8 c ---')
const s2 = new SecondOrderDynamics(0, 2.5, 0.5, 2)
let max = 0
for (let i = 0; i < 60; i++) {
  s2.update(1 / 8, 1)
  max = Math.max(max, Math.abs(s2.value))
}
console.log(
  ` максимум ${max.toFixed(3)}, финал ${s2.value.toFixed(4)} — ${Number.isFinite(s2.value) && max < 3 ? 'устойчиво' : 'РАЗВАЛИЛОСЬ'}`,
)
