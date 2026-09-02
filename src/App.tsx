import { ColdSide } from '@/ColdSide'
import { SideProvider } from '@/transition/SideProvider'

/**
 * Сайт целиком.
 *
 * Всё содержимое живёт в ColdSide — это холодная сторона: горы, снег,
 * кейсы, форма. Тёплую сторону поднимает SideProvider, он же отвечает
 * за погоду между ними: метель туда, листья обратно.
 */
export default function App() {
  return (
    <SideProvider>
      <ColdSide />
    </SideProvider>
  )
}
