'use client'

import { useEffect, useRef } from 'react'

/**
 * 黑夜 · 灯影江山：星子明灭、满月月海、孔明灯缓缓升起、云雾缭绕。
 * 无鼠标视差、无点击特效。
 */
export default function LanternAmbient() {
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

    function spawnLantern(anyY: boolean) {
      return {
        x: rnd(0.08, 0.92),
        y: anyY ? rnd(0.3, 1.1) : 1.08,
        s: rnd(0.7, 1.25),
        sp: rnd(9, 16),
        ph: rnd(0, 7),
        drift: rnd(0.3, 0.8),
      }
    }

    const stars = Array.from({ length: Math.max(40, Math.floor((window.innerWidth * window.innerHeight) / 11000)) }, () => ({
      x: Math.random(),
      y: Math.random() * 0.6,
      r: rnd(0.5, 1.4),
      ph: rnd(0, 7),
      sp: rnd(0.4, 1.6),
    }))
    const lanterns = Array.from({ length: 7 }, () => spawnLantern(true))
    const wisps = Array.from({ length: 3 }, () => ({
      x: Math.random(),
      y: rnd(0.3, 0.6),
      r: rnd(0.2, 0.3),
      sp: rnd(2, 5),
      a: rnd(0.06, 0.12),
    }))

    let meteor: { x: number; y: number; vx: number; vy: number; t0: number } | null = null
    let nextMeteor = 5000

    const frame = (now: number) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)

      for (const s of stars) {
        const a = 0.2 + 0.6 * Math.abs(Math.sin(t * s.sp + s.ph))
        ctx.fillStyle = `rgba(238,242,252,${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const mx = W * 0.72
      const my = H * 0.16
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, H * 0.26)
      halo.addColorStop(0, 'rgba(240,234,214,.26)')
      halo.addColorStop(1, 'rgba(240,234,214,0)')
      ctx.fillStyle = halo
      ctx.fillRect(mx - H * 0.26, my - H * 0.26, H * 0.52, H * 0.52)
      ctx.fillStyle = '#f2ecd9'
      ctx.beginPath()
      ctx.arc(mx, my, H * 0.042, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(196,190,170,.3)'
      ctx.beginPath()
      ctx.arc(mx - H * 0.01, my - H * 0.007, H * 0.01, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(mx + H * 0.013, my + H * 0.009, H * 0.007, 0, Math.PI * 2)
      ctx.fill()

      if (!reduced) {
        if (!meteor && now > nextMeteor) {
          meteor = { x: rnd(0.15, 0.8) * W, y: rnd(0.04, 0.2) * H, vx: rnd(240, 380), vy: rnd(90, 140), t0: now }
        }
        if (meteor) {
          const mp = (now - meteor.t0) / 900
          if (mp >= 1) {
            meteor = null
            nextMeteor = now + rnd(6000, 13000)
          } else {
            const mxx = meteor.x + meteor.vx * mp
            const myy = meteor.y + meteor.vy * mp
            const mg = ctx.createLinearGradient(mxx, myy, mxx - meteor.vx * 0.15, myy - meteor.vy * 0.15)
            mg.addColorStop(0, `rgba(240,240,250,${(0.85 * (1 - mp)).toFixed(3)})`)
            mg.addColorStop(1, 'rgba(240,240,250,0)')
            ctx.strokeStyle = mg
            ctx.lineWidth = 1.8
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(mxx, myy)
            ctx.lineTo(mxx - meteor.vx * 0.15, myy - meteor.vy * 0.15)
            ctx.stroke()
          }
        }
      }

      for (const w of wisps) {
        const wx = (((w.x * W + t * w.sp * 10) % (W + 600)) + W + 600) % (W + 600) - 300
        const g = ctx.createRadialGradient(wx, w.y * H, 0, wx, w.y * H, w.r * W)
        g.addColorStop(0, `rgba(200,210,235,${w.a})`)
        g.addColorStop(1, 'rgba(200,210,235,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(wx, w.y * H, w.r * W, w.r * W * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      lanterns.forEach((L, i) => {
        L.y -= L.sp / 60 / 100
        const lx = L.x * W + Math.sin(t * L.drift + L.ph) * 26
        const ly = L.y * H
        if (ly < -60) {
          lanterns[i] = spawnLantern(false)
          return
        }
        const flick = 0.82 + 0.18 * Math.sin(t * 7 + L.ph)
        const s = L.s
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 34 * s * flick)
        g.addColorStop(0, `rgba(240,180,90,${(0.4 * flick).toFixed(3)})`)
        g.addColorStop(1, 'rgba(240,180,90,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(lx, ly, 34 * s * flick, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(246,196,110,${(0.92 * flick).toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(lx - 8 * s, ly + 10 * s)
        ctx.quadraticCurveTo(lx - 11 * s, ly - 6 * s, lx - 5 * s, ly - 12 * s)
        ctx.quadraticCurveTo(lx, ly - 15 * s, lx + 5 * s, ly - 12 * s)
        ctx.quadraticCurveTo(lx + 11 * s, ly - 6 * s, lx + 8 * s, ly + 10 * s)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = 'rgba(120,60,20,.85)'
        ctx.fillRect(lx - 8 * s, ly + 9 * s, 16 * s, 2.4 * s)
        ctx.fillStyle = `rgba(255,240,190,${(0.95 * flick).toFixed(3)})`
        ctx.beginPath()
        ctx.ellipse(lx, ly + 4 * s, 2.6 * s, 4.2 * s, 0, 0, Math.PI * 2)
        ctx.fill()
      })

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
