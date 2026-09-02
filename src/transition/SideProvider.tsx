import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { StormCurtain } from './StormCurtain'
import { SideCtx, SIDE_PATH, sideFromPath, WARM_DOC, type Side, type SideApi } from './side'

/**
 * Переключатель сторон.
 *
 * Холодная сторона — это всё дерево React, оно смонтировано всегда.
 * Тёплая лежит отдельным документом (там своя сцена на WebGPU) и живёт
 * во встроенном кадре. Переключение — не переход по ссылке: холодную
 * сторону мы прячем, а не выгружаем, поэтому возврат мгновенный,
 * прокрутка на месте, а видео и разложенные кадры остаются в памяти.
 *
 * Адрес в строке при этом честно меняется — сайт остаётся один,
 * просто у него две страницы. И никакого загрузочного экрана: ждать,
 * если придётся, будет метель.
 *
 * ── О разговоре с тёплым документом ───────────────────────────────
 *
 * Кадр поднимается заранее, чтобы к нажатию сцена была собрана. Но
 * невидимую сцену нельзя оставлять крутиться: она считала траву и
 * постобработку за спиной у холодной страницы, и та заметно
 * подтормаживала на прокрутке. Поэтому:
 *
 *   кадр → нам:   uplift:scene-ready  — сцена нарисовала первый кадр
 *   мы → кадру:   uplift:render {on}  — рисовать или замереть
 *
 * Готовность считаем по scene-ready, а не по load: load приходит
 * гораздо раньше, чем собран конвейер, и открывать по нему нельзя —
 * под занавесом окажется полупустое поле.
 */
export function SideProvider({ children }: { children: ReactNode }) {
  const [side, setSide] = useState<Side>(() =>
    typeof window === 'undefined' ? 'cold' : sideFromPath(window.location.pathname),
  )
  const [warmMounted, setWarmMounted] = useState(() => side === 'warm')
  const [busy, setBusy] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const curtainRef = useRef<StormCurtain | null>(null)
  const sceneReady = useRef(side === 'warm')
  const waiters = useRef<(() => void)[]>([])
  const coldScroll = useRef(0)
  /**
   * Куда встать на холодной стороне после возврата. Тёплая может
   * попросить не просто «обратно», а «обратно к форме» — тогда
   * вместо прежнего места мы едем к якорю.
   */
  const pendingAnchor = useRef<string | null>(null)
  const mountAsked = useRef(side === 'warm')
  const sideRef = useRef(side)

  useEffect(() => {
    sideRef.current = side
  }, [side])

  /* ---------------- разговор с тёплым документом ---------------- */

  /** Просим сцену рисовать или замереть. До scene-ready уйдёт в пустоту — не страшно. */
  const tellWarm = useCallback((on: boolean) => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'uplift:render', on },
      window.location.origin,
    )
  }, [])

  const releaseWaiters = useCallback(() => {
    sceneReady.current = true
    const list = waiters.current
    waiters.current = []
    for (const done of list) done()
  }, [])

  const waitWarm = useCallback(
    () =>
      sceneReady.current
        ? Promise.resolve()
        : new Promise<void>((resolve) => waiters.current.push(resolve)),
    [],
  )

  /**
   * Подстраховка на случай, когда сцена не заводится вовсе — например,
   * в браузере без WebGPU. Без неё каждый переход впустую выдерживал бы
   * полный предел ожидания.
   */
  const onFrameLoad = useCallback(() => {
    window.setTimeout(() => {
      if (!sceneReady.current) releaseWaiters()
    }, 2500)
  }, [releaseWaiters])

  /* ---------------- подъём тёплой стороны ---------------- */

  /**
   * Поднять кадр заранее. Момент выбираем не сам — ждём затишья:
   * сборка сцены тяжёлая, и запускать её прямо посреди прокрутки
   * значит уронить кадры именно там, где человек листает.
   */
  const prefetch = useCallback(() => {
    if (mountAsked.current) return
    mountAsked.current = true
    const mount = () => setWarmMounted(true)
    const idle = window.requestIdleCallback
    if (idle) idle(mount, { timeout: 2500 })
    else window.setTimeout(mount, 400)
  }, [])

  /* ---------------- сам переход ---------------- */

  const swap = useCallback(
    (to: Side, push: boolean) => {
      if (to === 'warm') {
        mountAsked.current = true
        setWarmMounted(true)
        // Сцену будим на пике: пока метель разгонялась, кадры были нужны ей
        tellWarm(true)
      }
      sideRef.current = to
      setSide(to)
      if (push) window.history.pushState({ side: to }, '', SIDE_PATH[to])
      return to === 'warm' ? waitWarm() : Promise.resolve()
    },
    [waitWarm, tellWarm],
  )

  const run = useCallback(
    (to: Side, push: boolean) => {
      if (to === sideRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      if (!curtainRef.current) curtainRef.current = new StormCurtain(canvas)
      const curtain = curtainRef.current
      if (curtain.running) return

      if (to === 'warm') {
        // Ждать затишья уже поздно — поднимаем немедленно
        mountAsked.current = true
        setWarmMounted(true)
        /*
          Место запоминаем прямо сейчас, а не на подмене. Прятать
          сторону — значит обнулить прокрутку, а за секунду метели
          страницу ещё можно прокрутить колесом: вернулись бы не туда,
          откуда ушли.
        */
        coldScroll.current = window.scrollY
      }

      setBusy(true)
      curtain.start(to === 'warm' ? 'toWarm' : 'toCold', {
        onSwap: () => swap(to, push),
        onDone: () => {
          setBusy(false)
          // Ушли обратно в холод — сцену снова гасим
          if (sideRef.current === 'cold') tellWarm(false)
        },
      })
    },
    [swap, tellWarm],
  )

  const go = useCallback((to: Side) => run(to, true), [run])

  /* ---------------- кнопки браузера ---------------- */

  useEffect(() => {
    const onPop = () => {
      const target = sideFromPath(window.location.pathname)
      if (target !== sideRef.current) run(target, false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [run])

  /* ---------------- сообщения из кадра ---------------- */

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      /*
        Кадр свой, но источник проверяем всё равно: сообщение может
        прийти откуда угодно, а мы по нему меняем страницу.
      */
      if (e.origin !== window.location.origin) return
      const data = e.data as { type?: string; to?: Side; anchor?: string } | null
      if (!data) return

      if (data.type === 'uplift:scene-ready') {
        releaseWaiters()
        /*
          Первый ответ сцене. Слушатель у неё появляется вместе с этим
          сообщением, так что раньше говорить было некому — состояние
          сообщаем именно здесь.
        */
        tellWarm(sideRef.current === 'warm')
        return
      }

      if (data.type === 'uplift:navigate' && (data.to === 'cold' || data.to === 'warm')) {
        pendingAnchor.current = typeof data.anchor === 'string' ? data.anchor : null
        go(data.to)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [go, tellWarm, releaseWaiters])

  /* ---------------- прокрутка ---------------- */

  useLayoutEffect(() => {
    const root = document.documentElement
    if (side === 'warm') {
      // Родительский документ не листаем — кадр прокручивает себя сам
      document.body.style.overflow = 'hidden'
      return
    }
    document.body.style.overflow = ''
    // Возврат без плавного доезда: он бы прокрутил всю страницу на глазах
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'

    const anchor = pendingAnchor.current
    pendingAnchor.current = null
    const target = anchor ? document.getElementById(anchor) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, coldScroll.current)

    root.style.scrollBehavior = prev

    /*
      Сторона вернулась из небытия, и её размеры только что изменились
      с нулевых на настоящие. Всё, что кеширует замеры — длина трека
      видео, размер холста со снегом, высота документа для полосы
      прокрутки, — обязано пересчитаться. Никакого своего канала для
      этого заводить не нужно: они уже слушают resize, а размеры
      действительно поменялись.
    */
    window.dispatchEvent(new Event('resize'))
  }, [side])

  /* ---------------- пока идёт погода, страницу не тянем ---------------- */

  useEffect(() => {
    if (!busy) return
    const root = document.documentElement
    const prev = root.style.overscrollBehavior
    root.style.overscrollBehavior = 'none'
    return () => {
      root.style.overscrollBehavior = prev
    }
  }, [busy])

  useEffect(() => {
    const curtain = curtainRef.current
    return () => curtain?.destroy()
  }, [])

  const api = useMemo<SideApi>(() => ({ side, go, prefetch }), [side, go, prefetch])

  return (
    <SideCtx.Provider value={api}>
      <div className="side side--cold" data-hidden={side === 'warm' ? '1' : undefined}>
        {children}
      </div>

      {warmMounted && (
        <iframe
          ref={frameRef}
          className="side side--warm"
          data-active={side === 'warm' ? '1' : undefined}
          src={WARM_DOC}
          title="Uplift — тёплая сторона"
          onLoad={onFrameLoad}
          // Пока сторона не открыта, кадр не должен ловить ни курсор, ни фокус
          aria-hidden={side === 'warm' ? undefined : true}
          tabIndex={side === 'warm' ? undefined : -1}
        />
      )}

      <canvas ref={canvasRef} className="curtain" aria-hidden />
    </SideCtx.Provider>
  )
}
