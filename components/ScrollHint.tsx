'use client'

import { useEffect, useState } from 'react'

/**
 * 首页第一屏底部的下滑提示：作为画卷边缘的一枚轻量页签，点击平滑滚动一屏；
 * 一旦离开首屏区域即淡出，回到顶部再出现。
 */
export default function ScrollHint() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setHidden(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <button
      type="button"
      className={`scroll-hint${hidden ? ' hidden' : ''}`}
      aria-label="向下浏览首页内容"
      onClick={() => {
        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
      }}
    >
      <span className="sh-copy">
        <b>往下 · 入卷</b>
        <small>SCROLL TO EXPLORE</small>
      </span>
      <span className="sh-line" aria-hidden="true">
        <i />
      </span>
    </button>
  )
}
