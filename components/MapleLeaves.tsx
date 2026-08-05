'use client'

import { useEffect, useRef } from 'react'
import { MAPLE_OUTLINE, MAPLE_STEM } from './maple-leaf-shape'

/**
 * 枫叶飘落
 * 白天：新叶形精灵（Python 参数化生成），暖秋配色 + 掌状叶脉 + 渐变叶面；
 * 夜晚：剪影叶片 + 冷银月光轮廓，飘落更慢、更少。
 * 沿用三层纵深（远/中/近）、微风 + 周期性阵风、旋转与翻面。
 */
const DAY_COLORS = ['#b3402f', '#c04a35', '#a5352a', '#8f3b28', '#c2593a', '#b94b34', '#c07a2e']
const NIGHT_FILL = '#12100d'

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, v + amt))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

type Vec = [number, number]

function polygonCentroid(pts: Vec[]): Vec {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    const cross = x0 * y1 - x1 * y0
    a += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  a *= 0.5
  if (Math.abs(a) < 1e-9) return [0, 0]
  return [cx / (6 * a), cy / (6 * a)]
}

function tracePath(g: CanvasRenderingContext2D, pts: Vec[], toPx: (p: Vec) => Vec): void {
  g.beginPath()
  const [sx, sy] = toPx(pts[0])
  g.moveTo(sx, sy)
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = toPx(pts[i])
    g.lineTo(x, y)
  }
  g.closePath()
}

function bezier(p0: Vec, c1: Vec, c2: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
  ]
}

/** 从轮廓中找出五个裂尖（按角度分扇区取最远点） */
function detectTips(pts: Vec[]): Vec[] {
  const sectors: Vec[][] = Array.from({ length: 5 }, () => [])
  for (const [x, y] of pts) {
    const deg = (Math.atan2(y, x) * 180) / Math.PI
    let idx: number
    if (deg > -90 && deg <= 1) idx = 0
    else if (deg > 1 && deg <= 56) idx = 1
    else if (deg > 56 && deg <= 124) idx = 2
    else if (deg > 124 && deg <= 179) idx = 3
    else idx = 4
    sectors[idx].push([x, y])
  }
  return sectors.map((sec) => {
    let best: Vec = sec[0] || [0, 1]
    let bestR = -1
    for (const p of sec) {
      const r = p[0] * p[0] + p[1] * p[1]
      if (r > bestR) {
        bestR = r
        best = p
      }
    }
    return best
  })
}

type Sprite = {
  canvas: HTMLCanvasElement
  cx: number
  cy: number
}

const TIPS = detectTips(MAPLE_OUTLINE)

function makeSprite(color: string, night: boolean): Sprite {
  const S = 96
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of MAPLE_OUTLINE) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const stemBottom = Math.min(...MAPLE_STEM.map((p) => p[1]))
  const margin = 4
  const w = Math.ceil((maxX - minX) * S) + margin * 2
  const h = Math.ceil((maxY - stemBottom) * S) + margin * 2
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!

  const toPx = (p: Vec): Vec => [(p[0] - minX) * S + margin, (maxY - p[1]) * S + margin]

  // 叶面
  tracePath(g, MAPLE_OUTLINE, toPx)

  if (night) {
    g.fillStyle = NIGHT_FILL
    g.fill()
    // 柔和月光光晕 + 冷银轮廓
    g.strokeStyle = 'rgba(198, 214, 230, 0.06)'
    g.lineWidth = 6
    g.stroke()
    g.strokeStyle = 'rgba(205, 220, 234, 0.30)'
    g.lineWidth = 1.2
    g.lineJoin = 'round'
    g.stroke()
    // 左上月光渐变
    g.save()
    tracePath(g, MAPLE_OUTLINE, toPx)
    g.clip()
    const ml = g.createLinearGradient(0, 0, w, h)
    ml.addColorStop(0, 'rgba(205, 222, 236, 0.16)')
    ml.addColorStop(0.55, 'rgba(205, 222, 236, 0)')
    g.fillStyle = ml
    g.fillRect(0, 0, w, h)
    g.restore()
  } else {
    const [cx, cy] = polygonCentroid(MAPLE_OUTLINE)
    const topY = maxY
    const botY = minY
    const grad = g.createLinearGradient(0, toPx([cx, topY])[1], 0, toPx([cx, botY])[1])
    grad.addColorStop(0, shade(color, 34))
    grad.addColorStop(0.45, color)
    grad.addColorStop(1, shade(color, -34))
    g.fillStyle = grad
    g.fill()

    g.save()
    tracePath(g, MAPLE_OUTLINE, toPx)
    g.clip()
    // 左上侧光
    const [hx, hy] = toPx([cx - 0.28, cy + 0.22])
    const gl = g.createRadialGradient(hx, hy, 2, hx, hy, Math.max(w, h) * 0.55)
    gl.addColorStop(0, 'rgba(255, 226, 180, 0.34)')
    gl.addColorStop(0.5, 'rgba(255, 226, 180, 0.08)')
    gl.addColorStop(1, 'rgba(255, 226, 180, 0)')
    g.fillStyle = gl
    g.fillRect(0, 0, w, h)
    // 叶缘暗部
    const edge = g.createLinearGradient(0, toPx([cx, botY])[1], 0, toPx([cx, topY])[1])
    edge.addColorStop(0, 'rgba(58, 14, 7, 0.30)')
    edge.addColorStop(1, 'rgba(58, 14, 7, 0)')
    g.fillStyle = edge
    g.fillRect(0, 0, w, h)

    // 掌状叶脉
    const basePx = toPx([0, 0])
    g.lineCap = 'round'
    for (const [tx, ty] of TIPS) {
      const tipPx = toPx([tx * 0.92, ty * 0.92])
      const ctrlPx = toPx([tx * 0.58, ty * 0.58])
      g.strokeStyle = rgba('#421106', 0.42)
      g.lineWidth = Math.abs(tx) < 0.08 ? 1.3 : 0.95
      g.beginPath()
      g.moveTo(basePx[0], basePx[1])
      for (let i = 1; i <= 10; i++) {
        const [bx, by] = bezier(basePx, ctrlPx, ctrlPx, tipPx, i / 10)
        g.lineTo(bx, by)
      }
      g.stroke()
    }
    g.restore()

    // 外描边
    g.strokeStyle = rgba('#2e0c06', 0.5)
    g.lineWidth = 1.1
    g.lineJoin = 'round'
    g.stroke()
  }

  // 叶柄：粗细渐变
  const stemPts = MAPLE_STEM.map(toPx)
  g.lineCap = 'round'
  g.strokeStyle = night ? 'rgba(24, 20, 16, 0.95)' : '#5e2a15'
  const w0 = Math.max(1.6, 0.05 * S)
  const w1 = Math.max(1, 0.03 * S)
  for (let i = 0; i < stemPts.length - 1; i++) {
    const t = i / (stemPts.length - 1)
    g.lineWidth = w0 + (w1 - w0) * t
    g.beginPath()
    g.moveTo(stemPts[i][0], stemPts[i][1])
    g.lineTo(stemPts[i + 1][0], stemPts[i + 1][1])
    g.stroke()
  }

  const [ccx, ccy] = toPx(polygonCentroid(MAPLE_OUTLINE))
  return { canvas: c, cx: ccx, cy: ccy }
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
  { scale: [0.4, 0.55], opacity: [0.3, 0.5], fall: [22, 36], swayAmp: [9, 16] },   // 远
  { scale: [0.62, 0.82], opacity: [0.5, 0.72], fall: [34, 54], swayAmp: [15, 26] },  // 中
  { scale: [0.9, 1.18], opacity: [0.72, 0.94], fall: [50, 80], swayAmp: [22, 38] }, // 近
]

export default function MapleLeaves({ night = false }: { night?: boolean }) {
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
    let sprites: Sprite[] = []

    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const layerOf = (r: number) => (r < 0.4 ? 0 : r < 0.75 ? 1 : 2)

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!sprites.length) {
        sprites = night
          ? [makeSprite(NIGHT_FILL, true)]
          : DAY_COLORS.map((c) => makeSprite(c, false))
      }

      const density = night ? 0.62 : 1
      const count = Math.max(night ? 14 : 22, Math.min(night ? 26 : 44, Math.round(((W * H) / 56000) * density)))
      leaves = Array.from({ length: count }, () => {
        const cfg = LAYERS[layerOf(Math.random())]
        const size = 20 + Math.random() * 15
        return {
          x: Math.random() * W,
          y: Math.random() * (H + 140) - 100,
          baseX: Math.random() * W,
          size: size * rnd(cfg.scale[0], cfg.scale[1]),
          sprite: Math.floor(Math.random() * sprites.length),
          flip: Math.random() < 0.5 ? 1 : -1,
          fall: rnd(cfg.fall[0], cfg.fall[1]) * (night ? 0.72 : 1),
          swayAmp: rnd(cfg.swayAmp[0], cfg.swayAmp[1]) * (night ? 1.35 : 1),
          swayFreq: 0.35 + Math.random() * 0.6,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (0.3 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1) * (night ? 0.7 : 1),
          phase: Math.random() * Math.PI * 2,
          opacity: rnd(cfg.opacity[0], cfg.opacity[1]) * (night ? 0.9 : 1),
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
          L.size = (20 + Math.random() * 15) * rnd(cfg.scale[0], cfg.scale[1])
          L.fall = rnd(cfg.fall[0], cfg.fall[1]) * (night ? 0.72 : 1)
          L.swayAmp = rnd(cfg.swayAmp[0], cfg.swayAmp[1]) * (night ? 1.35 : 1)
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
        const sp = sprites[L.sprite]
        const s = L.size / 96
        ctx.scale(L.flip * s, s)
        ctx.drawImage(sp.canvas, -sp.cx, -sp.cy)
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
  }, [night])

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />
}
