'use client'

import { useEffect, useRef } from 'react'

/**
 * 水墨交互画布：
 * 点击页面时墨迹如滴墨入水般晕染绽开
 * 仅在指针为鼠标/触控笔时启用；尊重 prefers-reduced-motion；随昼夜主题换色。
 */

type Bloom = {
  x: number
  y: number
  t0: number
  // 预生成的边缘扰动，让墨晕边缘不规则，像宣纸上的洇痕
  wobble: number[]
  satellites: { dx: number; dy: number; r: number }[]
}

const BLOOM_LIFE = 1100 // 墨晕存活毫秒
const BLOOM_VERTICES = 14

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export default function InkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = false
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const blooms: Bloom[] = []

    // ---- 主题墨色 ----
    let ink: [number, number, number] = [44, 42, 36]
    const readInk = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--ink')
      const rgb = hexToRgb(v)
      if (rgb) ink = rgb
    }
    readInk()
    const themeObserver = new MutationObserver(readInk)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // ---- 画布尺寸 ----
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener('resize', resize)

    // ---- 点击墨晕 ----
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (e.button !== 0) return
      const wobble: number[] = []
      for (let i = 0; i < BLOOM_VERTICES; i++) {
        wobble.push(0.72 + Math.random() * 0.5)
      }
      const satellites = Array.from({ length: 3 }, () => {
        const a = Math.random() * Math.PI * 2
        const d = 46 + Math.random() * 60
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          r: 2 + Math.random() * 5,
        }
      })
      blooms.push({ x: e.clientX, y: e.clientY, t0: performance.now(), wobble, satellites })
      start()
    }

    const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)

    // ---- 渲染循环（按需启动，空闲即停） ----
    const frame = () => {
      const now = performance.now()

      // 清理过期
      for (let i = blooms.length - 1; i >= 0; i--) {
        if (now - blooms[i].t0 > BLOOM_LIFE) blooms.splice(i, 1)
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      // 墨晕：多层不规则多边形叠加，模拟墨在宣纸上的洇开
      for (const b of blooms) {
        const p = Math.min(1, (now - b.t0) / BLOOM_LIFE)
        const eased = easeOutCubic(p)
        const fade = 1 - p
        const baseR = 14 + eased * 92

        for (let layer = 0; layer < 3; layer++) {
          const layerR = baseR * (1 - layer * 0.24)
          const alpha = 0.1 * fade * (1 - layer * 0.25)
          if (alpha <= 0.004) continue
          ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha.toFixed(3)})`
          ctx.beginPath()
          for (let v = 0; v <= BLOOM_VERTICES; v++) {
            const idx = v % BLOOM_VERTICES
            const ang = (idx / BLOOM_VERTICES) * Math.PI * 2
            const r = layerR * b.wobble[idx]
            const px = b.x + Math.cos(ang) * r
            const py = b.y + Math.sin(ang) * r
            if (v === 0) ctx.moveTo(px, py)
            else {
              const prevAng = ((idx - 1) / BLOOM_VERTICES) * Math.PI * 2
              const prevR = layerR * b.wobble[(idx - 1 + BLOOM_VERTICES) % BLOOM_VERTICES]
              const cpx = b.x + Math.cos((ang + prevAng) / 2) * ((r + prevR) / 2) * 1.08
              const cpy = b.y + Math.sin((ang + prevAng) / 2) * ((r + prevR) / 2) * 1.08
              ctx.quadraticCurveTo(cpx, cpy, px, py)
            }
          }
          ctx.closePath()
          ctx.fill()
        }

        // 墨心
        const coreA = 0.22 * fade
        if (coreA > 0.004) {
          ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${coreA.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(b.x, b.y, Math.max(0.5, baseR * 0.16), 0, Math.PI * 2)
          ctx.fill()
        }

        // 溅落的飞墨小点
        for (const s of b.satellites) {
          const sa = 0.18 * fade
          if (sa <= 0.004) continue
          ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${sa.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(b.x + s.dx * eased, b.y + s.dy * eased, Math.max(0.4, s.r * fade), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()

      if (blooms.length > 0) {
        raf = requestAnimationFrame(frame)
      } else {
        running = false
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    const start = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    window.addEventListener('pointerdown', onDown, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', resize)
      themeObserver.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="ink-canvas" aria-hidden="true" />
}
