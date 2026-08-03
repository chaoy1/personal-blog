'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Rect = { x: number; y: number; w: number; h: number }

/**
 * 只修复首页「似水流年」标题的选中高亮：
 * 大字号 + 大字距会让浏览器把选中拆成一块块，这里在标题被选中时
 * 绘制一整条连续色块覆盖文字实际占用的范围（含字间空隙、不含两端空白），
 * 其余页面的选中保持原生样式。
 */
export default function TitleSelectionFix() {
  const [rect, setRect] = useState<Rect | null>(null)
  const visibleRef = useRef(false)
  const pathname = usePathname()

  // 路由变化时清除残留
  useEffect(() => {
    visibleRef.current = false
    setRect(null)
  }, [pathname])

  useEffect(() => {
    let timer = 0
    const update = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const sel = window.getSelection()
        const title = document.querySelector<HTMLElement>('.masthead .title')
        if (!title || !sel || sel.isCollapsed || sel.rangeCount === 0) {
          visibleRef.current = false
          setRect(null)
          return
        }
        const node = sel.getRangeAt(0).commonAncestorContainer
        const el: Element | null =
          node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
        if (!el || !title.contains(el)) {
          visibleRef.current = false
          setRect(null)
          return
        }
        // 只覆盖文字实际占用的范围（含字间空隙，不含两端缩进空白）
        const span = document.createRange()
        span.selectNodeContents(title)
        const rs = Array.from(span.getClientRects()).filter((rr) => rr.width > 0)
        if (rs.length === 0) {
          visibleRef.current = false
          setRect(null)
          return
        }
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const rr of rs) {
          minX = Math.min(minX, rr.left)
          minY = Math.min(minY, rr.top)
          maxX = Math.max(maxX, rr.right)
          maxY = Math.max(maxY, rr.bottom)
        }
        // 去掉末尾的一个字距，避免右端多出一段空白
        const ls = parseFloat(getComputedStyle(title).letterSpacing) || 0
        const r = { x: minX, y: minY, w: Math.max(0, maxX - minX - ls), h: maxY - minY }
        visibleRef.current = true
        setRect(r)
      }, 30)
    }
    const clear = () => {
      visibleRef.current = false
      setRect(null)
    }
    const onScroll = () => {
      if (visibleRef.current) update()
    }

    document.addEventListener('selectionchange', update)
    window.addEventListener('pointerdown', clear)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('pointerdown', clear)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      window.clearTimeout(timer)
    }
  }, [])

  if (!rect) return null

  return (
    <div
      aria-hidden="true"
      className="title-selection-fix"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  )
}
