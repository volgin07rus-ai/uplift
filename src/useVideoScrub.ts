import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import MP4Box from 'mp4box'
import type {
  MP4ArrayBuffer,
  MP4File,
  MP4Info,
  MP4Sample,
  MP4SampleEntry,
  MP4VideoTrack,
} from 'mp4box'
import { VIDEO_END, VIDEO_START } from '@/config'

/**
 * Насколько быстро текущее время догоняет целевое.
 * Меньше = мягче и с большим «выбегом». 8 читалось как рывки на тачпаде,
 * 5.5 даёт заметно спокойнее ход.
 */
const LERP_TAU = 5.5
/** Ближе этого — прилипаем к цели, чтобы не дрожать на месте. */
const SNAP = 0.0015
/** Сколько распакованных кадров держим в памяти как ImageBitmap. */
const LRU_MAX = 24
/** Насколько декодер может убежать вперёд кодировщика webp. */
const LEAD = 24
/** Если банк кадров не собрался за это время — откатываемся на перемотку видео. */
const WATCHDOG = 60000
/** Как часто отдавать наружу подросший банк кадров. */
const PUBLISH_EVERY = 12
/** Какой доли кадров хватает, чтобы отпустить заставку. */
const READY_SHARE = 0.3

interface Frame {
  /** микросекунды */
  ts: number
  blob: Blob
}

export interface VideoScrubResult {
  containerRef: RefObject<HTMLDivElement>
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  canvasLive: boolean
  /** Что происходит сейчас и насколько сделано: для загрузочного экрана. */
  loading: LoadState
}

/*
  Настройка «уменьшить движение» здесь не соблюдается — решение
  владельца сайта, см. src/motion/useReducedMotion.ts. Оставлено
  функцией, а не выброшено: вернуть уважение к настройке — это
  вернуть сюда прежнюю проверку и поставить там true.
*/
function prefersReducedMotion() {
  return false
}

/** Достаёт avcC / hvcC / vpcC / av1C и отдаёт его как описание для VideoDecoder. */
function getCodecDescription(file: MP4File, trackId: number): Uint8Array | undefined {
  const trak = file.getTrackById(trackId)
  const entries: MP4SampleEntry[] = trak?.mdia?.minf?.stbl?.stsd?.entries ?? []

  for (const entry of entries) {
    const box = entry.avcC ?? entry.hvcC ?? entry.vpcC ?? entry.av1C
    if (!box) continue
    const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN)
    box.write(stream)
    // первые 8 байт — заголовок бокса (size + type), декодеру он не нужен
    return new Uint8Array(stream.buffer.slice(8))
  }
  return undefined
}

/**
 * @param onProgress вызывается каждый кадр с прогрессом 0..1.
 *
 * Прогресс намеренно НЕ хранится в state: раньше setState на каждом кадре
 * перерисовывал всё дерево 60 раз в секунду, и именно это ощущалось как
 * рывки. Теперь потребитель пишет стили напрямую в DOM, а React во время
 * прокрутки не работает вообще.
 */
export interface LoadState {
  phase: 'download' | 'decode' | 'ready'
  /** 0..1 внутри текущего этапа. */
  progress: number
  /**
   * Кадров уже хватает, чтобы прокрутка шла по картинкам, а не по
   * перемотке файла. Заставку можно снимать здесь — остальные кадры
   * доедут, пока человек читает первый экран.
   */
  usable: boolean
}

export function useVideoScrub(
  videoSrc: string,
  onProgress: (p: number) => void,
  /**
   * Видна ли сторона. Пока человек на тёплой половине сайта, холодная
   * спрятана, но цикл-то крутится: каждый кадр он копировал картинку
   * 1920×1080 на холст, которого никто не видит. Это заметная работа
   * впустую — и именно она душила соседнюю страницу.
   */
  active = true,
): VideoScrubResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [canvasLive, setCanvasLive] = useState(false)
  const [loading, setLoading] = useState<LoadState>({ phase: 'download', progress: 0, usable: false })

  const bank = useRef<Frame[]>([])
  const lru = useRef<Map<number, ImageBitmap | null>>(new Map())

  const currentTime = useRef(VIDEO_START)
  const targetTime = useRef(VIDEO_START)
  const duration = useRef(0)
  const span = useRef(1)

  const ready = useRef(false)
  const reverted = useRef(false)
  const painted = useRef(false)
  const seeking = useRef(false)

  // Колбэк держим в ref, чтобы цикл не пересоздавался при каждом рендере
  const progressRef = useRef(onProgress)
  useEffect(() => {
    progressRef.current = onProgress
  }, [onProgress])

  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  const getProgress = useCallback(() => {
    const total = span.current
    if (total <= 0) return 0
    return Math.min(1, Math.max(0, window.scrollY / total))
  }, [])

  const measureSpan = useCallback(() => {
    const el = containerRef.current
    /*
      Нулевую высоту пропускаем, а не записываем. Пока эта сторона
      сайта спрятана, блок с горами не занимает места, и замер в такой
      момент означает не «листать нечего», а «сейчас нечего мерить».
      Записав его, мы бы получили span = 1: прогресс мгновенно
      упирается в единицу, и прокрутка перестаёт двигать кадр —
      причём навсегда, до перезагрузки.
    */
    if (!el || !el.offsetHeight) return
    span.current = Math.max(1, el.offsetHeight - window.innerHeight)
  }, [])

  useEffect(() => {
    measureSpan()
    window.addEventListener('resize', measureSpan)
    window.addEventListener('orientationchange', measureSpan)
    return () => {
      window.removeEventListener('resize', measureSpan)
      window.removeEventListener('orientationchange', measureSpan)
    }
  }, [measureSpan])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) duration.current = v.duration
    }
    const onSeeking = () => {
      seeking.current = true
    }
    const onSeeked = () => {
      seeking.current = false
    }

    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('seeking', onSeeking)
    v.addEventListener('seeked', onSeeked)
    onMeta()

    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('seeking', onSeeking)
      v.removeEventListener('seeked', onSeeked)
    }
  }, [])

  /** Двоичный поиск ближайшего кадра по времени в секундах. */
  const nearestIndex = useCallback((t: number) => {
    const frames = bank.current
    if (frames.length === 0) return -1

    const target = t * 1e6
    let lo = 0
    let hi = frames.length - 1

    if (target <= frames[0].ts) return 0
    if (target >= frames[hi].ts) return hi

    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (frames[mid].ts === target) return mid
      if (frames[mid].ts < target) lo = mid + 1
      else hi = mid - 1
    }
    const after = frames[lo]
    const before = frames[hi]
    if (!after) return hi
    if (!before) return lo
    return target - before.ts <= after.ts - target ? hi : lo
  }, [])

  const lastDrawT = useRef(VIDEO_START)
  const drawRef = useRef<(t: number) => void>(() => {})

  /** Готовит картинки вокруг текущего кадра, чтобы соседние были под рукой. */
  const warmLRU = useCallback((i: number) => {
    const frames = bank.current
    const cache = lru.current

    for (let j = i - 1; j <= i + 2; j++) {
      if (j < 0 || j >= frames.length) continue
      if (cache.has(j)) continue

      cache.set(j, null) // застолбили, чтобы не декодировать дважды
      void createImageBitmap(frames[j].blob)
        .then((bitmap) => {
          if (!cache.has(j)) {
            bitmap.close()
            return
          }
          cache.set(j, bitmap)
          // Первый кадр рисуем сразу, как только картинка готова, а не ждём
          // следующего тика rAF: иначе холст «оживает» с заметной задержкой.
          if (!painted.current) drawRef.current(lastDrawT.current)
        })
        .catch(() => {
          cache.delete(j)
        })
    }

    while (cache.size > LRU_MAX) {
      const oldest = cache.keys().next()
      if (oldest.done) break
      const key = oldest.value
      if (key === i) break
      cache.get(key)?.close()
      cache.delete(key)
    }
  }, [])

  const drawFrame = useCallback(
    (t: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      lastDrawT.current = t
      const i = nearestIndex(t)
      if (i < 0) return

      warmLRU(i)

      const bitmap = lru.current.get(i)
      if (!bitmap) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Вписываем кадр в холст «по обрезке», чтобы совпадать с object-cover
      const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
      const w = bitmap.width * scale
      const h = bitmap.height * scale
      ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)

      if (!painted.current) {
        painted.current = true
        setCanvasLive(true)
      }
    },
    [nearestIndex, warmLRU],
  )

  useEffect(() => {
    drawRef.current = drawFrame
  }, [drawFrame])

  // --- Главный цикл ---
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const reduced = prefersReducedMotion()

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)

      const dt = Math.min(0.1, (now - last) / 1000)
      // Время двигаем всегда: иначе на возврате dt подскочит на секунды
      last = now

      // Рисовать некуда — сторона спрятана
      if (!activeRef.current) return

      const p = getProgress()
      progressRef.current(p)

      if (duration.current > 0) {
        // Прогресс раскладываем на обрезанный отрезок, а не на весь клип
        const end = Math.min(VIDEO_END, duration.current)
        targetTime.current = VIDEO_START + p * (end - VIDEO_START)

        if (reduced) {
          currentTime.current = targetTime.current
        } else {
          const diff = targetTime.current - currentTime.current
          currentTime.current += diff * (1 - Math.exp(-dt * LERP_TAU))
          if (Math.abs(diff) < SNAP) currentTime.current = targetTime.current
        }

        if (ready.current && !reverted.current) {
          drawFrame(currentTime.current)
        } else {
          const v = videoRef.current
          if (v && !seeking.current && Math.abs(v.currentTime - currentTime.current) > 0.01) {
            v.currentTime = currentTime.current
          }
        }
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [drawFrame, getProgress])

  // --- Сборка банка кадров ---
  useEffect(() => {
    if (prefersReducedMotion()) return
    if (typeof window === 'undefined' || !('VideoDecoder' in window)) return

    let cancelled = false
    let watchdog = 0

    /*
      Флаг «сборка уже идёт» должен жить внутри этого захода эффекта,
      а не в ref. В ref он переживает перемонтирование: в режиме
      разработки React прогоняет эффект дважды, первый заход помечает
      флаг и тут же отменяется, а второй — живой — видит поднятый флаг
      и выходит сразу. В итоге банк кадров не собирается ни разу.
    */
    let building = false
    let blobUrl: string | null = null
    /*
      Брошенный заход обязан оборвать загрузку. Без этого в режиме
      разработки двенадцать мегабайт качаются дважды: первый эффект
      отменяется, но его fetch продолжает тянуть файл до конца.
    */
    const abort = new AbortController()
    let expectedFrames = 0

    const revert = () => {
      // Что бы ни случилось, держать человека на заставке нельзя
      setLoading({ phase: 'ready', progress: 1, usable: true })
      reverted.current = true
      ready.current = false
      painted.current = false
      setCanvasLive(false)
    }

    const build = async () => {
      if (building) return
      building = true

      watchdog = window.setTimeout(() => {
        if (!ready.current) revert()
      }, WATCHDOG)

      try {
        // CORS обязателен: без заголовков CloudFront fetch упадёт и мы тихо
        // останемся на перемотке самого <video>, которому CORS не нужен.
        const res = await fetch(videoSrc, { signal: abort.signal })
        if (!res.ok) throw new Error(`fetch ${res.status}`)

        /*
          Читаем потоком, а не одним arrayBuffer(). Две причины.

          Первая: загрузочному экрану нужен честный прогресс, а не
          крутилка вникуда — файл весит около двенадцати мегабайт.

          Вторая важнее. Раньше эти байты качались дважды: один раз
          здесь для разбора, второй раз самим <video> по тому же адресу.
          Теперь готовый блоб отдаётся плееру объектной ссылкой, и
          сеть работает ровно один раз.
        */
        const total = Number(res.headers.get('content-length')) || 0
        const chunks: Uint8Array[] = []
        let received = 0

        const reader = res.body?.getReader()
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read()
            if (done || cancelled) break
            chunks.push(value)
            received += value.length
            if (total > 0) setLoading({ phase: 'download', progress: received / total, usable: false })
          }
        } else {
          chunks.push(new Uint8Array(await res.arrayBuffer()))
        }
        if (cancelled) return

        const bytes = new Uint8Array(received || chunks.reduce((a, c) => a + c.length, 0))
        let at = 0
        for (const c of chunks) {
          bytes.set(c, at)
          at += c.length
        }

        // Плеер берёт те же байты из памяти — второй загрузки не будет
        blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }))
        if (videoRef.current) videoRef.current.src = blobUrl

        setLoading({ phase: 'decode', progress: 0, usable: false })
        const raw = bytes.buffer as MP4ArrayBuffer
        if (cancelled) return

        const file = MP4Box.createFile()
        const samples: MP4Sample[] = []

        const info = await new Promise<MP4Info>((resolve, reject) => {
          file.onReady = resolve
          file.onError = (e) => reject(new Error(e))
          raw.fileStart = 0
          file.appendBuffer(raw)
          file.flush()
        })

        const track: MP4VideoTrack | undefined = info.videoTracks[0]
        if (!track) throw new Error('нет видеодорожки')

        // Оценка кадров в обрезке — только ради шкалы загрузки
        const trackSeconds = track.duration / track.timescale
        expectedFrames =
          trackSeconds > 0
            ? Math.max(1, Math.round((track.nb_samples * (VIDEO_END - VIDEO_START)) / trackSeconds))
            : track.nb_samples

        await new Promise<void>((resolve) => {
          file.onSamples = (_id, _user, chunk) => {
            samples.push(...chunk)
            if (samples.length >= track.nb_samples) resolve()
          }
          file.setExtractionOptions(track.id, null, { nbSamples: track.nb_samples })
          file.start()
          if (samples.length >= track.nb_samples) resolve()
        })

        if (cancelled) return

        const description = getCodecDescription(file, track.id)
        const frames: Frame[] = []

        const off =
          typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(track.video.width, track.video.height)
            : null
        const fallbackCanvas = off ? null : document.createElement('canvas')
        if (fallbackCanvas) {
          fallbackCanvas.width = track.video.width
          fallbackCanvas.height = track.video.height
        }

        let pending = 0

        /*
          Прогресс декодирования. Точного числа кадров в обрезке заранее
          нет — берём оценку по дорожке и зажимаем сверху, чтобы полоса
          не уползала за сто процентов.
        */
        let encoded = 0
        const reportDecode = () => {
          encoded++
          if (expectedFrames > 0) {
            setLoading({ phase: 'decode', progress: Math.min(1, encoded / expectedFrames), usable: ready.current })
          }

          /*
            Публикуем банк порциями, не дожидаясь конца.

            Раньше кадры отдавались одним куском в самом финале, и всё
            это время перемотка шла по самому файлу — то есть рывками.
            Теперь, как только набралась первая четверть, прокрутка уже
            идёт по картинкам, а остальные доезжают следом.

            Сортировка обязательна: декодер отдаёт кадры в порядке
            декодирования, а не показа, и двоичный поиск по несортированному
            массиву вернёт мусор.
          */
          if (encoded % PUBLISH_EVERY === 0 || encoded === expectedFrames) {
            const sorted = frames.slice().sort((a, b) => a.ts - b.ts)
            bank.current = sorted
            if (!ready.current && sorted.length >= Math.max(8, expectedFrames * READY_SHARE)) {
              ready.current = true
              reverted.current = false
            }
          }
        }

        // Кодируем только то, что попадает в обрезку. Хвост с кораблём
        // декодировать приходится (нужны опорные кадры), но гнать его
        // в webp — впустую тратить время и память.
        const startUs = VIDEO_START * 1e6
        const endUs = VIDEO_END * 1e6

        const encode = async (frame: VideoFrame) => {
          try {
            if (frame.timestamp < startUs || frame.timestamp > endUs) return
            if (off) {
              const ctx = off.getContext('2d')
              if (!ctx) return
              ctx.drawImage(frame, 0, 0, off.width, off.height)
              const blob = await off.convertToBlob({ type: 'image/webp', quality: 0.82 })
              frames.push({ ts: frame.timestamp, blob })
              reportDecode()
            } else if (fallbackCanvas) {
              const ctx = fallbackCanvas.getContext('2d')
              if (!ctx) return
              ctx.drawImage(frame, 0, 0, fallbackCanvas.width, fallbackCanvas.height)
              const blob = await new Promise<Blob | null>((r) =>
                fallbackCanvas.toBlob(r, 'image/webp', 0.82),
              )
              if (blob) {
                frames.push({ ts: frame.timestamp, blob })
                reportDecode()
              }
            }
          } finally {
            frame.close()
            pending--
          }
        }

        const decodeAll = async (
          hardware: 'no-preference' | 'prefer-hardware' | 'prefer-software',
        ) => {
          frames.length = 0
          pending = 0

          const decoder = new VideoDecoder({
            output: (frame) => {
              pending++
              void encode(frame)
            },
            error: () => {},
          })

          decoder.configure({
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description,
            hardwareAcceleration: hardware,
          })

          for (const sample of samples) {
            if (cancelled) break

            // Не даём декодеру убежать от кодировщика webp — иначе память
            // забивается сырыми VideoFrame и вкладка падает.
            while (pending >= LEAD && !cancelled) {
              await new Promise((r) => setTimeout(r, 8))
            }

            decoder.decode(
              new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: (sample.cts * 1e6) / sample.timescale,
                duration: (sample.duration * 1e6) / sample.timescale,
                data: sample.data,
              }),
            )
          }

          await decoder.flush()
          while (pending > 0 && !cancelled) {
            await new Promise((r) => setTimeout(r, 8))
          }
          decoder.close()
        }

        try {
          await decodeAll('no-preference')
        } catch {
          if (cancelled) return
          // Аппаратный декодер иногда отваливается на нестандартных профилях
          await decodeAll('prefer-software')
        }

        if (cancelled || frames.length === 0) return

        frames.sort((a, b) => a.ts - b.ts)
        bank.current = frames
        ready.current = true
        setLoading({ phase: 'ready', progress: 1, usable: true })
        reverted.current = false
      } catch {
        revert()
      } finally {
        window.clearTimeout(watchdog)
        building = false
      }
    }

    const onLoad = () => void build()

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })

    return () => {
      cancelled = true
      abort.abort()
      window.clearTimeout(watchdog)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      window.removeEventListener('load', onLoad)
      for (const bitmap of lru.current.values()) bitmap?.close()
      lru.current.clear()
    }
  }, [videoSrc])

  return { containerRef, videoRef, canvasRef, canvasLive, loading }
}
