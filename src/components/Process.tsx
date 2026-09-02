import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useContent } from '@/i18n/lang'
import { useAnimate } from '@/motion/useAnimate'
import { useInView } from '@/motion/useInView'
import { useReveal } from '@/motion/useReveal'

export function Process() {
  const { FACTS, PROCESS } = useContent()
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const active = useInView(section)
  const animate = useAnimate()

  useReveal(title, {
    split: 'chars',
    from: 1,
    rotate: 10,
    duration: 1,
    speed: 1.5,
    stagger: 1 / 20,
    active,
    enabled: animate,
  })

  return (
    <section ref={section} id="process" className="section section--process" data-surface="light">
      <div className="section-head">
        <h2 ref={title} className="section-title">
          Как работаем
        </h2>
      </div>

      <div className="step-grid">
        {PROCESS.map((s, i) => (
          <div
            key={s.index}
            className="step"
            style={{ transitionDelay: `${i * 110}ms` } as CSSProperties}
          >
            <span className="step-index">[{s.index}]</span>
            <h3 className="step-title">{s.title}</h3>
            <p className="step-text">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="fact-row">
        {FACTS.map((f, i) => (
          <div
            key={f.label}
            className="fact"
            style={{ transitionDelay: `${400 + i * 90}ms` } as CSSProperties}
          >
            <span className="fact-value">{f.value}</span>
            <span className="fact-label">{f.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
