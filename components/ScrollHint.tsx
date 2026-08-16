'use client'

import { useEffect, useState } from 'react'

/**
 * 首页第一屏底部的下滑提示：固定在屏幕底部，点击平滑滚动一屏；
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
      onClick={() => {
        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
      }}
    >
      <span>向下滑动 · 展开画卷</span>
      <i aria-hidden="true" />
    </button>
  )
}
