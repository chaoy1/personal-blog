'use client'

import { useEffect, useRef } from 'react'

/**
 * 黑夜 · 晚星
 * 层层星子明灭、几颗亮星带光晕、右上角暖月、偶有流星划过、薄雾轻绕。
 * 无孔明灯。遵守 reduced-motion。
 */
export default function StarryNight() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0

    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const starCount = Math.max(90, Math.min(170, Math.round((W * H) / 11000)))
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random() * 0.72,
      r: rnd(0.4, 1.4),
      ph: rnd(0, 7),
      sp: rnd(0.35, 1.7),
      base: rnd(0.3, 0.75),
    }))
    const brights = Array.from({ length: 7 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.5,
      r: rnd(1.8, 2.6),
      ph: rnd(0, 7),
      sp: rnd(0.5, 1.1),
    }))
    const wisps = Array.from({ length: 3 }, () => ({
      x: Math.random(),
      y: rnd(0.32, 0.6),
      r: rnd(0.2, 0.3),
      sp: rnd(2, 5),
      a: rnd(0.05, 0.11),
    }))
    let meteor: { x: number; y: number; vx: number; vy: number; t0: number } | null = null
    let nextMeteor = 6000

    const frame = (now: number) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)

      // 星子
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph)
        ctx.fillStyle = `rgba(244,238,222,${(s.base * tw).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 亮星 + 十字光晕
      for (const b of brights) {
        const bx = b.x * W
        const by = b.y * H
        const a = 0.55 + 0.45 * Math.sin(t * b.sp + b.ph)
        const glow = ctx.createRadialGradient(bx, by, 0, bx, by, b.r * 9)
        glow.addColorStop(0, `rgba(244,238,222,${(0.35 * a).toFixed(3)})`)
        glow.addColorStop(1, 'rgba(244,238,222,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(bx, by, b.r * 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `rgba(244,238,222,${(0.75 * a).toFixed(3)})`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(bx - b.r * 2.4, by)
        ctx.lineTo(bx + b.r * 2.4, by)
        ctx.moveTo(bx, by - b.r * 2.4)
        ctx.lineTo(bx, by + b.r * 2.4)
        ctx.stroke()
        ctx.fillStyle = `rgba(255,250,235,${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(bx, by, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 暖月（右上）
      const mx = W * 0.74
      const my = H * 0.15
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, H * 0.26)
      halo.addColorStop(0, 'rgba(239,224,184,0.2)')
      halo.addColorStop(1, 'rgba(239,224,184,0)')
      ctx.fillStyle = halo
      ctx.fillRect(mx - H * 0.26, my - H * 0.26, H * 0.52, H * 0.52)
      ctx.fillStyle = '#efe0b8'
      ctx.beginPath()
      ctx.arc(mx, my, H * 0.04, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(180,164,126,0.28)'
      ctx.beginPath()
      ctx.arc(mx - H * 0.01, my - H * 0.007, H * 0.009, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(mx + H * 0.012, my + H * 0.009, H * 0.0065, 0, Math.PI * 2)
      ctx.fill()

      // 流星
      if (!reduced) {
        if (!meteor && now > nextMeteor) {
          meteor = { x: rnd(0.15, 0.82) * W, y: rnd(0.04, 0.22) * H, vx: rnd(240, 380), vy: rnd(90, 140), t0: now }
        }
        if (meteor) {
          const mp = (now - meteor.t0) / 850
          if (mp >= 1) {
            meteor = null
            nextMeteor = now + rnd(7000, 15000)
          } else {
            const mxx = meteor.x + meteor.vx * mp
            const myy = meteor.y + meteor.vy * mp
            const mg = ctx.createLinearGradient(mxx, myy, mxx - meteor.vx * 0.14, myy - meteor.vy * 0.14)
            mg.addColorStop(0, `rgba(246,240,222,${(0.9 * (1 - mp)).toFixed(3)})`)
            mg.addColorStop(1, 'rgba(246,240,222,0)')
            ctx.strokeStyle = mg
            ctx.lineWidth = 1.7
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(mxx, myy)
            ctx.lineTo(mxx - meteor.vx * 0.14, myy - meteor.vy * 0.14)
            ctx.stroke()
          }
        }
      }

      // 薄雾
      for (const w of wisps) {
        const wx = (((w.x * W + t * w.sp * 10) % (W + 600)) + W + 600) % (W + 600) - 300
        const g = ctx.createRadialGradient(wx, w.y * H, 0, wx, w.y * H, w.r * W)
        g.addColorStop(0, `rgba(208,194,152,${w.a})`)
        g.addColorStop(1, 'rgba(208,194,152,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(wx, w.y * H, w.r * W, w.r * W * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
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
