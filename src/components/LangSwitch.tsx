import { useLang } from '@/i18n/lang'
import type { Lang } from '@/i18n/dict'

const OPTIONS: { code: Lang; label: string; title: string }[] = [
  { code: 'ru', label: 'RU', title: 'Русский' },
  { code: 'en', label: 'EN', title: 'English' },
]

/**
 * Переключатель языка.
 *
 * Две подписи и подложка, которая переезжает под выбранную. Едет
 * именно подложка, а не подсветка каждой половины по очереди: глаз
 * читает переезд как одно движение, а два вспыхивания — как мигание.
 *
 * Подписи оставлены латиницей в обоих языках. «Рус/Англ» рядом с
 * «RU/EN» выглядит переводом ради перевода, а RU и EN узнают все.
 */
export function LangSwitch() {
  const { lang, setLang } = useLang()

  return (
    <div className="lang-switch" role="group" aria-label={lang === 'ru' ? 'Язык' : 'Language'}>
      {/* Подложка под выбранным. Её положение задаёт data-lang */}
      <span className="lang-switch-thumb" data-lang={lang} aria-hidden />
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          className="lang-switch-btn"
          data-active={lang === o.code ? '1' : undefined}
          aria-pressed={lang === o.code}
          title={o.title}
          onClick={() => setLang(o.code)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
