'use client'

import { useEffect, useRef } from 'react'

/**
 * 白天 · 枫叶飘落（优化版）
 * 近/中/远三层纵深：远景轻淡缓慢、近景清晰较快；
 * 全局微风 + 周期性阵风让叶子斜飘摆动；旋转与轻微翻转增加自然感。
 * 预渲染精灵、限制像素密度、隐藏页面时暂停，保持流畅。
 */
const COLORS = ['#b3402f', '#c04a35', '#a5352a', '#8f3b28', '#c2593a', '#b94b34']

/* 十六进制色 -> rgba */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/* 颜色变亮/变暗（amt 正亮负暗） */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, v + amt))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/* 五裂枫叶轮廓：极坐标扫掠 + 浅锯齿，裂片饱满 */
const SEGS: [number, number, number, number, number][] = [
  [180, 7, 158, 11, 0],
  [158, 11, 118, 38, 2],
  [118, 38, 94, 15, 2],
  [94, 15, 64, 44, 3],
  [64, 44, 38, 15, 3],
  [38, 15, 0, 56, 4],
]

function buildBladePath(g: CanvasRenderingContext2D): void {
  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (a: number, r: number) => [r * Math.sin(rad(a)), -r * Math.cos(rad(a))] as const
  const pts: ReturnType<typeof pt>[] = []
  for (const [a0, r0, a1, r1, teeth] of SEGS) {
    const N = Math.max(4, teeth * 2 + 2)
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const a = a0 + (a1 - a0) * t
      const r = r0 + (r1 - r0) * t
      const taper = Math.sin(Math.PI * t)
      const saw = i % 2 === 1 ? 2.3 * taper + (Math.random() - 0.5) * 1.2 : -1.4 * taper
      pts.push(pt(a + (Math.random() - 0.5) * 1.1, r + saw))
    }
  }
  const all: [number, number][] = pts.map((p) => [p[0], p[1]])
  for (let i = pts.length - 1; i >= 0; i--) {
    const [x, y] = pts[i]
    if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) {
      all.push([-x * 1.05, y + (Math.random() - 0.5) * 1.6])
    }
  }
  g.beginPath()
  g.moveTo(all[0][0], all[0][1])
  for (let i = 1; i < all.length; i++) g.lineTo(all[i][0], all[i][1])
  g.closePath()
}

function makeLeafSprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 192
  c.height = 224
  const g = c.getContext('2d')!
  g.translate(96, 120)
  g.scale(2, 2)

  buildBladePath(g)
  const grad = g.createRadialGradient(0, 10, 4, 0, 6, 58)
  grad.addColorStop(0, shade(color, 30))
  grad.addColorStop(0.5, color)
  grad.addColorStop(1, shade(color, -26))
  g.fillStyle = grad
  g.fill()

  g.strokeStyle = rgba('#2e0c06', 0.5)
  g.lineWidth = 1.2
  g.stroke()

  // 叶片内光影与细斑
  g.save()
  buildBladePath(g)
  g.clip()
  const hi = g.createLinearGradient(-24, -40, 20, 32)
  hi.addColorStop(0, 'rgba(255,240,208,0.28)')
  hi.addColorStop(0.55, 'rgba(255,240,208,0)')
  g.fillStyle = hi
  g.fillRect(-48, -60, 96, 120)
  const lo = g.createLinearGradient(0, 16, 0, 52)
  lo.addColorStop(0, 'rgba(60,14,7,0)')
  lo.addColorStop(1, 'rgba(60,14,7,0.26)')
  g.fillStyle = lo
  g.fillRect(-48, -10, 96, 70)
  for (let i = 0; i < 34; i++) {
    g.fillStyle = rgba('#4c1309', 0.03 + Math.random() * 0.045)
    g.beginPath()
    g.arc((Math.random() - 0.5) * 64, (Math.random() - 0.5) * 80, 0.6 + Math.random() * 1.8, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()

  // 五条主脉
  const tips: [number, number][] = [
    [0, -52],
    [38, -8],
    [34, 28],
    [-38, -8],
    [-34, 28],
  ]
  g.strokeStyle = rgba('#421106', 0.5)
  g.lineCap = 'round'
  for (const [tx, ty] of tips) {
    g.lineWidth = tx === 0 ? 1.5 : 1
    g.beginPath()
    g.moveTo(0, 38)
    g.quadraticCurveTo(tx * 0.52, (38 + ty) * 0.4, tx * 0.9, ty * 0.98)
    g.stroke()
  }

  // 叶柄：单根平滑，粗→细
  g.strokeStyle = '#5e2a15'
  g.lineWidth = 2.8
  g.beginPath()
  g.moveTo(0, 38)
  g.quadraticCurveTo(0.8, 46, 1.2, 52)
  g.stroke()
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(0, 40)
  g.quadraticCurveTo(0.9, 47, 1.3, 53)
  g.stroke()

  return c
}

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
        const size = 22 + Math.random() * 18
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
          L.size = (22 + Math.random() * 18) * rnd(cfg.scale[0], cfg.scale[1])
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
        const s = L.size / 192
        ctx.scale(L.flip * s, s)
        ctx.drawImage(sprites[L.sprite], -96, -120)
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
