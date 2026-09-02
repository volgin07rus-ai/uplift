import type { MouseEvent } from 'react'
import { AGENCY, BRIDGE, NAV_LINKS_FOOTER } from '@/content'
import { useSide } from '@/transition/side'
import { useRequest } from './request'
import { Logo } from './Logo'
import { RollText } from './RollText'

export function Footer() {
  const year = new Date().getFullYear()
  const { go, prefetch } = useSide()
  const openRequest = useRequest()

  const toWarm = (e: MouseEvent<HTMLAnchorElement>) => {
    // Ссылка остаётся ссылкой: средняя кнопка и Ctrl открывают вкладку
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go('warm')
  }

  return (
    <footer className="site-footer" data-surface="dark">
      <div className="footer-top">
        <span className="footer-mark brand">
          <Logo />
          {AGENCY.name}
        </span>
        <p className="footer-tagline">{AGENCY.tagline}</p>
      </div>

      <div className="footer-cols">
        <div className="footer-col">
          <span className="footer-col-title">Разделы</span>
          {NAV_LINKS_FOOTER.map((link) => (
            <a key={link.label} href={link.href} className="footer-link roll-trigger">
              <RollText>{link.label}</RollText>
            </a>
          ))}
        </div>

        <div className="footer-col">
          <span className="footer-col-title">Связь</span>
          <a href={`mailto:${AGENCY.email}`} className="footer-link roll-trigger">
            <RollText>{AGENCY.email}</RollText>
          </a>
          {/* Не якорь вниз, а то же окно, что и в шапке */}
          <button type="button" onClick={openRequest} className="footer-link roll-trigger">
            <RollText>Оставить заявку</RollText>
          </button>
        </div>

        <div className="footer-col">
          <span className="footer-col-title">Другая сторона</span>
          <a
            href={BRIDGE.href}
            className="footer-link roll-trigger"
            onClick={toWarm}
            onPointerEnter={prefetch}
            onFocus={prefetch}
          >
            <RollText>{BRIDGE.cta}</RollText>
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {year} {AGENCY.name}</span>
        <a href="#" className="footer-link roll-trigger">
          <RollText>Политика конфиденциальности</RollText>
        </a>
      </div>
    </footer>
  )
}
