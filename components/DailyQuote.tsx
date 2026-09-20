'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QUOTES, dailyQuote } from '@/lib/quotes'

/**
 * 朱砂残印的转动参数。
 * 每次点击只把目标角度加一整圈，时长按连点密度递减：
 * 单击 620ms 走满一圈，连点最快压到 230ms —— 所以点得再密也不会排队、不会滞后。
 */
const TURN_MS = 620
const TURN_MS_RAPID = 400
const TURN_MS_MIN = 230
const RAPID_GAP_MS = 320
const BURST_MAX = 8

/** 读取「减少动态效果」偏好；jsdom 里没有 matchMedia 也不该让按钮失灵。 */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3)
}

/**
 * 每日一句 + 换句钮。
 *
 * 钮上那圈是「朱砂残印」：一笔成环的墨线带轻重变化，外侧一浅朱、一淡墨，
 * 顶端一枚朱砂点标记起笔。每次点击墨环绕满一圈，走完时掠过一道余晕与纸面闪光。
 */
export default function DailyQuote() {
  const [quote, setQuote] = useState(() => dailyQuote())
  const rotorRef = useRef<SVGGElement>(null)
  const echoRef = useRef<SVGSVGElement>(null)
  const flashRef = useRef<HTMLSpanElement>(null)

  // 转动状态放在 ref 里：rAF 每帧直接改 DOM，不触发 React 重渲染
  const stateRef = useRef({
    angle: 0,
    from: 0,
    target: 0,
    /** 起点与耗时都以 rAF 给的时间戳为准（单一时钟），
        不能让 performance.now() 与帧时间戳混用 */
    startFrameTime: 0,
    duration: 0,
    turning: false,
    /** 上一帧的时间戳，用来测连点间隔 */
    lastFrameTime: 0,
    lastClick: -Infinity,
    burst: 0,
  })
  const reducedRef = useRef(false)
  const effectsRef = useRef<{ echo: Animation | null; flash: Animation | null }>({
    echo: null,
    flash: null,
  })

  useEffect(() => {
    const rotor = rotorRef.current
    let raf = 0
    reducedRef.current = prefersReducedMotion()

    const paint = () => {
      if (rotor) rotor.style.transform = `rotate(${stateRef.current.angle}deg)`
    }
    paint()

    const frame = (now: number) => {
      const s = stateRef.current
      if (s.lastFrameTime === 0) s.lastClick = now - RAPID_GAP_MS * 2
      s.lastFrameTime = now
      if (s.turning) {
        const p = s.duration === 0 ? 1 : Math.min(1, (now - s.startFrameTime) / s.duration)
        s.angle = s.from + (s.target - s.from) * easeOutCubic(p)
        paint()
        if (p >= 1) {
          s.turning = false
          s.angle = s.target
          paint()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      effectsRef.current.echo?.cancel()
      effectsRef.current.flash?.cancel()
    }
  }, [])

  /** 转动时掠过一道淡朱余晕与一次纸面闪光 */
  const playEffects = useCallback((duration: number) => {
    const echo = echoRef.current
    const flash = flashRef.current
    if (!echo || !flash) return
    effectsRef.current.echo?.cancel()
    effectsRef.current.flash?.cancel()
    effectsRef.current.echo = echo.animate(
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.89) rotate(-12deg)' },
        { opacity: 0.54, transform: 'translate(-50%, -50%) scale(1.03) rotate(160deg)', offset: 0.42 },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.13) rotate(360deg)' },
      ],
      { duration: Math.min(420, duration), easing: 'ease-out' },
    )
    effectsRef.current.flash = flash.animate(
      [{ opacity: 0 }, { opacity: 0.48, offset: 0.3 }, { opacity: 0 }],
      { duration: Math.min(300, duration), easing: 'ease-out' },
    )
  }, [])

  /** 墨线绕满一圈；顺便换一句 */
  const turn = useCallback(() => {
    const s = stateRef.current
    // 连点间隔也按同一套帧时钟判定
    const now = s.lastFrameTime
    const rapid = now - s.lastClick < RAPID_GAP_MS
    s.burst = rapid ? Math.min(s.burst + 1, BURST_MAX) : 1
    s.lastClick = now

    s.from = s.angle
    s.target += 360
    s.startFrameTime = now

    if (reducedRef.current) {
      s.angle = s.target
      s.turning = false
      if (rotorRef.current) rotorRef.current.style.transform = `rotate(${s.angle}deg)`
      return
    }

    s.duration =
      s.burst === 1 ? TURN_MS : Math.max(TURN_MS_MIN, TURN_MS_RAPID - (s.burst - 2) * 35)
    s.turning = true
    playEffects(s.duration)
  }, [playEffects])

  const shuffle = useCallback(() => {
    if (QUOTES.length > 1) {
      setQuote((currentQuote) => {
        let next = currentQuote
        while (next === currentQuote) {
          next = QUOTES[Math.floor(Math.random() * QUOTES.length)]
        }
        return next
      })
    }
    turn()
  }, [turn])

  return (
    <aside className="daily-quote" aria-label="每日一句">
      <span className="dq-seal" aria-hidden="true">
        句
      </span>
      <p className="dq-text">{quote.text}</p>
      <span className="dq-source">{quote.source}</span>
      <button
        type="button"
        className="dq-shuffle"
        onClick={shuffle}
        title="换一句"
        aria-label="换一句，墨线转满一圈"
      >
        <svg className="dq-orbit" viewBox="0 0 76 76" aria-hidden="true">
          <g ref={rotorRef} className="dq-orbit-rotor">
            {/* 一笔成环：外缘与内缘各留一点不规整，环身因此有轻重 */}
            <path
              className="dq-orbit-ink"
              fillRule="evenodd"
              d="M38 10.9 C53.1 10.9 65.1 23 65.1 38 C65.1 53.1 53.1 65.1 38 65.1 C22.9 65.1 10.9 53.1 10.9 38 C10.9 23 22.9 10.9 38 10.9 Z M38 11.9 C23.6 11.9 11.9 23.6 11.9 38 C11.9 52.4 23.6 63.3 38 63.3 C52.4 63.3 62.2 52.4 62.2 38 C62.2 23.7 52.4 11.9 38 11.9 Z"
            />
            {/* 未拓尽的边缘：一浅朱、一淡墨 */}
            <path
              className="dq-orbit-cinnabar"
              d="M43 9.2 C56.8 11.6 66.9 23.3 67.2 37.8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              className="dq-orbit-faint"
              d="M23 63 C16.5 58.8 11.1 52 9.8 44"
              fill="none"
              strokeLinecap="round"
            />
            {/* 起笔的朱砂点 */}
            <circle className="dq-orbit-dot" cx="38" cy="10.8" r="1.75" />
          </g>
        </svg>
        {/* 走完一圈时掠过的一抹余晕 */}
        <svg ref={echoRef} className="dq-turn-echo" viewBox="0 0 76 76" aria-hidden="true">
          <path
            d="M42 11 C55 13 64 22 65 35"
            fill="none"
            stroke="#a84d37"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {/* 印泥在纸面上的晕染与转动时的纸面闪光 */}
        <span className="dq-disc-art" aria-hidden="true" />
        <span ref={flashRef} className="dq-disc-flash" aria-hidden="true" />
        <span className="dq-shuffle-label" aria-hidden="true">
          换
        </span>
      </button>
    </aside>
  )
}
