'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Line = { x: number; y: number; w: number; h: number }

/**
 * 手写感选中高亮：
 * 读取选区各行的矩形区域，用 SVG 绘制一条扁头（平行四边形）马克笔笔触——
 * 两端斜切、上下边缘带轻微手写起伏，整体接近平行四边形。
 * 笔触跨过字距空隙连成一片，解决大字号/大字距下选中被拆开的问题。
 */
function mergeLines(rects: DOMRect[]): Line[] {
  const arr = rects
    .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Line[] = []
  for (const r of arr) {
    let merged = false
    for (const line of out) {
      // 纵向重叠即视为同一行（兼容墨迹滤镜导致的矩形偏移）
      if (r.y < line.y + line.h - 8 && r.y + r.h > line.y + 8) {
        const x2 = Math.max(line.x + line.w, r.x + r.w)
        const y2 = Math.max(line.y + line.h, r.y + r.h)
        line.x = Math.min(line.x, r.x)
        line.y = Math.min(line.y, r.y)
        line.w = x2 - line.x
        line.h = y2 - line.y
        merged = true
        break
      }
    }
    if (!merged) out.push({ ...r })
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

function linePath(l: Line, seed: number): string {
  const s = Math.min(12, l.h * 0.18) // 两端斜角
  const yTop = l.y + l.h * 0.16
  const yBot = l.y + l.h * 0.84
  const wave = (x: number, base: number) =>
    base + Math.sin(x * 0.045 + seed * 2.1) * 1.3 + Math.sin(x * 0.11 + seed * 0.7) * 0.6

  const pTop0 = { x: l.x + s, y: wave(l.x + s, yTop) }
  const pTop1 = { x: l.x + l.w, y: wave(l.x + l.w, yTop) }
  const pBot0 = { x: l.x, y: wave(l.x, yBot) }
  const pBot1 = { x: l.x + l.w - s, y: wave(l.x + l.w - s, yBot) }
  const midTopX = (pTop0.x + pTop1.x) / 2
  const midBotX = (pBot0.x + pBot1.x) / 2

  return [
    `M ${pTop0.x.toFixed(1)} ${pTop0.y.toFixed(1)}`,
    `Q ${midTopX.toFixed(1)} ${(wave(midTopX, yTop) - 0.9).toFixed(1)} ${pTop1.x.toFixed(1)} ${pTop1.y.toFixed(1)}`,
    `L ${pBot1.x.toFixed(1)} ${pBot1.y.toFixed(1)}`,
    `Q ${midBotX.toFixed(1)} ${(wave(midBotX, yBot) + 0.9).toFixed(1)} ${pBot0.x.toFixed(1)} ${pBot0.y.toFixed(1)}`,
    'Z',
  ].join(' ')
}

function bottomEdge(l: Line, seed: number): string {
  const s = Math.min(12, l.h * 0.18)
  const yBot = l.y + l.h * 0.84
  const wave = (x: number, base: number) =>
    base + Math.sin(x * 0.045 + seed * 2.1) * 1.3 + Math.sin(x * 0.11 + seed * 0.7) * 0.6
  const p0 = { x: l.x, y: wave(l.x, yBot) }
  const p1 = { x: l.x + l.w - s, y: wave(l.x + l.w - s, yBot) }
  const midX = (p0.x + p1.x) / 2
  return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${midX.toFixed(1)} ${(wave(midX, yBot) + 1.1).toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
}

export default function SelectionFX() {
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const visibleRef = useRef(false)
  const pathname = usePathname()

  // 翻页 / 路由变化时清除残留
  useEffect(() => {
    visibleRef.current = false
    setLines([])
  }, [pathname])

  useEffect(() => {
    const setViewport = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    setViewport()

    let timer = 0
    const update = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          visibleRef.current = false
          setLines([])
          return
        }
        const range = sel.getRangeAt(0)
        const node = range.commonAncestorContainer
        const el: Element | null =
          node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
        // 输入框 / 文本域保持原生选中样式，不做覆盖
        if (el && el.closest('input, textarea, [contenteditable="true"]')) {
          visibleRef.current = false
          setLines([])
          return
        }
        const rects = Array.from(range.getClientRects()).filter(
          (r) => r.width > 0 && r.height > 0
        )
        if (rects.length === 0) {
          visibleRef.current = false
          setLines([])
          return
        }
        const merged = mergeLines(rects)
        visibleRef.current = merged.length > 0
        setLines(merged)
      }, 40)
    }

    const onScroll = () => {
      if (visibleRef.current) update()
    }
    const onResize = () => {
      setViewport()
      update()
    }
    const clear = () => {
      visibleRef.current = false
      setLines([])
    }

    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('pointerdown', clear)
    return () => {
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', clear)
      window.clearTimeout(timer)
    }
  }, [])

  if (!size.w || lines.length === 0) return null

  return (
    <svg className="selection-fx" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
      {lines.map((l, i) => {
        return (
          <g key={i}>
            {/* 平行四边形主体（浅色） */}
            <path
              d={linePath(l, i)}
              fill="var(--seal)"
              fillOpacity={0.18}
            />
            {/* 底部一条较实的笔触边，模拟马克笔压痕 */}
            <path
              d={bottomEdge(l, i)}
              fill="none"
              stroke="var(--seal)"
              strokeOpacity={0.3}
              strokeWidth={Math.max(1.6, l.h * 0.03)}
              strokeLinecap="round"
            />
          </g>
        )
      })}
    </svg>
  )
}
