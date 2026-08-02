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

  // 白天光尘 / 黑夜星子：JS 随机漫步驱动，替代固定关键帧动画，避免卡顿与规律循环
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const selector = dark ? '.ts-star' : '.ts-mote'
    const particles = Array.from(track.querySelectorAll<HTMLElement>(selector))
    if (particles.length === 0) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      particles.forEach((el) => {
        el.style.opacity = dark ? '0.9' : '0.8'
        el.style.transform = 'none'
      })
      return
    }

    const amp = dark ? { x: 6, y: 7 } : { x: 5, y: 6 }
    const states = particles.map((el) => {
      const left = parseFloat(el.style.left) || 0
      const top = parseFloat(el.style.top) || 0
      return {
        el,
        x: left,
        y: top,
        ox: 0,
        oy: 0,
        tX: (Math.random() * 2 - 1) * amp.x,
        tY: (Math.random() * 2 - 1) * amp.y,
        phase: Math.random() * Math.PI * 2,
        twPhase: Math.random() * Math.PI * 2,
        nextSwitch: performance.now() + 1200 + Math.random() * 2600,
      }
    })

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      for (const s of states) {
        // 随机换向：每颗星独立、不定期地挑选新目标点
        if (now >= s.nextSwitch) {
          s.tX = (Math.random() * 2 - 1) * amp.x
          s.tY = (Math.random() * 2 - 1) * amp.y
          s.nextSwitch = now + 1200 + Math.random() * 2600
        }
        // 朝目标缓动（帧率无关）
        const k = 1 - Math.exp(-dt * 1.5)
        s.ox += (s.tX - s.ox) * k
        s.oy += (s.tY - s.oy) * k
        // 轻微抖动，让轨迹不单调
        s.phase += dt * (1.4 + Math.random() * 0.6)
        s.twPhase += dt * (2.0 + Math.random() * 0.8)
        const jx = Math.sin(s.phase) * 0.9
        const jy = Math.cos(s.phase * 1.3) * 0.9
        const scale = 0.72 + Math.abs(Math.sin(s.twPhase)) * 0.28
        const opacity = 0.35 + (Math.sin(s.twPhase) * 0.5 + 0.5) * 0.6
        s.el.style.transform = `translate(${(s.ox + jx).toFixed(2)}px, ${(s.oy + jy).toFixed(2)}px) scale(${scale.toFixed(3)})`
        s.el.style.opacity = opacity.toFixed(3)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
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
