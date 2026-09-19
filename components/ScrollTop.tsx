'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/** 会与印章抢右下角的正文区域：只在这些容器里找，别把背景与导航算进来。 */
const CONTENT_ROOT_SELECTOR = 'main, .wrap, .guestbook-layout, .album-page, .timeline-page-body'
/** 候选元素：真正显示文字的叶子节点，或任何可点元素。 */
const BLOCKING_SELECTOR =
  'a, button, input, textarea, select, [role="button"], p, li, time, h1, h2, h3, small, strong, figcaption'
/** 印章四周留一点呼吸空间，避免贴着压线。 */
const PAD_X = 6
const PAD_Y = 4
/** 抬起后与正文保持的间隙 */
const GAP = 8

function hasOwnText(el: Element): boolean {
  return Array.from(el.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
  )
}

function isClickable(el: Element): boolean {
  return el.matches('a, button, input, textarea, select, [role="button"]')
}

/**
 * 印章钉在视口右下角，而窄屏下正文会一直铺到视口边缘——横贯整页的元素
 * （比如「登录后参与留言与评论」）无论怎么给内容留通道都会被压住。
 * 所以这里让印章自己让位：判断右下角是否落在一段文字或一个可点元素上，
 * 落在哪里就整体抬到它上方，回到空白处。
 */
function findBlockingOffset(button: HTMLElement, viewportHeight: number): number {
  const base = button.getBoundingClientRect()
  const applied = Number.parseFloat(button.dataset.offset ?? '0') || 0
  // 用「没有偏移时」的位置做基准，否则印章会把自己越推越高
  const rect = {
    left: base.left,
    right: base.right,
    top: base.top + applied,
    bottom: base.bottom + applied,
  }
  const zone = {
    left: rect.left - PAD_X,
    right: rect.right + PAD_X,
    top: rect.top - PAD_Y,
    bottom: rect.bottom + PAD_Y,
  }

  let highest = Infinity
  for (const root of Array.from(document.querySelectorAll(CONTENT_ROOT_SELECTOR))) {
    for (const el of Array.from(root.querySelectorAll(BLOCKING_SELECTOR))) {
      if (el === button || el.contains(button)) continue
      if (!isClickable(el) && !hasOwnText(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      if (r.right <= zone.left || r.left >= zone.right) continue
      if (r.bottom <= zone.top || r.top >= zone.bottom) continue
      if (r.top < highest) highest = r.top
    }
  }

  if (!Number.isFinite(highest)) return 0
  const next = Math.max(0, rect.bottom - highest + GAP)
  // 别把自己顶出屏幕
  return Math.min(Math.round(next), Math.max(0, viewportHeight - 140))
}

/**
 * 印章式「回到顶部」按钮，滚动超过一屏后以盖印动画浮现。
 * 浮现后会主动避开右下角的正文，不遮挡链接与文字。
 */
export default function ScrollTop() {
  const pathname = usePathname()
  const [showTop, setShowTop] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  const applyOffset = useCallback((offset: number) => {
    const el = ref.current
    if (!el) return
    const current = Number.parseFloat(el.dataset.offset ?? '0') || 0
    if (Math.round(current) === Math.round(offset)) return
    el.dataset.offset = String(offset)
    // 落款印章在 .back-top.show 里已经有 rotate(-5deg)，这里叠加位移
    el.style.transform = offset ? `rotate(-5deg) translateY(${-offset}px)` : ''
  }, [])

  useEffect(() => {
    let raf = 0
    let ticking = false

    const update = () => {
      const el = ref.current
      const visible = window.scrollY > window.innerHeight * 0.8
      setShowTop(visible)
      if (!el || !visible) {
        applyOffset(0)
        return
      }
      applyOffset(findBlockingOffset(el, window.innerHeight))
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        update()
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [applyOffset])

  // 后台控制台不显示
  if (pathname.startsWith('/admin')) return null

  const backToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`back-top${showTop ? ' show' : ''}`}
      onClick={backToTop}
      aria-label="回到顶部"
      title="回到顶部"
      tabIndex={showTop ? 0 : -1}
    >
      归
    </button>
  )
}
