import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { BRAND, CONTACT_EMAIL, INK } from '@/config'
import { useContent, useOther } from '@/i18n/lang'
import { RollText } from './RollText'

/**
 * Задержки открытия и закрытия.
 *
 * Приём Lusion: открывается сверху вниз, закрывается снизу вверх.
 * Задержка закрытия живёт в базовом правиле, задержка открытия —
 * в правиле .--opened, поэтому одного набора свойств хватает на обе
 * стороны анимации.
 */
function delays(i: number, total: number): CSSProperties {
  return {
    '--open-delay': `${i / 50}s`,
    '--close-delay': `${Math.abs(i - total) / 50}s`,
  } as CSSProperties
}

export function Menu() {
  const { NAV, UI } = useContent()
  const other = useOther()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const total = 3

  return (
    <div ref={root} className="pointer-events-auto relative">
      {/* ------------------------- Кнопка ------------------------- */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? UI.closeMenu : UI.openMenu}
        onClick={() => setOpen((v) => !v)}
        className="menu-btn"
        data-open={open ? '1' : undefined}
      >
        <span className="menu-btn-inner">
          {/* Две подписи в маске: одна уходит вверх, вторая приходит снизу */}
          <span className="menu-btn-labels">
            <span className="menu-btn-label">{UI.menu}</span>
            <span className="menu-btn-label menu-btn-label--close">{UI.close}</span>
            {/* Двойники на другом языке: не видны, но держат ширину */}
            <span className="lang-ghost">{other.UI.menu}</span>
            <span className="lang-ghost">{other.UI.close}</span>
          </span>
          <span className="menu-btn-dots">
            <i />
            <i />
          </span>
        </span>
      </button>

      {/* ------------------------- Панели ------------------------- */}
      <div className="menu-panels" data-open={open ? '1' : undefined}>
        {/* 1. Разделы */}
        <nav className="menu-panel menu-panel--links" style={delays(0, total)}>
          {NAV.map((link, i) => (
            <a
              /*
              Ключ по адресу, а не по подписи.

              Подпись меняется вместе с языком, и React считал ссылку
              новой: выбрасывал старую, вставлял свежую и заново
              проигрывал появление. Шапка от этого мигала при каждом
              переключении. Адрес у ссылки один и тот же на любом языке —
              по нему React и узнаёт, что это тот же самый пункт.
            */
            key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="menu-link roll-trigger"
              data-active={i === 0 ? '1' : undefined}
            >
              <RollText>{link.label}</RollText>
              <span className="menu-link-dot" />
            </a>
          ))}
        </nav>

        {/* 2. Контакт */}
        <div className="menu-panel menu-panel--contact" style={delays(1, total)}>
          <p className="menu-contact-title">
            {UI.discussLines[0]}
            <br />
            {UI.discussLines[1]}
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="menu-contact-mail roll-trigger">
            <RollText>{CONTACT_EMAIL}</RollText>
            <span className="menu-contact-arrow" style={{ backgroundColor: BRAND }}>
              <ArrowRight size={13} color="#ffffff" />
            </span>
          </a>
        </div>

        {/* 3. Акцентная карточка */}
        <a
          href="#cases"
          onClick={() => setOpen(false)}
          className="menu-panel menu-panel--accent roll-trigger"
          style={{ ...delays(2, total), backgroundColor: INK }}
        >
          <RollText>{UI.seeCases}</RollText>
          <ArrowUpRight size={20} />
        </a>
      </div>
    </div>
  )
}
