import { createContext, useContext } from 'react'
import { DICT, type Bundle, type Lang } from './dict'

export type { Bundle, Lang }

/** Где помним выбор между заходами. */
export const LANG_KEY = 'uplift:lang'

/**
 * Язык по умолчанию — по языку браузера, а не жёстко русский.
 *
 * Человек, у которого система на английском, скорее всего и сайт хочет
 * на английском; показывать ему кириллицу и надеяться, что он найдёт
 * переключатель, — плохая ставка. Выбранное руками всегда важнее.
 */
export function initialLang(): Lang {
  if (typeof window === 'undefined') return 'ru'
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    // Приватный режим: хранилище может быть закрыто. Не повод падать
  }
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export interface LangApi {
  lang: Lang
  setLang: (next: Lang) => void
  /** Тексты выбранного языка. */
  t: Bundle
}

export const LangCtx = createContext<LangApi>({
  lang: 'ru',
  setLang: () => {},
  t: DICT.ru,
})

export const useLang = () => useContext(LangCtx)

/** Короткий доступ к текстам: пишется чаще всего. */
export const useContent = () => useContext(LangCtx).t

/**
 * Тексты ВТОРОГО языка — того, который сейчас не показан.
 *
 * Нужны, чтобы коробки в шапке не меняли ширину. Рядом с видимой
 * подписью кладётся невидимый двойник на другом языке; сетка берёт
 * ширину по самому длинному, и при переключении ничего не съезжает.
 * «Закрыть» шире, чем Close, на девятнадцать точек — без этого вся
 * правая группа шапки прыгает вбок.
 */
export const useOther = () => {
  const { lang } = useContext(LangCtx)
  return DICT[lang === 'ru' ? 'en' : 'ru']
}
