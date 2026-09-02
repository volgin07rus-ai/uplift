import { useEffect, useState } from 'react'
import { useLang } from '@/i18n/lang'
import type { Lang } from '@/i18n/dict'

/**
 * Переключатель языка.
 *
 * ── Одна кнопка, а не две ──────────────────────────────────────────
 *
 * Языка всего два, и выбор здесь — это переключение, а не выбор из
 * списка. Целиться в половинку шириной в сорок точек незачем: нажатие
 * куда угодно по кнопке меняет язык на другой.
 *
 * ── Почему подложка едет отдельно от текста ────────────────────────
 *
 * Текст меняется не сразу: он сперва уходит, и только потом за
 * закрытыми глазами подменяется. Если подложку двигать вместе с ним,
 * между нажатием и движением повисает пятая доля секунды — кнопка
 * кажется залипшей. Поэтому подложка едет сразу, своим состоянием, а
 * язык догоняет.
 */
export function LangSwitch() {
  const { lang, setLang } = useLang()
  const [shown, setShown] = useState<Lang>(lang)

  // Язык могли поменять и не отсюда — держим подложку в согласии с ним
  useEffect(() => setShown(lang), [lang])

  const next: Lang = shown === 'ru' ? 'en' : 'ru'

  return (
    <button
      type="button"
      className="lang-switch"
      onClick={() => {
        setShown(next)
        setLang(next)
      }}
      aria-label={next === 'en' ? 'Switch to English' : 'Переключить на русский'}
    >
      {/*
        Оба конца переезда заданы явным значением, а не «есть правило /
        нет правила». Переход из transform: none в translateX местами
        залипал: подложка оставалась там, где была, хотя класс уже
        сменился. С двумя явными значениями браузеру нечего доопределять.
      */}
      <span
        className="lang-switch-thumb"
        data-lang={shown}
        style={{ transform: shown === 'en' ? 'translateX(100%)' : 'translateX(0%)' }}
        aria-hidden
      />
      <span className="lang-switch-label" data-active={shown === 'ru' ? '1' : undefined}>
        RU
      </span>
      <span className="lang-switch-label" data-active={shown === 'en' ? '1' : undefined}>
        EN
      </span>
    </button>
  )
}
