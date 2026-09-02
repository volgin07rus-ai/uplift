import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useVideoScrub } from "@/useVideoScrub";
import { INK, VIDEO_SRC } from "@/config";
import { AGENCY, GUARANTEE } from "@/content";
import { useReveal } from "@/motion/useReveal";
import { useScramble } from "@/motion/useScramble";
import { useAnimate, useIsMobile } from "@/motion/useAnimate";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { Loader } from "@/components/Loader";
import { Header } from "@/components/Header";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Cases } from "@/components/Cases";
import { Process } from "@/components/Process";
import { Bridge } from "@/components/Bridge";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { RequestModal } from "@/components/RequestModal";
import { useSide } from "@/transition/side";

/*
  Снег тянет ogl и нужен не сразу. Выносим в отдельный кусок: первый
  экран не должен ждать загрузки библиотеки, чтобы показать текст.
*/
const Particles = lazy(() => import("@/components/Particles"));

/* --- Кривые появления. Второй блок подхватывает ровно там, где --- */
/* --- догорает первый, без паузы между ними.                    --- */

function s1Opacity(p: number) {
  if (p < 0.3) return 1;
  return Math.max(0, 1 - (p - 0.3) / 0.1);
}

function s2Opacity(p: number) {
  // Первый блок гаснет к 0.40, второй теперь подхватывает сразу за ним:
  // паузы с одними горами между ними больше нет
  if (p < 0.4) return 0;
  if (p < 0.5) return (p - 0.4) / 0.1;
  if (p < 0.8) return 1;
  // Уходит чуть раньше вымывания, иначе текст мутнеет под ним
  return Math.max(0, 1 - (p - 0.8) / 0.08);
}

/**
 * Выход из блока с горами.
 *
 * Липкий экран заканчивается ровной горизонтальной линией: кадр
 * обрывается, дальше сразу фон следующей секции. Поэтому к концу
 * прокрутки заливаем экран тем же цветом — когда липкость отпускает,
 * на месте стыка уже одинаковый тон, и шва не видно.
 */
function outroOpacity(p: number) {
  if (p < 0.84) return 0;
  return Math.min(1, (p - 0.84) / 0.16);
}

/*
  Снежинки. Белый в чистом виде тонет в светлых облаках, поэтому
  в палитре есть холодный серо-голубой: он читается на самых ярких
  местах кадра, а белый — на тёмных склонах.
  Массив лежит снаружи компонента: он попадает в зависимости эффекта
  внутри Particles, и новая ссылка на каждый рендер пересоздавала бы
  всю сцену.
*/
/*
  Было три оттенка со сползанием в серо-голубой. На светлом фоне такой
  снег читался пылью, а не снегом. Теперь два чистых белых и один едва
  холодный — тень остаётся только в самых мелких хлопьях.
*/
const SNOW_COLORS = ["#ffffff", "#ffffff", "#eaf2ff"];
const SNOW_DPR = Math.min(
  typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
  2,
);

export function ColdSide() {
  const s1 = useRef<HTMLElement>(null);
  const s2 = useRef<HTMLElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const h2 = useRef<HTMLHeadingElement>(null);
  const gLabel = useRef<HTMLSpanElement>(null);
  const gPromise = useRef<HTMLParagraphElement>(null);
  const snow = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const animate = useAnimate();
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();
  const [heroVisible, setHeroVisible] = useState(true);
  /*
    Пока человек на тёплой стороне, эта спрятана целиком. Всё, что
    она делает покадрово, в это время — работа впустую, и она душит
    соседнюю страницу: та ведь живёт в том же процессе.
  */
  const { side } = useSide();
  const coldActive = side === "cold";

  /**
   * Прогресс приходит каждый кадр, поэтому всё, что от него зависит,
   * пишем напрямую в DOM. Через React это была бы перерисовка дерева
   * 60 раз в секунду — именно она и ощущалась как рывки.
   */
  const onProgress = useCallback((p: number) => {
    const a = s1.current;
    const b = s2.current;
    if (!a || !b) return;

    const o1 = s1Opacity(p);
    const o2 = s2Opacity(p);

    a.style.opacity = String(o1);
    if (snow.current) snow.current.style.opacity = String(o1);
    b.style.opacity = String(o2);
    if (outro.current) outro.current.style.opacity = String(outroOpacity(p));

    // Дочерние элементы выезжают, когда блок уже проявился
    const show1 = o1 > 0.3 ? "1" : "0";
    const show2 = o2 > 0.3 ? "1" : "0";
    if (a.dataset.show !== show1) a.dataset.show = show1;
    if (b.dataset.show !== show2) b.dataset.show = show2;
  }, []);

  const { containerRef, videoRef, canvasRef, canvasLive, loading } = useVideoScrub(
    VIDEO_SRC,
    onProgress,
    coldActive,
  );

  /*
    Снег живёт только пока виден экран с горами. Дальше по странице
    он невидим, но продолжал бы жечь видеокарту: цикл-то крутится.
  */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) =>
      setHeroVisible(e.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [containerRef]);

  /*
    Возвращаясь с тёплой стороны, на наблюдателя полагаться нельзя.

    Пока эта сторона спрятана, она не занимает места, и наблюдатель
    честно сообщил «не видно» — снег выключился. Придёт ли уведомление
    обратно, когда display вернут, зависит от браузера: элемент не
    двигался и не прокручивался, изменилась только видимость предка.
    Дожидаться этого нельзя — иначе снег так и не включится.

    Поэтому при возврате считаем сами: пересечение с окном — это
    сравнение двух прямоугольников, тут нечего наблюдать. Второй заход
    в следующем кадре: размеры после возврата встают не мгновенно.
  */
  useEffect(() => {
    if (!coldActive) return;
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      setHeroVisible(r.bottom > 0 && r.top < window.innerHeight);
    };
    check();
    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [coldActive, containerRef]);

  /*
    Флаг активности читается из того же data-show, который уже выставляет
    onProgress, — отдельная связка не нужна. Пока блок виден, время идёт
    вперёд; когда ушёл — отматывается назад.
  */
  const active1 = useCallback(() => s1.current?.dataset.show === "1", []);
  const active2 = useCallback(() => s2.current?.dataset.show === "1", []);

  // Заголовок первого экрана — по словам, с наклоном.
  // Наклон выпрямляется раньше (0.7), чем слово доезжает (1.0).
  useReveal(h1, {
    split: "words",
    from: 1.7,
    rotate: 15,
    duration: 1,
    rotateDuration: 0.7,
    stagger: 1 / 20,
    active: active1,
    enabled: animate,
  });

  useScramble(sub, AGENCY.tagline, {
    active: active1,
    delay: 0.35,
    enabled: animate,
  });

  // Сумма — по знакам с наклоном. Строка короткая, шаг можно крупнее.
  useReveal(h2, {
    split: "chars",
    from: 1,
    rotate: 12,
    duration: 1,
    speed: 1.4,
    stagger: 1 / 24,
    active: active2,
    enabled: animate,
  });

  useScramble(gLabel, GUARANTEE.label, {
    active: active2,
    delay: 0.1,
    enabled: animate,
  });

  // Обещание выезжает построчно из-под маски, следом за суммой
  useReveal(gPromise, {
    split: "lines",
    from: 100,
    unit: "%",
    duration: 1,
    speed: 1.2,
    stagger: 1 / 8,
    active: active2,
    enabled: animate,
  });

  return (
    // Окно с формой — снаружи всего: его открывают и шапка,
    // и карточки кейсов, и подвал
    <RequestModal>
      <Loader state={loading} />
      <Header />
      <ScrollProgress />

      {/* ================= Горы: видео, привязанное к прокрутке ================= */}
      <div
        ref={containerRef}
        id="top"
        className="relative h-[500vh]"
        data-surface="light"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Видео никогда не проигрывается само — позицию задаёт прокрутка */}
          {/*
            src не задаём: хук скачивает файл один раз и подставляет
            сюда объектную ссылку. Раньше эти двенадцать мегабайт
            качались дважды — плеером и разборщиком.
          */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Холст с распакованными кадрами: перемотка по нему плавнее,
              чем через video.currentTime. Пока банк не собран — прозрачен. */}
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            style={{ opacity: canvasLive ? 1 : 0 }}
          />

          {/*
            Снег на первом экране. Лежит над кадром, но под текстом,
            и гаснет вместе с первым блоком — прозрачность ему пишет
            onProgress тем же значением, что и секции.
            При выключенном движении в системе не рисуем вовсе.
          */}
          {!reduced && (
            <div
              ref={snow}
              className="pointer-events-none absolute inset-0 z-10"
              style={{ opacity: 1 }}
            >
              <Suspense fallback={null}>
                <Particles
                  particleColors={SNOW_COLORS}
                  particleCount={isMobile ? 260 : 700}
                  particleSpread={14}
                  speed={0.2}
                  fallSpeed={0.2}
                  particleBaseSize={110}
                  sizeRandomness={1.1}
                  cameraDistance={18}
                  alphaParticles
                  disableRotation
                  moveParticlesOnHover
                  particleHoverFactor={0.9}
                  hoverSmooth={3}
                  pixelRatio={SNOW_DPR}
                  enabled={heroVisible && coldActive}
                />
              </Suspense>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 z-20"
            style={{ color: INK }}
          >
            {/* ---------------- Блок 1 ---------------- */}
            <section
              ref={s1}
              data-show="1"
              className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8 md:px-20 lg:px-32"
              style={{ opacity: 1 }}
            >
              {/*
                Ширина и кегль подобраны так, чтобы «Мы не считаем клики»
                вставала в одну строку: маска строки обрезает перенос, а
                переносить здесь нечего — строки заданы <br> вручную.
              */}
              <h1
                ref={h1}
                className="max-w-[1200px] font-light uppercase leading-[1.15]"
                style={{ fontSize: "clamp(2rem,4.4vw,4.5rem)" }}
              >
                Мы не считаем клики
                <br />
                Мы считаем прибыль
              </h1>

              <p
                ref={sub}
                className="mt-9 min-h-[1.2em] text-sm uppercase tracking-[0.3em]"
                style={{ color: `${INK}90` }}
              >
                {AGENCY.tagline}
              </p>
            </section>

            {/* ---------------- Блок 2 ---------------- */}
            <section
              ref={s2}
              data-show="0"
              className="absolute inset-0 flex items-center justify-center px-6 sm:px-8"
              style={{ opacity: 0 }}
            >
              {/*
                Здесь сказаны две разные вещи — порог и обещание.
                Раньше они шли тремя строками одного веса, и первая
                не влезала по ширине: маска её резала, страховка
                откатывала анимацию, и оставался рваный абзац.
                Теперь сумма крупно, обещание отдельно под чертой.
              */}
              <div className="guarantee">
                <span ref={gLabel} className="guarantee-label">
                  {GUARANTEE.label}
                </span>

                <h2 ref={h2} className="guarantee-amount">
                  {GUARANTEE.amount}
                </h2>

                <span data-stagger className="guarantee-period">
                  {GUARANTEE.period}
                </span>

                <span
                  data-stagger
                  className="guarantee-rule"
                  style={{ transitionDelay: "260ms" }}
                />

                <p ref={gPromise} className="guarantee-promise">
                  {GUARANTEE.promise[0]}
                  <br />
                  {GUARANTEE.promise[1]}
                </p>
              </div>
            </section>
          </div>

          {/*
            Вымывание на выходе. Лежит поверх всего, включая текст,
            и к концу трека закрашивает экран цветом следующей секции.
            Цвет тянем из той же переменной, что и фон страницы, —
            иначе стык вылезет от любой правки палитры.
          */}
          <div
            ref={outro}
            className="pointer-events-none absolute inset-0 z-30"
            style={{ backgroundColor: "var(--surface)", opacity: 0 }}
          />
        </div>
      </div>

      {/* ================= Блоки в обычном потоке ================= */}
      {/*
        Между секциями стоят пустые полосы-переходы. Раньше каждая
        секция просто объявляла свой фон, и на стыке белого с тёмным
        оставалась ровная горизонтальная черта. Полоса пустая, текста
        над ней нет — поэтому растянуть её можно сколько нужно.
      */}
      <Cases />
      <div className="seam seam--paper" data-surface="light" aria-hidden />
      <Process />
      <div className="seam seam--dusk" data-surface="light" aria-hidden>
        {/* Нижняя половина полосы уже тёмная — шапке нужно знать, где */}
        <span className="seam-dark" data-surface="dark" />
      </div>
      <Bridge />
      <Contact />
      <Footer />
    </RequestModal>
  );
}
