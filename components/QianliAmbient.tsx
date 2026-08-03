'use client'

import { useEffect, useRef } from 'react'

/**
 * 白天 · 江山入画：云雾流动、金尘明灭、瑞鹤掠空。
 * 无鼠标视差、无点击特效。
 */
export default function QianliAmbient() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let raf = 0

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    const wisps = Array.from({ length: 3 }, () => ({
      x: Math.random(),
      y: rnd(0.3, 0.62),
      r: rnd(0.2, 0.3),
      sp: rnd(3, 7),
      a: rnd(0.14, 0.24),
    }))
    const dusts = Array.from({ length: 16 }, () => ({
      x: Math.random(),
      y: Math.random(),
      ph: rnd(0, 7),
      sp: rnd(0.3, 0.9),
      r: rnd(1, 2.2),
    }))
    const cranes = [
      { off: 0, speed: 30, y: rnd(0.16, 0.24), s: 1, ph: rnd(0, 7) },
      { off: 2600, speed: 26, y: rnd(0.2, 0.3), s: 0.8, ph: rnd(0, 7) },
    ]

    const frame = (now: number) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)

      for (const w of wisps) {
        const wx = (((w.x * W + t * w.sp * 10) % (W + 600)) + W + 600) % (W + 600) - 300
        const g = ctx.createRadialGradient(wx, w.y * H, 0, wx, w.y * H, w.r * W)
        g.addColorStop(0, `rgba(247,243,232,${w.a})`)
        g.addColorStop(1, 'rgba(247,243,232,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(wx, w.y * H, w.r * W, w.r * W * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const d of dusts) {
        const dy = d.y * H + Math.sin(t * d.sp + d.ph) * 30
        const a = 0.15 + 0.5 * Math.abs(Math.sin(t * 1.3 + d.ph))
        ctx.fillStyle = `rgba(206,164,60,${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(d.x * W, dy, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const c of cranes) {
        const x = ((t * c.speed + c.off) % (W + 500)) - 250
        const y = c.y * H + Math.sin(t * 0.8 + c.ph) * 12
        const flap = Math.sin(t * 5 + c.ph)
        ctx.strokeStyle = 'rgba(48,44,38,.5)'
        ctx.lineWidth = 2.2 * c.s
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x - 10 * c.s, y + 2 * c.s)
        ctx.quadraticCurveTo(x, y - 3 * c.s, x + 12 * c.s, y - 1 * c.s)
        const w = 20 * c.s
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x - w * 0.5, y - (10 + flap * 8) * c.s, x - w, y - (4 + flap * 10) * c.s)
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + w * 0.5, y - (10 - flap * 8) * c.s, x + w, y - (4 - flap * 10) * c.s)
        ctx.stroke()
      }

      if (!reduced) raf = requestAnimationFrame(frame)
    }
    if (!reduced) raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />
}
