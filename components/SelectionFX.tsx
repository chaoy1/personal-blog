'use client'

import { useEffect, useRef, useState } from 'react'

type Line = { x: number; y: number; w: number; h: number }

/**
 * 连续选中高亮：
 * 读取选区各行的矩形区域，用 SVG 绘制平整连续的高亮块。
 * 高亮跨过字距空隙连成一片，解决大字号/大字距下选中被拆成一块块的问题。
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
      {lines.map((l, i) => (
        <rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={2}
          fill="var(--seal)"
          fillOpacity={0.2}
        />
      ))}
    </svg>
  )
}
