'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 顶部墨条滚动进度 + 印章式「回到顶部」按钮。
 * 进度条用 transform 驱动（GPU 合成，无重排）；按钮滚动超过一屏后以盖印动画浮现。
 */
export default function ScrollTop() {
  const pathname = usePathname()
  const barRef = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let raf = 0
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, y / max) : 0
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${p.toFixed(4)})`
        }
        setShowTop(y > window.innerHeight * 0.8)
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // 后台控制台不显示
  if (pathname.startsWith('/admin')) return null

  const backToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <div ref={barRef} className="scroll-progress-bar" />
      </div>
      <button
        type="button"
        className={`back-top${showTop ? ' show' : ''}`}
        onClick={backToTop}
        aria-label="回到顶部"
        title="回到顶部"
        tabIndex={showTop ? 0 : -1}
      >
        归
      </button>
    </>
  )
}
