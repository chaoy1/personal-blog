'use client'

import { useEffect, useRef, useState } from 'react'

type Line = { x: number; y: number; w: number; h: number }

/**
 * 手写感选中高亮：
 * 读取选区各行的矩形区域，用 SVG 绘制一条随手划过的马克笔笔触——
 * 圆头、边缘微微起伏、带一点晕染，不像规整矩形。
 * 笔触跨过字距空隙连成一片，解决大字号/大字距下选中被拆开的问题。
 */
function mergeLines(rects: DOMRect[]): Line[] {
  const arr = rects
    .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Line[] = []
  for (const r of arr) {
    const last = out[out.length - 1]
    if (
      last &&
      Math.abs(r.y - last.y) < 6 &&
      Math.abs(r.y + r.h - (last.y + last.h)) < 6
    ) {
      const x2 = Math.max(last.x + last.w, r.x + r.w)
      const y2 = Math.max(last.y + last.h, r.y + r.h)
      last.x = Math.min(last.x, r.x)
      last.y = Math.min(last.y, r.y)
      last.w = x2 - last.x
      last.h = y2 - last.y
    } else {
      out.push({ ...r })
    }
  }
  return out
}

export default function SelectionFX() {
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const visibleRef = useRef(false)

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

    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
    }
  }, [])

  if (!size.w || lines.length === 0) return null

  return (
    <svg className="selection-fx" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
      {lines.map((l, i) => {
        const y0 = l.y + l.h * 0.52
        const wob = Math.min(2.4, l.h * 0.045)
        const n = Math.max(4, Math.round(l.w / 55))
        const pts: { x: number; y: number }[] = []
        for (let s = 0; s <= n; s++) {
          const t = s / n
          const x = l.x + 4 + (l.w - 8) * t
          const y =
            y0 +
            Math.sin(t * Math.PI * 2.3 + i * 1.71) * wob +
            Math.sin(t * Math.PI * 4.7 + i * 0.83) * wob * 0.35
          pts.push({ x, y })
        }
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
        for (let s = 1; s <= n; s++) {
          const prev = pts[s - 1]
          const cur = pts[s]
          const mx = (prev.x + cur.x) / 2
          const my = (prev.y + cur.y) / 2
          d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
        }
        d += ` Q ${pts[n - 1].x.toFixed(1)} ${pts[n - 1].y.toFixed(1)} ${pts[n].x.toFixed(1)} ${pts[n].y.toFixed(1)}`
        const w1 = Math.max(5, l.h * 0.68)
        return (
          <g key={i}>
            {/* 外层淡晕染 */}
            <path
              d={d}
              fill="none"
              stroke="var(--seal)"
              strokeOpacity={0.13}
              strokeWidth={w1 * 1.28}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 主笔触 */}
            <path
              d={d}
              fill="none"
              stroke="var(--seal)"
              strokeOpacity={0.32}
              strokeWidth={w1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
    </svg>
  )
}
