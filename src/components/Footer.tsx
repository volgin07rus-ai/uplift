import type { MouseEvent } from 'react'
import { useContent } from '@/i18n/lang'
import { useSide } from '@/transition/side'
import { useRequest } from './request'
import { Logo } from './Logo'
import { RollText } from './RollText'

export function Footer() {
  const { AGENCY, BRIDGE, NAV_FOOTER, UI } = useContent()
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
          <span className="footer-col-title">{UI.sections}</span>
          {NAV_FOOTER.map((link) => (
            <a key={link.label} href={link.href} className="footer-link roll-trigger">
              <RollText>{link.label}</RollText>
            </a>
          ))}
        </div>

        <div className="footer-col">
          <span className="footer-col-title">{UI.contactCol}</span>
          <a href={`mailto:${AGENCY.email}`} className="footer-link roll-trigger">
            <RollText>{AGENCY.email}</RollText>
          </a>
          {/* Не якорь вниз, а то же окно, что и в шапке */}
          <button type="button" onClick={openRequest} className="footer-link roll-trigger">
            <RollText>{UI.leaveRequest}</RollText>
          </button>
        </div>

        <div className="footer-col">
          <span className="footer-col-title">{UI.otherSide}</span>
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
          <RollText>{UI.privacy}</RollText>
        </a>
        {/*
          Подпись автора. Нарочно тише всего остального в подвале: она
          нужна тому, кто специально ищет, кем сделан сайт, и не должна
          спорить с самим сайтом. Имя домена чуть светлее слова перед
          ним — читается как ссылка, не крича об этом.
        */}
        <a
          className="footer-credit"
          href="https://volgin.site"
          target="_blank"
          rel="noopener noreferrer"
        >
          {UI.credit} <span>volgin.site</span>
        </a>
      </div>
    </footer>
  )
}
