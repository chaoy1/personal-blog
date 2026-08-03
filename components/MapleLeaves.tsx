'use client'

import { useEffect, useRef } from 'react'

/**
 * 白天 · 枫叶飘落（优化版）
 * 近/中/远三层纵深：远景轻淡缓慢、近景清晰较快；
 * 全局微风 + 周期性阵风让叶子斜飘摆动；旋转与轻微翻转增加自然感。
 * 预渲染精灵、限制像素密度、隐藏页面时暂停，保持流畅。
 */
const COLORS = ['#b3402f', '#c04a35', '#a5352a', '#8f3b28', '#c2593a', '#b94b34']

type Leaf = {
  x: number
  y: number
  baseX: number
  size: number
  sprite: number
  flip: 1 | -1
  fall: number
  swayAmp: number
  swayFreq: number
  rot: number
  rotSpd: number
  phase: number
  opacity: number
}

type LayerCfg = {
  scale: [number, number]
  opacity: [number, number]
  fall: [number, number]
  swayAmp: [number, number]
}

const LAYERS: LayerCfg[] = [
  { scale: [0.55, 0.75], opacity: [0.35, 0.55], fall: [24, 40], swayAmp: [10, 18] }, // 远
  { scale: [0.82, 1.05], opacity: [0.55, 0.75], fall: [38, 60], swayAmp: [16, 28] }, // 中
  { scale: [1.18, 1.5], opacity: [0.78, 0.95], fall: [56, 88], swayAmp: [24, 40] }, // 近
]

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
  g.strokeStyle = 'rgba(90, 26, 18, 0.45)'
  g.lineWidth = 1.3
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
  g.strokeStyle = 'rgba(92, 40, 22, 0.8)'
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
    let raf = 0
    let last = performance.now()
    let leaves: Leaf[] = []
    let sprites: HTMLCanvasElement[] = []

    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const layerOf = (r: number) => (r < 0.4 ? 0 : r < 0.75 ? 1 : 2)

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!sprites.length) sprites = COLORS.map(makeLeafSprite)

      const count = Math.max(22, Math.min(44, Math.round((W * H) / 56000)))
      leaves = Array.from({ length: count }, () => {
        const cfg = LAYERS[layerOf(Math.random())]
        const size = 18 + Math.random() * 18
        return {
          x: Math.random() * W,
          y: Math.random() * (H + 140) - 100,
          baseX: Math.random() * W,
          size: size * rnd(cfg.scale[0], cfg.scale[1]),
          sprite: Math.floor(Math.random() * sprites.length),
          flip: Math.random() < 0.5 ? 1 : -1,
          fall: rnd(cfg.fall[0], cfg.fall[1]),
          swayAmp: rnd(cfg.swayAmp[0], cfg.swayAmp[1]),
          swayFreq: 0.35 + Math.random() * 0.6,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (0.35 + Math.random() * 0.75) * (Math.random() < 0.5 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
          opacity: rnd(cfg.opacity[0], cfg.opacity[1]),
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

      // 微风 + 周期性阵风
      const gust = Math.pow(Math.max(0, Math.sin(t * 0.5)), 6) * 30
      const wind = Math.sin(t * 0.12) * 10 + gust

      for (const L of leaves) {
        L.y += L.fall * dt
        L.baseX += wind * dt * 0.8
        if (L.baseX < -100) L.baseX = W + 100
        if (L.baseX > W + 100) L.baseX = -100
        if (L.y > H + 110) {
          const cfg = LAYERS[layerOf(Math.random())]
          L.y = -90 - Math.random() * 80
          L.baseX = Math.random() * W
          L.size = (18 + Math.random() * 18) * rnd(cfg.scale[0], cfg.scale[1])
          L.fall = rnd(cfg.fall[0], cfg.fall[1])
          L.swayAmp = rnd(cfg.swayAmp[0], cfg.swayAmp[1])
          L.opacity = rnd(cfg.opacity[0], cfg.opacity[1])
          L.sprite = Math.floor(Math.random() * sprites.length)
          L.flip = Math.random() < 0.5 ? 1 : -1
        }
        L.rot += L.rotSpd * dt
        const x = L.baseX + Math.sin(t * L.swayFreq + L.phase) * L.swayAmp

        ctx.save()
        ctx.globalAlpha = L.opacity
        ctx.translate(x, L.y)
        ctx.rotate(L.rot)
        ctx.scale(L.flip * (L.size / 88), L.size / 106)
        ctx.drawImage(sprites[L.sprite], -44, -56)
        ctx.restore()
      }

      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame)
    }
    if (!reduced) raf = requestAnimationFrame(frame)

    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!reduced && !document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />
}
