import { createContext, useContext } from 'react'
import { BASE, stripBase, url } from '@/base'

/**
 * Две стороны одного сайта: холодная (горы, снег, расчёт) и тёплая
 * (трава, оазис). Это не разные сайты и не разные вкладки — просто
 * две страницы, между которыми проходит погода.
 *
 * Здесь только адреса и доступ к переключателю. Сам переключатель
 * живёт в SideProvider: в отдельном файле, чтобы обновление модулей
 * на лету не роняло состояние при каждой правке констант.
 */

export type Side = 'cold' | 'warm'

/*
  Адреса сторон. Сайт лежит в подпапке домена, поэтому оба идут через
  базовый путь: холодная — сам корень подпапки, тёплая — «warm» внутри
  неё. На дев-сервере базовый путь равен «/», и адреса выходят ровно
  теми же, что были.
*/
export const SIDE_PATH: Record<Side, string> = {
  cold: BASE,
  warm: url('/warm'),
}

/** Тёплая сторона — отдельный документ со своей сценой, лежит в public. */
export const WARM_DOC = url('/oasis/index.html')

export function sideFromPath(path: string): Side {
  // Браузер отдаёт путь вместе с подпапкой — отрезаем её и сравниваем
  // с коротким именем стороны
  return stripBase(path) === 'warm' ? 'warm' : 'cold'
}

export interface SideApi {
  side: Side
  /** Уйти на другую сторону сквозь погоду. */
  go: (to: Side) => void
  /**
   * Заранее поднять тёплую сторону в фоне. Зовём, когда человек
   * доскроллил до моста: сцена успевает завестись, и на переходе
   * буря не держит белизну лишнюю секунду.
   */
  prefetch: () => void
}

export const SideCtx = createContext<SideApi>({
  side: 'cold',
  go: () => {},
  prefetch: () => {},
})

export const useSide = () => useContext(SideCtx)
