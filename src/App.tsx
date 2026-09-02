import { ColdSide } from '@/ColdSide'
import { LangProvider } from '@/i18n/LangProvider'
import { SideProvider } from '@/transition/SideProvider'

/**
 * Сайт целиком.
 *
 * Всё содержимое живёт в ColdSide — это холодная сторона: горы, снег,
 * кейсы, форма. Тёплую сторону поднимает SideProvider, он же отвечает
 * за погоду между ними: метель туда, листья обратно.
 *
 * Язык снаружи от сторон: он общий для обеих, и переключение не должно
 * ронять состояние перехода.
 */
export default function App() {
  return (
    <LangProvider>
      <SideProvider>
        <ColdSide />
      </SideProvider>
    </LangProvider>
  )
}
