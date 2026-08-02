'use client'

import { useEffect, useRef, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [wash, setWash] = useState(0)
  const trackRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore
    }
    setTheme(next)
    setWash((w) => w + 1)
  }

  const dark = theme === 'dark'

  // 白天光尘 / 黑夜星子：Web Animations API 随机轨迹
  // 动画由浏览器合成器驱动（GPU），没有逐帧 JS 开销；每条轨迹随机生成，天然不规律
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const selector = dark ? '.ts-star' : '.ts-mote'
    const particles = Array.from(track.querySelectorAll<HTMLElement>(selector))
    if (particles.length === 0) return

    const clearInline = () => {
      particles.forEach((el) => {
        el.style.opacity = ''
        el.style.transform = ''
      })
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      particles.forEach((el) => {
        el.style.opacity = dark ? '0.9' : '0.8'
        el.style.transform = 'none'
      })
      return clearInline
    }

    const amp = dark ? { x: 6, y: 7 } : { x: 5, y: 6 }
    const animations = particles.map((el) => {
      const points = 5 + Math.floor(Math.random() * 3)
      const keyframes: Keyframe[] = []
      for (let i = 0; i < points; i++) {
        keyframes.push({
          offset: i / (points - 1),
          transform: `translate(${((Math.random() * 2 - 1) * amp.x).toFixed(2)}px, ${(
            (Math.random() * 2 - 1) * amp.y
          ).toFixed(2)}px) scale(${(0.7 + Math.random() * 0.35).toFixed(3)})`,
          opacity: (0.35 + Math.random() * 0.55).toFixed(3),
        })
      }
      // 首尾一致，无缝循环
      keyframes[keyframes.length - 1] = { ...keyframes[0], offset: 1 }
      keyframes[0] = { ...keyframes[0], offset: 0 }
      const duration = 2800 + Math.random() * 3600
      return el.animate(keyframes, {
        duration,
        easing: 'ease-in-out',
        iterations: Infinity,
        delay: -Math.random() * duration,
      })
    })

    return () => {
      animations.forEach((a) => a.cancel())
      clearInline()
    }
  }, [dark])

  return (
    <button
      type="button"
      className={`theme-switch${dark ? ' on' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="切换昼夜模式"
      title={dark ? '切换到白天' : '切换到黑夜'}
    >
      <span className="ts-track" ref={trackRef} aria-hidden="true">
        <i className="ts-star" style={{ left: '17%', top: '32%' }} />
        <i className="ts-star" style={{ left: '35%', top: '62%' }} />
        <i className="ts-star" style={{ left: '49%', top: '22%' }} />
        <i className="ts-mote" style={{ left: '56%', top: '42%' }} />
        <i className="ts-mote" style={{ left: '71%', top: '58%' }} />
        <i className="ts-mote" style={{ left: '85%', top: '26%' }} />
      </span>
      <span className="ts-knob" aria-hidden="true">
        <span className="ts-sun">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.4" />
            <path d="M12 2.4v2.6M12 19v2.6M2.4 12H5M19 12h2.6M5.1 5.1l1.9 1.9M17 17l1.9 1.9M18.9 5.1L17 7M7 17l-1.9 1.9" />
          </svg>
        </span>
        <span className="ts-moon">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M20.6 13.1A8.8 8.8 0 1 1 10.9 3.4a7 7 0 0 0 9.7 9.7Z" />
          </svg>
        </span>
      </span>
      {wash > 0 ? <span key={wash} className="ts-wash" aria-hidden="true" /> : null}
    </button>
  )
}
