import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { BRAND, EASE, NAV_LINKS } from '@/config'
import { useRequest } from './request'
import { Logo } from './Logo'
import { RollText } from './RollText'
import { Menu } from './Menu'

/** Высота, на которой шапка «читает» фон под собой. */
const PROBE = 40

/** Ниже этой доли экрана плашку под ссылками ещё не показываем. */
const PILL_AT = 0.55

/**
 * Шапка закреплена и живёт над всеми блоками.
 *
 * Появление сдвинуто по элементам: у Lusion три правых элемента
 * входят с шагом 0.1 по внутреннему времени, здесь то же самое
 * задержками перехода.
 *
 * Сайт уходит из светлого в почти чёрный, и одного цвета букв на всё
 * не хватает: снизу тёмные надписи сливались с фоном начисто. Секции
 * помечены data-surface, шапка на прокрутке смотрит, какая из них
 * пересекает её высоту, и переключает тему. Побеждает последняя по
 * порядку в разметке — так внутренняя метка в полосе-переходе
 * перекрывает саму полосу там, где та уже стемнела.
 *
 * Одного цвета всё равно мало: под шапкой проезжает ещё и белый
 * заголовок моста, на нём светлые буквы пропали бы точно так же.
 * Поэтому за первым экраном под ссылками проявляется плашка.
 *
 * Всё это пишется прямо в атрибуты, минуя состояние React: прокрутка
 * приходит каждый кадр, и гонять по ней перерисовку дерева — ровно
 * тот случай, когда анимация начинает спотыкаться.
 */
export function Header() {
  const root = useRef<HTMLElement>(null)
  const openRequest = useRequest()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 200)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return

    let zones = Array.from(document.querySelectorAll<HTMLElement>('[data-surface]'))
    let theme = ''
    let pill = ''

    const read = () => {
      let dark = false
      for (const z of zones) {
        const r = z.getBoundingClientRect()
        if (r.top <= PROBE && r.bottom > PROBE) dark = z.dataset.surface === 'dark'
      }

      const nextTheme = dark ? 'dark' : 'light'
      const nextPill = window.scrollY > window.innerHeight * PILL_AT ? '1' : ''

      // Пишем только на смене: иначе каждый кадр трогали бы разметку
      if (nextTheme !== theme) {
        theme = nextTheme
        el.dataset.theme = nextTheme
      }
      if (nextPill !== pill) {
        pill = nextPill
        if (nextPill) el.dataset.scrolled = '1'
        else delete el.dataset.scrolled
      }
    }

    const onResize = () => {
      zones = Array.from(document.querySelectorAll<HTMLElement>('[data-surface]'))
      read()
    }

    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const entrance = (delay: number): CSSProperties => ({
    opacity: ready ? 1 : 0,
    transform: ready ? 'translateY(0)' : 'translateY(-1.4em)',
    transition: `opacity 0.7s ${EASE} ${delay}ms, transform 0.7s ${EASE} ${delay}ms`,
  })

  return (
    <header
      ref={root}
      className="site-header pointer-events-none fixed top-0 left-0 z-[100] flex w-full items-start justify-between px-6 pt-8 sm:px-8 sm:pt-10 md:px-12"
      data-theme="light"
    >
      <div className="header-pill header-nav pointer-events-auto hidden items-center gap-8 lg:flex xl:gap-10">
        {NAV_LINKS.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            data-active={i === 0 ? '1' : undefined}
            className="nav-link roll-trigger relative text-xs font-medium uppercase tracking-[0.15em]"
            style={entrance(i * 80 + 100)}
          >
            {/* Первым пунктом стоит имя агентства — с ним и знак */}
            {i === 0 ? (
              <span className="brand">
                <Logo />
                <RollText>{link.label}</RollText>
              </span>
            ) : (
              <RollText>{link.label}</RollText>
            )}
          </a>
        ))}
      </div>

      {/*
        Полоса ссылок скрыта до 1024, и шапка осталась бы вовсе без
        имени. На месте бывшей пустой распорки — знак: он держит ту же
        сетку и заодно возвращает наверх. На телефоне это единственный
        путь домой, потому что полосы с ссылками там нет.
      */}
      <a
        href="#top"
        className="header-brand brand roll-trigger pointer-events-auto lg:hidden"
        style={entrance(100)}
      >
        <Logo />
        <RollText>{NAV_LINKS[0].label}</RollText>
      </a>

      <div className="pointer-events-auto flex items-start gap-4 sm:gap-6" style={entrance(500)}>
        {/* Не ссылка вниз: форма приходит сама, окном. Мотать через
            горы, кейсы и мост ради одного намерения — долгий ответ */}
        <button
          type="button"
          onClick={openRequest}
          className="header-pill roll-trigger hidden items-center gap-2.5 text-xs font-medium uppercase tracking-[0.2em] sm:flex"
        >
          <RollText>Обсудить проект</RollText>
          <span
            className="talk-dot flex h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND }}
          >
            <ArrowRight size={10} color="#ffffff" />
          </span>
        </button>

        <Menu />
      </div>
    </header>
  )
}
