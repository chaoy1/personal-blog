'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { QUOTES, dailyQuote } from '@/lib/quotes'

/** 陀螺模型参数：连点越来越快，松手缓慢收势。 */
const MAX_SPEED = 1.15 // 圈/秒
const CLICK_KICK = 0.34 // 每次点击加的速度
/** 每次按下先给指针一个小位移，保证「按下即有响应」，不必等下一帧 */
const PRESS_NUDGE = 0.012
/** 每秒速度衰减到 1/10000 所需秒数，越大转得越久 */
const DECAY = 2.6
const IDLE_EPS = 0.015
const WOBBLE_SPEED = 0.62 // 超过这个速度就不再抖，免得高频点击时发抖

/**
 * 读取「减少动态效果」偏好。
 * jsdom 里可能没有 matchMedia，缺了它也不该让按钮失灵。
 */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 每日一句 + 换句钮。
 *
 * 指针不用「每次加一整圈 + CSS transition」——那样连点时新目标会中断上一次过渡，
 * 角度乱跳，而且整圈转满必然弹回起点。这里改成一个小陀螺：角度用 rAF 连续积分，
 * 点击只增加速度，速度每帧按指数衰减。于是角度单调递增、永不回跳，
 * 连点会持续加速，松手后自然收势。
 */
export default function DailyQuote() {
  const [quote, setQuote] = useState(() => dailyQuote())
  // 每次换句递增，用来重启一次「墨点一颤」，连点也不会被截断
  const [pulse, setPulse] = useState(0)
  const orbitRef = useRef<SVGGElement>(null)
  const turnsRef = useRef(0)
  const speedRef = useRef(0)
  const angleRef = useRef(0)
  const paintRef = useRef<(() => void) | null>(null)
  const [spinSpeed, setSpinSpeed] = useState(0)

  useEffect(() => {
    const el = orbitRef.current
    let raf = 0
    let last = performance.now()
    let lastReport = 0

    const paint = () => {
      if (!el) return
      el.style.transform = `rotate(${angleRef.current * 360}deg)`
      el.style.setProperty('--dq-turns', turnsRef.current.toFixed(3))
    }

    // 存到 ref 上，让点击处理函数也能立刻落笔（不必等下一帧）
    paintRef.current = paint

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (speedRef.current > 0) {
        // 与帧率无关的指数衰减
        speedRef.current *= Math.pow(0.0001, dt / DECAY)
        if (speedRef.current < IDLE_EPS) speedRef.current = 0
        const delta = speedRef.current * dt
        angleRef.current += delta
        turnsRef.current += delta
        paint()
      }
      // 速度只用来驱动描述文案，降频上报，别每帧触发重渲染
      if (now - lastReport > 120) {
        lastReport = now
        setSpinSpeed(speedRef.current)
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      paintRef.current = null
    }
  }, [])

  const shuffle = useCallback(() => {
    if (QUOTES.length <= 1) return
    setQuote((currentQuote) => {
      let next = currentQuote
      while (next === currentQuote) {
        next = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      }
      return next
    })
    setPulse((n) => n + 1)

    if (prefersReducedMotion()) {
      // 不做惯性旋转，只把指针推进一格，换句本身仍然生效
      angleRef.current += 1 / 6
      turnsRef.current += 1 / 6
    } else {
      // 先给一点位移，再加速：按下即有响应，连点逐次推进
      angleRef.current += PRESS_NUDGE
      turnsRef.current += PRESS_NUDGE
      speedRef.current = Math.min(MAX_SPEED, speedRef.current + CLICK_KICK)
      setSpinSpeed(speedRef.current)
    }
    // 立刻落笔
    paintRef.current?.()
  }, [])

  const spinning = spinSpeed > 0.02

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
        aria-label="随机换一句"
        data-spinning={spinning ? 'true' : undefined}
      >
        <svg className="dq-orbit" viewBox="0 0 54 54" aria-hidden="true">
          <g ref={orbitRef} className="dq-orbit-rotor">
            <circle
              className="dq-orbit-track"
              cx="27"
              cy="27"
              r="21"
              fill="none"
            />
            <path
              className="dq-orbit-arc"
              d="M27 6A21 21 0 1 1 8.2 37.6"
              fill="none"
              strokeLinecap="round"
            />
            <circle className="dq-orbit-dot" cx="27" cy="6" r="2.6" />
          </g>
        </svg>
        <span
          className="dq-shuffle-label"
          key={pulse}
          data-pulse={pulse > 0 ? 'true' : undefined}
          aria-hidden="true"
        >
          换
        </span>
      </button>
    </aside>
  )
}
