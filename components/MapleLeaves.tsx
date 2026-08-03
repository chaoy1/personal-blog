'use client'

import { useEffect, useRef } from 'react'

/**
 * 白天 · 枫叶飘落
 * 预渲染枫叶精灵，逐帧绘制；缓慢下落 + 左右摆动 + 自转，
 * 少量横向风，整体轻盈不抢戏。遵守 reduced-motion。
 */
const COLORS = ['#b3402f', '#c04a35', '#a5352a', '#8f3b28', '#c2593a']

type Leaf = {
  x: number
  y: number
  baseX: number
  size: number
  sprite: number
  fall: number
  swayAmp: number
  swayFreq: number
  rot: number
  rotSpd: number
  phase: number
  opacity: number
}

function makeLeafSprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 88
  c.height = 106
  const g = c.getContext('2d')!
  g.translate(44, 56)

  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, -46)
  g.bezierCurveTo(2, -30, 7, -20, 14, -15)
  g.bezierCurveTo(23, -23, 30, -27, 38, -29)
  g.bezierCurveTo(33, -19, 30, -12, 30, -6)
  g.bezierCurveTo(35, -4, 40, -2, 46, 3)
  g.bezierCurveTo(37, 5, 32, 7, 28, 11)
  g.bezierCurveTo(30, 19, 33, 29, 35, 40)
  g.bezierCurveTo(26, 34, 21, 30, 17, 30)
  g.bezierCurveTo(13, 36, 10, 44, 8, 52)
  g.bezierCurveTo(6, 46, 4, 42, 0, 40)
  g.bezierCurveTo(-4, 42, -6, 46, -8, 52)
  g.bezierCurveTo(-10, 44, -13, 36, -17, 30)
  g.bezierCurveTo(-21, 30, -26, 34, -35, 40)
  g.bezierCurveTo(-33, 29, -30, 19, -28, 11)
  g.bezierCurveTo(-32, 7, -37, 5, -46, 3)
  g.bezierCurveTo(-40, -2, -35, -4, -30, -6)
  g.bezierCurveTo(-30, -12, -33, -19, -38, -29)
  g.bezierCurveTo(-30, -27, -23, -23, -14, -15)
  g.bezierCurveTo(-7, -20, -2, -30, 0, -46)
  g.closePath()
  g.fill()

  // 叶脉
  g.strokeStyle = 'rgba(90, 26, 18, 0.5)'
  g.lineWidth = 1.4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, -42)
  g.quadraticCurveTo(1, 0, 0, 40)
  g.moveTo(0, -18)
  g.quadraticCurveTo(12, -12, 30, -22)
  g.moveTo(0, -18)
  g.quadraticCurveTo(-12, -12, -30, -22)
  g.moveTo(0, 10)
  g.quadraticCurveTo(14, 18, 32, 34)
  g.moveTo(0, 10)
  g.quadraticCurveTo(-14, 18, -32, 34)
  g.stroke()

  // 叶柄
  g.strokeStyle = 'rgba(92, 40, 22, 0.85)'
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(0, 38)
  g.quadraticCurveTo(-1, 46, 1, 54)
  g.stroke()

  return c
}

export default function MapleLeaves() {
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
    let last = performance.now()
    let leaves: Leaf[] = []
    let sprites: HTMLCanvasElement[] = []

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!sprites.length) sprites = COLORS.map(makeLeafSprite)
      const count = Math.max(16, Math.min(30, Math.round((W * H) / 68000)))
      leaves = Array.from({ length: count }, () => {
        const size = 18 + Math.random() * 16
        return {
          x: Math.random() * W,
          y: Math.random() * (H + 120) - 80,
          baseX: Math.random() * W,
          size,
          sprite: Math.floor(Math.random() * sprites.length),
          fall: 26 + Math.random() * 32,
          swayAmp: 12 + Math.random() * 20,
          swayFreq: 0.35 + Math.random() * 0.55,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (0.4 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
          opacity: 0.5 + Math.random() * 0.38,
        }
      })
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)
      const wind = Math.sin(t * 0.13) * 14

      for (const L of leaves) {
        L.y += L.fall * dt
        L.baseX += wind * dt * 0.7
        if (L.baseX < -80) L.baseX = W + 80
        if (L.baseX > W + 80) L.baseX = -80
        if (L.y > H + 90) {
          L.y = -80 - Math.random() * 60
          L.baseX = Math.random() * W
          L.size = 18 + Math.random() * 16
          L.sprite = Math.floor(Math.random() * sprites.length)
        }
        L.rot += L.rotSpd * dt
        const x = L.baseX + Math.sin(t * L.swayFreq + L.phase) * L.swayAmp
        const tilt = Math.sin(t * L.swayFreq * 0.8 + L.phase) * 0.45
        ctx.save()
        ctx.globalAlpha = L.opacity
        ctx.translate(x, L.y)
        ctx.rotate(L.rot)
        ctx.scale(L.size / 88, L.size / 106)
        ctx.drawImage(sprites[L.sprite], -44, -56)
        ctx.restore()
        void tilt
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
