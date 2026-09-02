import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useContent } from '@/i18n/lang'
import { RequestCtx } from './request'
import { RequestForm } from './RequestForm'

/**
 * Окно с формой заявки.
 *
 * «Обсудить проект» в шапке раньше просто мотало страницу вниз —
 * через горы, кейсы и мост. Это долгий ответ на короткое намерение,
 * поэтому теперь форма приходит сама.
 *
 * Внутри тот же RequestForm, что и в секции внизу: расходиться
 * проверкам и полям между двумя копиями нельзя.
 */
export function RequestModal({ children }: { children: ReactNode }) {
  const { CONTACT, UI } = useContent()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  /** Куда вернуть фокус, когда окно закроется. */
  const opener = useRef<HTMLElement | null>(null)

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null
    setOpen(true)
  }, [])

  const hide = useCallback(() => setOpen(false), [])

  /*
    Фокус возвращаем не в hide, а после того, как окно ушло из дерева.
    Раньше вызов стоял рядом с setOpen — и браузер тут же сбрасывал
    фокус на body, убирая поле, на котором тот стоял.
  */
  useEffect(() => {
    if (open) return
    const el = opener.current
    opener.current = null
    el?.focus()
  }, [open])

  /* Esc закрывает, страница под окном не листается */
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    window.addEventListener('keydown', onKey)

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, hide])

  return (
    <RequestCtx.Provider value={show}>
      {children}

      {open && (
        <div
          className="modal"
          // Щелчок мимо окна закрывает — но только мимо, а не по нему
          onMouseDown={(e) => {
            if (!panel.current?.contains(e.target as Node)) hide()
          }}
        >
          <div
            ref={panel}
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button type="button" className="modal-close" onClick={hide} aria-label={UI.close}>
              <X size={18} />
            </button>

            <span className="section-label">{CONTACT.label}</span>
            <h2 className="modal-title" id="modal-title">
              {CONTACT.title[0]} {CONTACT.title[1]}
            </h2>
            <p className="modal-text">{CONTACT.text}</p>

            <RequestForm idPrefix="modal" autoFocus />
          </div>
        </div>
      )}
    </RequestCtx.Provider>
  )
}
