import { useEffect, useRef } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { BRIDGE } from '@/content'
import { useAnimate } from '@/motion/useAnimate'
import { useInView, useInViewFlag } from '@/motion/useInView'
import { useReveal } from '@/motion/useReveal'
import { useScramble } from '@/motion/useScramble'
import { useSide } from '@/transition/side'

/**
 * Мост между двумя сторонами.
 *
 * Здесь сайт остывает до конца и уходит в тепло. Раньше на этом месте
 * стояли две карточки-списка рядом — читалось как сравнение, будто
 * холодное спорит с тёплым. Но это не спор: одно нужно ради другого.
 * Поэтому строки идут парами и связаны линией, которая тянется слева
 * направо — от ставок к полному залу.
 *
 * Кнопка внизу не уводит на другой сайт. Это та же страница, просто
 * другая её сторона: переход идёт сквозь метель, которая по дороге
 * оборачивается листьями.
 */
export function Bridge() {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const active = useInView(section)
  const near = useInViewFlag(section, '25% 0px 25% 0px')
  const animate = useAnimate()
  const { go, prefetch } = useSide()

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

  useScramble(label, BRIDGE.label, { active, delay: 0.1, enabled: animate })

  /*
    Тёплая сторона — отдельный документ с тяжёлой сценой. Поднимаем
    её заранее, как только человек добрался до моста: к нажатию она
    уже готова, и буря не держит белизну лишнюю секунду. Полсекунды
    паузы — чтобы не начинать загрузку в момент выезда самого блока.
  */
  useEffect(() => {
    if (!near) return
    const t = window.setTimeout(prefetch, 600)
    return () => window.clearTimeout(t)
  }, [near, prefetch])

  const onCta = (e: MouseEvent<HTMLAnchorElement>) => {
    // Ссылка остаётся ссылкой: средняя кнопка и Ctrl открывают вкладку
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go('warm')
  }

  return (
    <section ref={section} id="bridge" className="section section--bridge" data-surface="dark">
      <div className="bridge-inner">
        <span ref={label} className="section-label">
          {BRIDGE.label}
        </span>

        <h2 ref={title} className="section-title bridge-title">
          {BRIDGE.title[0]}
          <br />
          {BRIDGE.title[1]}
        </h2>

        <p className="bridge-text">{BRIDGE.text}</p>

        <div className="bridge-pairs">
          <div className="bridge-pairs-head" aria-hidden>
            <span className="bridge-note bridge-note--cold">{BRIDGE.coldNote}</span>
            <span />
            <span className="bridge-note bridge-note--warm">{BRIDGE.warmNote}</span>
          </div>

          {BRIDGE.pairs.map((pair, i) => (
            <div
              key={pair.cold}
              className="bridge-pair"
              style={{ transitionDelay: `${i * 110}ms` } as CSSProperties}
            >
              <span className="bridge-pair-cold">{pair.cold}</span>
              {/* Линия тянется от холодного к тёплому — это и есть весь блок */}
              <span className="bridge-pair-link" aria-hidden>
                <i style={{ transitionDelay: `${260 + i * 110}ms` } as CSSProperties} />
                <ArrowRight size={14} />
              </span>
              <span className="bridge-pair-warm">{pair.warm}</span>
            </div>
          ))}
        </div>

        <a
          href={BRIDGE.href}
          className="bridge-cta"
          onClick={onCta}
          onPointerEnter={prefetch}
          onFocus={prefetch}
          style={{ transitionDelay: '320ms' } as CSSProperties}
        >
          <span className="bridge-cta-body">
            <span className="bridge-cta-text">{BRIDGE.cta}</span>
            <span className="bridge-cta-note">{BRIDGE.ctaNote}</span>
          </span>
          <span className="bridge-cta-arrow">
            <ArrowRight size={20} />
          </span>
        </a>
      </div>
    </section>
  )
}
