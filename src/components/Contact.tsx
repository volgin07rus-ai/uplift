import { useRef } from 'react'
import { useContent } from '@/i18n/lang'
import { useAnimate } from '@/motion/useAnimate'
import { useInView } from '@/motion/useInView'
import { useReveal } from '@/motion/useReveal'
import { useScramble } from '@/motion/useScramble'
import { RequestForm } from './RequestForm'

/**
 * Секция с формой заявки.
 *
 * Сама форма живёт в RequestForm — её же показывает окно, которое
 * открывается из шапки. Здесь только обвязка: заголовок, обещание
 * и три шага о том, что будет после отправки.
 */
export function Contact() {
  const { CONTACT } = useContent()
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const active = useInView(section)
  const animate = useAnimate()

  useReveal(title, {
    split: 'chars',
    from: 1,
    rotate: 10,
    duration: 1,
    speed: 1.5,
    stagger: 1 / 30,
    active,
    enabled: animate,
  })

  useScramble(label, CONTACT.label, { active, delay: 0.1, enabled: animate })

  return (
    <section ref={section} id="contact" className="section section--contact" data-surface="dark">
      <div className="contact-grid">
        <div className="contact-intro">
          <span ref={label} className="section-label">
            {CONTACT.label}
          </span>
          <h2 ref={title} className="section-title">
            {CONTACT.title[0]}
            <br />
            {CONTACT.title[1]}
          </h2>
          <p className="contact-text">{CONTACT.text}</p>

          {/* Что будет после отправки — единственный вопрос, который
              на этом месте у человека остаётся */}
          <ol className="contact-after">
            {CONTACT.after.map((a) => (
              <li key={a.step} className="contact-after-item">
                <span className="contact-after-step">{a.step}</span>
                <span className="contact-after-body">
                  <span className="contact-after-title">{a.title}</span>
                  <span className="contact-after-text">{a.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <RequestForm />
      </div>
    </section>
  )
}
