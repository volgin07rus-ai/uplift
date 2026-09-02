import type { CSSProperties } from 'react'

interface RollTextProps {
  children: string
  /** Шаг задержки между буквами, мс. У Lusion 20. */
  stagger?: number
  className?: string
}

/**
 * Прокрутка букв при наведении.
 *
 * Каждая буква сидит в своей колонке, где лежит дважды. Колонка едет
 * вверх ровно на одну строку — верхняя копия уходит под маску, нижняя
 * встаёт на её место. Задержка растёт по буквам, поэтому слово
 * перекатывается волной, а не целиком.
 *
 * Ховер ловится родителем с классом roll-trigger — так эффект работает
 * и когда буквы лежат внутри ссылки с иконкой.
 */
export function RollText({ children, stagger = 20, className = '' }: RollTextProps) {
  const chars = Array.from(children)

  return (
    <span className={`roll ${className}`} aria-label={children}>
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="roll-col"
          data-space={ch === ' ' ? '' : undefined}
          style={{ transitionDelay: `${i * stagger}ms` } as CSSProperties}
          aria-hidden
        >
          <span>{ch === ' ' ? ' ' : ch}</span>
          <span>{ch === ' ' ? ' ' : ch}</span>
        </span>
      ))}
    </span>
  )
}
