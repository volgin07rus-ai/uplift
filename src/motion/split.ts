/**
 * Разбор текста на строки, слова и буквы.
 *
 * Lusion берёт для этого split-type, но нам нужна ровно одна вещь:
 * строка с overflow: hidden, внутри — слова, внутри — буквы, каждая
 * со своим transform. Это тридцать строк, зависимость не нужна.
 *
 * Строки задаются <br> в разметке, а не измеряются: так они не
 * разъезжаются при смене шрифта и не требуют пересчёта на resize.
 */

export interface Split {
  lines: HTMLElement[]
  words: HTMLElement[]
  chars: HTMLElement[]
}

/** Исходная разметка, чтобы разбор можно было откатить и повторить. */
const originals = new WeakMap<HTMLElement, string>()

export function splitText(el: HTMLElement, mode: 'words' | 'chars'): Split {
  if (!originals.has(el)) originals.set(el, el.innerHTML)
  const source = originals.get(el)!

  const lines: HTMLElement[] = []
  const words: HTMLElement[] = []
  const chars: HTMLElement[] = []

  el.textContent = ''

  for (const lineText of source.split(/<br\s*\/?>/i)) {
    const text = lineText.replace(/<[^>]+>/g, '').trim()
    if (!text) continue

    const line = document.createElement('span')
    line.className = 'split-line'
    lines.push(line)

    const parts = text.split(/\s+/)
    parts.forEach((wordText, i) => {
      const word = document.createElement('span')
      word.className = 'split-word'
      words.push(word)

      if (mode === 'chars') {
        for (const ch of Array.from(wordText)) {
          const char = document.createElement('span')
          char.className = 'split-char'
          char.textContent = ch
          chars.push(char)
          word.appendChild(char)
        }
      } else {
        word.textContent = wordText
      }

      line.appendChild(word)
      // Обычный пробельный узел между inline-block: схлопнется в один
      // пробел нужной ширины, в отличие от margin.
      if (i < parts.length - 1) line.appendChild(document.createTextNode(' '))
    })

    el.appendChild(line)
  }

  return { lines, words, chars }
}

/** Вернуть исходный текст — нужно на мобильном, где анимацию не крутим. */
export function revertText(el: HTMLElement) {
  const source = originals.get(el)
  if (source !== undefined) el.innerHTML = source
}
