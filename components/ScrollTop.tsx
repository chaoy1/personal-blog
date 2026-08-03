'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 印章式「回到顶部」按钮，滚动超过一屏后以盖印动画浮现。
 */
export default function ScrollTop() {
  const pathname = usePathname()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let raf = 0
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
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
  )
}
