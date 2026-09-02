/**
 * Базовый путь сайта.
 *
 * На GitHub Pages проект лежит не в корне домена, а в подпапке —
 * домен/uplift/. Адрес от корня туда не попадает: «/mountains.mp4»
 * ушёл бы на домен/mountains.mp4 и вернул 404.
 *
 * Значение подставляет Vite из настройки base: на дев-сервере это «/»,
 * в сборке «/uplift/». Оно всегда начинается и заканчивается косой
 * чертой, поэтому склейка ниже не даёт ни двойных, ни пропущенных.
 *
 * Держим в одном месте, чтобы при переезде на другой адрес правился
 * только vite.config.ts.
 */
export const BASE = import.meta.env.BASE_URL

/** Превращает адрес от корня сайта в адрес с учётом базового пути. */
export function url(path: string) {
  return BASE + path.replace(/^\/+/, '')
}

/**
 * Обратное действие: отрезает базовый путь.
 *
 * Нужно там, где читается location.pathname — браузер отдаёт его вместе
 * с подпапкой, а сравнивать мы хотим с коротким именем стороны.
 */
export function stripBase(path: string) {
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\/+/, '')
  return rel.replace(/\/+$/, '')
}
