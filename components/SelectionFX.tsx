'use client'

import { useEffect, useRef, useState } from 'react'

type Line = { x: number; y: number; w: number; h: number }

/**
 * 微信读书式选中特效：
 * 读取选区各行的矩形区域，用 SVG 绘制「连续高亮 + 毛笔画线」。
 * 高亮跨过字距空隙连成一片，画线带轻微弧度模拟真实笔触。
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
        const midY = l.y + l.h * 0.78
        const wob = Math.min(2.2, l.h * 0.035)
        const d = `M ${l.x + 3} ${midY} Q ${l.x + l.w / 2} ${midY - wob} ${l.x + l.w - 3} ${midY}`
        return (
          <g key={i}>
            {/* 连续高亮，填平字距空隙 */}
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              rx={3}
              fill="var(--seal)"
              fillOpacity={0.13}
            />
            {/* 画线：外层淡墨晕 + 内层主笔触 */}
            <path
              d={d}
              fill="none"
              stroke="var(--seal)"
              strokeOpacity={0.16}
              strokeWidth={Math.max(5, l.h * 0.09)}
              strokeLinecap="round"
            />
            <path
              d={d}
              fill="none"
              stroke="var(--seal)"
              strokeOpacity={0.62}
              strokeWidth={Math.max(2.4, l.h * 0.045)}
              strokeLinecap="round"
            />
          </g>
        )
      })}
    </svg>
  )
}
