import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, Send } from 'lucide-react'
import { useContent } from '@/i18n/lang'
import type { Bundle } from '@/i18n/dict'
import { formConfigured, REQUEST_ENDPOINT, telegramLink } from '@/integrations'

/** Через сколько уводить в бота после успешной отправки, мс. */
const REDIRECT_AFTER = 3000

type Status = 'idle' | 'sending' | 'done' | 'error'

interface Fields {
  name: string
  contact: string
  project: string
  budget: string
  task: string
  consent: boolean
}

const EMPTY: Fields = {
  name: '',
  contact: '',
  project: '',
  budget: '',
  task: '',
  consent: false,
}

/** Телефон, телеграм или почта — принимаем любой из трёх. */
function contactLooksValid(value: string) {
  const v = value.trim()
  if (/^@[\w\d_]{4,}$/.test(v)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return true
  // В телефоне считаем цифры, а не формат: скобки и дефисы у всех свои
  return (v.match(/\d/g) || []).length >= 10
}

/*
  Тексты ошибок приходят снаружи: проверка живёт вне компонента, а
  язык — внутри. Передать словарь дешевле, чем тащить сюда хук и
  делать функцию частью дерева React.
*/
function validate(f: Fields, ui: Bundle['UI']) {
  const errors: Partial<Record<keyof Fields, string>> = {}
  if (f.name.trim().length < 2) errors.name = ui.errName
  if (!f.contact.trim()) errors.contact = ui.errContact
  else if (!contactLooksValid(f.contact)) errors.contact = ui.errContactBad
  if (!f.consent) errors.consent = ui.errConsent
  return errors
}

interface RequestFormProps {
  /**
   * Приставка к идентификаторам полей. Форма живёт на странице в двух
   * экземплярах — в секции и в окне, — а одинаковые id разорвали бы
   * связь подписи с полем у обоих сразу.
   */
  idPrefix?: string
  /** Забрать фокус на первое поле. Нужно окну, секции — нет. */
  autoFocus?: boolean
}

/**
 * Форма заявки. Один код на секцию внизу страницы и на окно, которое
 * открывается из шапки: расходиться проверкам и полям тут нельзя.
 */
export function RequestForm({ idPrefix = 'field', autoFocus = false }: RequestFormProps) {
  const { CONTACT, UI } = useContent()
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [status, setStatus] = useState<Status>('idle')

  const id = (name: string) => `${idPrefix}-${name}`

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    // Ошибку снимаем сразу, как человек начал править поле
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(fields, UI)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Уводим фокус на первое незаполненное поле
      const first = Object.keys(found)[0]
      document.getElementById(id(first))?.focus()
      return
    }

    setStatus('sending')
    try {
      if (formConfigured()) {
        /*
          Шлём только поля. Текст письма складывает функция на своей
          стороне: приходи он готовым, любой мог бы отправить с адреса
          владельца сайта что угодно.
        */
        const res = await fetch(REQUEST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else if (import.meta.env.DEV) {
        console.warn(
          '[RequestForm] Адрес функции не задан — заявка никуда не ушла. ' +
            'Подставьте REQUEST_ENDPOINT в src/integrations.ts',
          fields,
        )
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  /*
    После заявки уводим в бота. Не мгновенно: человек только что нажал
    «отправить» и должен успеть увидеть, что всё дошло. Ссылка рядом
    доступна сразу — если переход не сработает, уйти можно руками.
  */
  useEffect(() => {
    const url = telegramLink()
    if (status !== 'done' || !url) return
    const t = window.setTimeout(() => {
      window.location.href = url
    }, REDIRECT_AFTER)
    return () => window.clearTimeout(t)
  }, [status])

  const lowBudget = fields.budget === CONTACT.lowBudget

  if (status === 'done') {
    const bot = telegramLink()
    return (
      <div className="contact-done" role="status">
        <span className="contact-done-mark">
          <Check size={20} />
        </span>
        <h3>{CONTACT.done}</h3>
        <p>{CONTACT.doneText}</p>

        {bot && (
          <>
            <a className="contact-done-bot" href={bot}>
              <Send size={16} />
              {UI.botCta}
            </a>
            <span className="contact-done-note">{UI.botNote}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      {/*
        Поля — подчёркивания, а не коробки: на почти чёрном фоне
        рамки собираются в сетку из прямоугольников и забивают
        собой текст. Подпись живёт внутри строки и уезжает вверх,
        когда в поле что-то появилось.
      */}
      <div className="field">
        <div className="field-box">
          <input
            id={id('name')}
            name="name"
            autoComplete="name"
            placeholder=" "
            autoFocus={autoFocus}
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? id('err-name') : undefined}
          />
          <label htmlFor={id('name')}>{UI.fieldName}</label>
          <span className="field-line" aria-hidden />
        </div>
        {errors.name && (
          <span className="field-error" id={id('err-name')}>
            {errors.name}
          </span>
        )}
      </div>

      <div className="field">
        <div className="field-box">
          <input
            id={id('contact')}
            name="contact"
            autoComplete="tel"
            placeholder=" "
            value={fields.contact}
            onChange={(e) => set('contact', e.target.value)}
            aria-invalid={!!errors.contact}
            aria-describedby={errors.contact ? id('err-contact') : undefined}
          />
          <label htmlFor={id('contact')}>{UI.fieldContact}</label>
          <span className="field-line" aria-hidden />
        </div>
        {errors.contact && (
          <span className="field-error" id={id('err-contact')}>
            {errors.contact}
          </span>
        )}
      </div>

      <div className="field field--wide">
        <div className="field-box">
          <input
            id={id('project')}
            name="project"
            placeholder=" "
            value={fields.project}
            onChange={(e) => set('project', e.target.value)}
          />
          <label htmlFor={id('project')}>{UI.fieldProject}</label>
          <span className="field-line" aria-hidden />
        </div>
      </div>

      {/*
        Бюджет плашками. Вариантов четыре, и родной выпадающий
        список на тёмном фоне открывался белым прямоугольником
        с почти невидимыми строками — выбирать было нечем.
      */}
      <div
        className="field field--wide budget"
        role="group"
        aria-labelledby={id('budget-label')}
      >
        <span className="budget-label" id={id('budget-label')}>
          {UI.fieldBudget}
        </span>
        <div className="chips">
          {CONTACT.budgets.map((b) => (
            <button
              key={b}
              type="button"
              className="chip"
              data-on={fields.budget === b ? '1' : undefined}
              aria-pressed={fields.budget === b}
              onClick={() => set('budget', fields.budget === b ? '' : b)}
            >
              {b}
            </button>
          ))}
        </div>
        {/* Порог из второго экрана — честнее сказать сразу, чем на созвоне */}
        {lowBudget && <span className="field-note">{CONTACT.lowBudgetNote}</span>}
      </div>

      <div className="field field--wide">
        <div className="field-box">
          <textarea
            id={id('task')}
            name="task"
            rows={3}
            placeholder=" "
            value={fields.task}
            onChange={(e) => set('task', e.target.value)}
          />
          <label htmlFor={id('task')}>{UI.fieldTask}</label>
          <span className="field-line" aria-hidden />
        </div>
      </div>

      <label className="consent field--wide">
        <input
          id={id('consent')}
          type="checkbox"
          checked={fields.consent}
          onChange={(e) => set('consent', e.target.checked)}
          aria-invalid={!!errors.consent}
        />
        <span className="consent-box" aria-hidden>
          <Check size={12} />
        </span>
        <span>{CONTACT.consent}</span>
      </label>
      {errors.consent && <span className="field-error field--wide">{errors.consent}</span>}

      <button type="submit" className="contact-submit field--wide" disabled={status === 'sending'}>
        <span className="contact-submit-text">
          {status === 'sending' ? CONTACT.sending : CONTACT.submit}
        </span>
        <span className="contact-submit-arrow">
          <ArrowRight size={18} />
        </span>
      </button>

      {status === 'error' && (
        <span className="field-error field--wide" role="alert">
          Не получилось отправить. Напишите нам напрямую
        </span>
      )}
    </form>
  )
}
