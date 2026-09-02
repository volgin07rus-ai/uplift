import { useEffect, useState } from 'react'
import type { LoadState } from '@/useVideoScrub'
import { AGENCY } from '@/content'
import { Logo } from './Logo'

/*
  Загрузочный экран.

  Держим человека ровно до момента, когда прокрутка станет плавной:
  банк кадров публикуется порциями, и как только набралась первая
  треть, ждать больше нечего. Остальное доезжает фоном.

  Прогресс честный, а не выдуманный: сначала байты видео (это
  примерно двенадцать мегабайт, врать тут нечего), потом доля
  раскодированных кадров. Второй этап весит меньше первого,
  потому что и длится меньше.
*/

const DOWNLOAD_SHARE = 0.7

interface LoaderProps {
  state: LoadState
  /** Аварийный предел: держать заставку дольше нельзя ни при каких раскладах. */
  timeout?: number
}

export function Loader({ state, timeout = 15000 }: LoaderProps) {
  const [gone, setGone] = useState(false)
  const [forced, setForced] = useState(false)

  const raw =
    state.phase === 'ready'
      ? 1
      : state.phase === 'download'
        ? state.progress * DOWNLOAD_SHARE
        : DOWNLOAD_SHARE + state.progress * (1 - DOWNLOAD_SHARE)

  /*
    Снимаем не по стопроцентной готовности, а как только кадров хватает
    для плавной прокрутки. Остальные доедут за первые секунды чтения.
  */
  const done = forced || state.usable || state.phase === 'ready'

  // Сеть или декодер могут зависнуть — заставка не должна становиться ловушкой
  useEffect(() => {
    const t = window.setTimeout(() => setForced(true), timeout)
    return () => window.clearTimeout(t)
  }, [timeout])

  // Пока экран виден, страницу не листаем: иначе человек прокрутит вслепую
  useEffect(() => {
    if (gone) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [gone])

  // Снимаем не мгновенно: даём уехать плавно и только потом убираем из дерева
  useEffect(() => {
    if (!done) return
    // Ждём, пока шторка доедет: 1с на transform плюс запас
    const t = window.setTimeout(() => setGone(true), 1150)
    return () => window.clearTimeout(t)
  }, [done])

  if (gone) return null

  const percent = Math.round((done ? 1 : raw) * 100)

  return (
    <div className="loader" data-done={done ? '1' : undefined} role="status" aria-live="polite">
      <div className="loader-inner">
        <span className="loader-mark">
          <Logo />
          {AGENCY.name}
        </span>

        <div className="loader-bar">
          <div className="loader-bar-fill" style={{ transform: `scaleX(${done ? 1 : raw})` }} />
        </div>

        <div className="loader-meta">
          <span>
            {state.phase === 'download' && !done && 'Загружаем горы'}
            {state.phase === 'decode' && !done && 'Раскладываем кадры'}
            {done && 'Готово'}
          </span>
          <span className="loader-percent">{percent}%</span>
        </div>
      </div>
    </div>
  )
}
