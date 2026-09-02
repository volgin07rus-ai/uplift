import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DICT, type Lang } from './dict'
import { LANG_KEY, LangCtx, initialLang } from './lang'

/** Сколько текст уходит и сколько возвращается, мс. */
const OUT = 220
const IN = 420

/**
 * Язык на весь сайт.
 *
 * Хранит выбор, сообщает его тёплой стороне и правит атрибут lang у
 * документа — по нему браузер решает, как переносить слова и как читать
 * страницу вслух.
 *
 * ── Почему подмена в две фазы ──────────────────────────────────────
 *
 * Мгновенная подмена читается как сбой: строки разной длины дёргают
 * раскладку, и глаз ловит рывок, а не смысл. Поэтому текст сначала
 * уходит — расфокусируется и приподнимается, — и только потом, за
 * закрытыми глазами, меняется язык. Возвращается он уже новым.
 *
 * Уход короче возвращения. Так и в жизни: исчезает быстро, проявляется
 * медленно — иначе подмена выглядит суетливой.
 *
 * Провайдер отдельно от контекста намеренно: так обновление модулей на
 * лету не сбрасывает выбранный язык при каждой правке словаря.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const timers = useRef<number[]>([])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = DICT[lang].UI.title
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // Хранилище может быть закрыто — язык просто не переживёт перезаход
    }

    /*
      Тёплая сторона — отдельный документ в кадре. Своего состояния
      React у неё нет, поэтому язык ей просто сообщается; она сама
      перебирает подписанные узлы. Кадр может быть ещё не поднят —
      тогда он прочитает язык из хранилища при запуске.
    */
    document.querySelectorAll('iframe').forEach((frame) => {
      frame.contentWindow?.postMessage({ type: 'uplift:lang', lang }, window.location.origin)
    })
  }, [lang])

  /*
    Текущий язык держим ещё и в ссылке.

    Сравнить с ним можно снаружи обновления состояния — а внутрь класть
    побочные действия нельзя: в строгом режиме React вызывает функцию
    обновления дважды, чтобы поймать ровно такие места. Таймеры при этом
    заводились по два раза, фаза подмены мигала, и переходы, которые она
    перебивает, начинались заново — подложка переключателя не доезжала.
  */
  const langRef = useRef(lang)
  langRef.current = lang

  const setLang = useCallback((next: Lang) => {
    if (langRef.current === next) return

    const root = document.documentElement
    timers.current.forEach(clearTimeout)
    timers.current = []

    root.dataset.langSwap = 'out'
    timers.current.push(
      // Меняем язык, когда текст уже ушёл, — подмены никто не видит
      window.setTimeout(() => {
        setLangState(next)
        root.dataset.langSwap = 'in'
      }, OUT),
      window.setTimeout(() => delete root.dataset.langSwap, OUT + IN),
    )
  }, [])

  /*
    Переключить язык можно и с тёплой стороны — она в кадре, и своя
    кнопка у неё там же, в шапке. Оттуда приходит сообщение, и здесь мы
    просто соглашаемся: сторона в этот момент спрятана, разыгрывать над
    ней подмену текста некому и незачем.
  */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; lang?: string } | null
      if (d?.type !== 'uplift:lang') return
      setLangState(d.lang === 'en' ? 'en' : 'ru')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const running = timers.current
    return () => running.forEach(clearTimeout)
  }, [])

  const value = useMemo(() => ({ lang, setLang, t: DICT[lang] }), [lang, setLang])

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}
