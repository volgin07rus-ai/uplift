import { useEffect, useRef } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

import './Particles.css'

/*
  Particles из React Bits, переписанный на TypeScript.

  От оригинала отличается тремя вещами, все помечены ниже:

  1. Появился проп fallSpeed. При нуле поведение ровно исходное —
     частицы качаются на месте. При значении больше нуля они плывут
     вниз и бесшовно заворачиваются: снег.
  2. Движение за курсором слушается на window, а не на контейнере.
     Контейнер у нас лежит под текстом с pointer-events: none, и на
     нём mousemove не сработал бы вообще.
  3. Появился проп hoverSmooth. Оригинал присваивает смещение роя
     напрямую, без задержки, и слой липнет к курсору. Отставание —
     это и есть параллакс, поэтому смещение догоняет цель по
     экспоненте. hoverSmooth = 0 возвращает исходное поведение.
*/

const defaultColors = ['#ffffff', '#ffffff', '#ffffff']

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const int = parseInt(hex.slice(0, 6), 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  return [r, g, b]
}

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  uniform float uFall;

  varying vec4 vRandom;
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 basePos = position;
    vFade = 1.0;

    // Падение. Нормализуем Y в 0..1, тянем вниз со временем и
    // заворачиваем через fract. Скорость у каждой частицы своя,
    // иначе снег идёт «пластом». По краям витка гасим прозрачность —
    // без этого частицы телепортировались бы на виду.
    if (uFall > 0.0) {
      float speed = mix(0.6, 1.5, random.x);
      float yn = fract((basePos.y * 0.5 + 0.5) - uTime * uFall * speed);
      vFade = smoothstep(0.0, 0.06, yn) * (1.0 - smoothstep(0.94, 1.0, yn));
      basePos.y = yn * 2.0 - 1.0;
    }

    vec3 pos = basePos * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    /*
      Мерцание одинаковое по всем трём каналам.

      Здесь стояло sin(uv.yxx + …) — сдвиг фазы у красного, зелёного и
      синего был разный, и каждое хлопьё уезжало в свой оттенок: бурый,
      зеленоватый, лиловый. На белом фоне это читалось не снегом, а
      пылью. Одна общая величина оставляет хлопья нейтральными и
      меняет только яркость — как настоящий снег, который то ловит
      свет, то нет.
    */
    float shimmer = 0.1 * sin(uTime * 0.6 + vRandom.y * 6.28);
    vec3 tint = vColor + shimmer;

    /*
      Цвет отдаём уже умноженным на прозрачность.

      Холст создан с premultipliedAlpha (умолчание ogl), то есть браузер
      считает, что умножение уже сделано. Раньше шейдер отдавал цвет как
      есть, и мягкий край хлопья складывался неверно: у крупных, близких
      к камере частиц середина выходила серой вместо белой. Мелкие точки
      этим не страдали — у них край занимает почти всю площадь, и разница
      терялась. Отсюда и было ощущение, что снег грязный.
    */
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(tint * vFade, vFade);
    } else {
      float a = smoothstep(0.5, 0.38, d) * 0.95 * vFade;
      gl_FragColor = vec4(tint * a, a);
    }
  }
`

export interface ParticlesProps {
  particleCount?: number
  particleSpread?: number
  speed?: number
  particleColors?: string[]
  moveParticlesOnHover?: boolean
  particleHoverFactor?: number
  alphaParticles?: boolean
  particleBaseSize?: number
  sizeRandomness?: number
  cameraDistance?: number
  disableRotation?: boolean
  pixelRatio?: number
  /** Скорость падения. 0 — исходное поведение, частицы висят на месте. */
  fallSpeed?: number
  /**
   * Насколько рой догоняет курсор, 1/с. В оригинале смещение
   * присваивается напрямую, и слой липнет к мыши без задержки —
   * это читается как рывок, а не как параллакс. 0 отключает
   * сглаживание и возвращает исходное поведение.
   */
  hoverSmooth?: number
  /**
   * Рисовать ли. При false цикл продолжает крутиться, но кадр
   * не отправляется на видеокарту — а это вся стоимость эффекта.
   * Нужно, чтобы снег не жёг GPU, когда первый экран уехал.
   */
  enabled?: boolean
  className?: string
}

export default function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  fallSpeed = 0,
  hoverSmooth = 3.5,
  enabled = true,
  className = '',
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  /*
    Пока слой выключен, изменения размера окна проходят мимо: нулевые
    значения записывать нельзя, а других в это время и нет. Включаясь,
    просим пересчитать — иначе холст останется с размером, который был
    верен когда-то давно.
  */
  useEffect(() => {
    if (enabled) window.dispatchEvent(new Event('resize'))
  }, [enabled])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({
      dpr: pixelRatio,
      depth: false,
      alpha: true,
    })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 0)

    const camera = new Camera(gl, { fov: 15 })
    camera.position.set(0, 0, cameraDistance)

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      /*
        Нулевой размер не записываем. Пока эта сторона сайта спрятана,
        контейнер не занимает места, и setSize(0, 0) обнулил бы холст
        насовсем: вернувшись, снег больше не появится.
      */
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    window.addEventListener('resize', resize, false)
    resize()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouseRef.current = { x, y }
    }

    // Слушаем на window: контейнер лежит под текстом с pointer-events: none
    if (moveParticlesOnHover) {
      window.addEventListener('mousemove', handleMouseMove)
    }

    const count = particleCount
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 4)
    const colors = new Float32Array(count * 3)
    const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number
      do {
        x = Math.random() * 2 - 1
        y = Math.random() * 2 - 1
        z = Math.random() * 2 - 1
        len = x * x + y * y + z * z
      } while (len > 1 || len === 0)
      const r = Math.cbrt(Math.random())
      positions.set([x * r, y * r, z * r], i * 3)
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)])
      colors.set(col, i * 3)
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    })

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
        uFall: { value: fallSpeed },
      },
      transparent: true,
      depthTest: false,
    })

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program })

    let animationFrameId: number
    let lastTime = performance.now()
    let elapsed = 0
    // Сглаженное смещение роя за курсором
    let hoverX = 0
    let hoverY = 0

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update)
      const delta = t - lastTime
      lastTime = t

      // Экран не виден или вкладка в фоне — время не идёт и кадр не рисуется
      if (!enabledRef.current || document.hidden) return
      elapsed += delta * speed

      program.uniforms.uTime.value = elapsed * 0.001

      if (moveParticlesOnHover) {
        const targetX = -mouseRef.current.x * particleHoverFactor
        const targetY = -mouseRef.current.y * particleHoverFactor
        if (hoverSmooth > 0) {
          // Экспоненциальное догоняние, не зависящее от частоты кадров:
          // рой отстаёт от курсора, и именно отставание читается
          // как параллакс. Дальние частицы смещаются на экране меньше
          // ближних — это уже даёт перспектива.
          const k = 1 - Math.exp((-delta / 1000) * hoverSmooth)
          hoverX += (targetX - hoverX) * k
          hoverY += (targetY - hoverY) * k
        } else {
          hoverX = targetX
          hoverY = targetY
        }
        particles.position.x = hoverX
        particles.position.y = hoverY
      } else {
        particles.position.x = 0
        particles.position.y = 0
      }

      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15
        particles.rotation.z += 0.01 * speed
      }

      renderer.render({ scene: particles, camera })
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      if (moveParticlesOnHover) {
        window.removeEventListener('mousemove', handleMouseMove)
      }
      cancelAnimationFrame(animationFrameId)
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas)
      }
    }
  }, [
    particleCount,
    particleSpread,
    speed,
    particleColors,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
    fallSpeed,
    hoverSmooth,
  ])

  return <div ref={containerRef} className={`particles-container ${className}`} />
}
