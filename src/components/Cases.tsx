import { Fragment, useRef } from 'react'
import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { CASES, CASES_NOTE, type CaseItem } from '@/content'
import { useAnimate } from '@/motion/useAnimate'
import { useInView } from '@/motion/useInView'
import { useReveal } from '@/motion/useReveal'
import { useScramble } from '@/motion/useScramble'
import { useRequest } from './request'

/**
 * Строка, которая уезжает вбок при наведении на карточку.
 * У Lusion каждая буква названия проекта сдвигается со своей задержкой,
 * поэтому слово не переезжает целиком, а протягивается.
 */
function ShiftText({ children, stagger = 12 }: { children: string; stagger?: number }) {
  /*
    Буквы обязаны быть сгруппированы по словам. Каждая буква здесь —
    inline-block, а такие элементы браузер переносит поодиночке: без
    обёртки «Клиника эстетической медицины» рвётся на «...МЕ / ДИЦИНЫ».
    Задержка считается сквозной, иначе волна начиналась бы заново
    в каждом слове.
  */
  const words = children.split(" ")
  let n = 0

  return (
    <span className="shift" aria-label={children}>
      {words.map((word, wi) => (
        <Fragment key={`${word}-${wi}`}>
          <span className="shift-word" aria-hidden>
            {Array.from(word).map((ch, ci) => (
              <span key={`${ch}-${ci}`} style={{ transitionDelay: `${n++ * stagger}ms` }}>
                {ch}
              </span>
            ))}
          </span>
          {/* Пробел стоит МЕЖДУ обёрток, а не внутри: замыкающий пробел
              внутри inline-block браузер отбрасывает, и слова слипаются
              в «СЕТЬФИТНЕС-КЛУБОВ». */}
          {wi < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

interface CardProps {
  item: CaseItem
  index: number
  active: () => boolean
  wide: boolean
}

function CaseCard({ item, index, active, wide }: CardProps) {
  const tags = useRef<HTMLSpanElement>(null)
  const openRequest = useRequest()
  const animate = useAnimate()

  // Каналы проявляются расшифровкой — приём Lusion для строки тегов
  useScramble(tags, item.tags, {
    active,
    delay: 0.25 + index * 0.1,
    enabled: animate,
  })

  /*
    Карточка открывает форму. Отдельных страниц у кейсов нет, а стрелка
    в углу обязана куда-то вести: неоткрывающаяся карточка раздражает
    сильнее, чем её отсутствие. Появятся страницы — на место кнопки
    встанет обычная ссылка, остальное не поменяется.
  */
  return (
    <button
      type="button"
      onClick={openRequest}
      className={`case-card${wide ? ' case-card--wide' : ''}`}
      style={
        {
          // Чётные приезжают слева, нечётные справа — и подкручены
          // в разные стороны. Так же расставляет карточки Lusion.
          '--dx': index % 2 ? '5vw' : '-5vw',
          '--rot': index % 2 ? '2.2deg' : '-2.2deg',
          transitionDelay: `${index * 90}ms`,
        } as CSSProperties
      }
    >
      <div className="case-panel">
        {/*
          Снимок ниши и ширма поверх него. Порядок в разметке и есть
          порядок слоёв: и то и другое лежит абсолютно, а содержимое
          карточки поднято над ними в стилях.

          Подпись пустая намеренно: смысл несут цифры и название, а
          фотография только задаёт нишу. Читалке она сказала бы то же
          самое второй раз.
        */}
        <img
          className="case-photo"
          src={item.photo}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="case-shade" aria-hidden />

        <span className="case-index">[{String(index + 1).padStart(2, '0')}]</span>

        <div className="case-hero">
          <span className="case-hero-value">{item.hero.value}</span>
          {item.hero.unit && <span className="case-hero-unit">{item.hero.unit}</span>}
        </div>
        <p className="case-hero-label">{item.hero.label}</p>

        <div className="case-stats">
          {item.stats.map((s) => (
            <div key={s.label} className="case-stat">
              <span className="case-stat-label">{s.label}</span>
              <span className="case-stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="case-foot">
        <span ref={tags} className="case-tags">
          {item.tags}
        </span>
        <div className="case-name-row">
          <h3 className="case-name">
            <ShiftText>{item.name}</ShiftText>
          </h3>
          <span className="case-arrow">
            <ArrowUpRight size={22} />
          </span>
        </div>
      </div>
    </button>
  )
}

export function Cases() {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const note = useRef<HTMLParagraphElement>(null)
  const active = useInView(section)
  const animate = useAnimate()
  const openRequest = useRequest()

  // Заголовок по буквам с наклоном — то же, что у Lusion на Featured Work
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

  // Подпись справа проявляется расшифровкой, как теги на карточках
  useScramble(note, CASES_NOTE, { active, delay: 0.2, enabled: animate })

  return (
    <section ref={section} id="cases" className="section section--cases" data-surface="light">
      <div className="section-head">
        <h2 ref={title} className="section-title">
          Кейсы
        </h2>
        <p ref={note} className="section-note">
          {CASES_NOTE}
        </p>
      </div>

      <div className="case-grid">
        {CASES.map((item, i) => (
          <CaseCard
            key={item.name}
            item={item}
            index={i}
            active={active}
            // Последняя карточка осталась бы одна в ряду — растягиваем
            wide={i === CASES.length - 1 && CASES.length % 2 === 1}
          />
        ))}
      </div>

      <div className="case-all">
        <button type="button" onClick={openRequest} className="pill roll-trigger">
          Обсудить свой проект
          <span className="pill-arrow">
            <ArrowUpRight size={16} />
          </span>
        </button>
      </div>
    </section>
  )
}
