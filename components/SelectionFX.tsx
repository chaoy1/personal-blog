'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Line = { x: number; y: number; w: number; h: number }

/**
 * 普通连续选中高亮：
 * 读取选区各行的矩形区域，绘制平整连续的高亮块，跨过字距空隙连成一片，
 * 解决大字号/大字距下浏览器把选中拆成一块块的问题。
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
      {lines.map((l, i) => (
        <rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={1}
          fill="var(--seal)"
          fillOpacity={0.18}
        />
      ))}
    </svg>
  )
}
