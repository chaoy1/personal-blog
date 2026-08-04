'use client'

import { useEffect, useState } from 'react'

/** 首页首屏底部的下滑提示：固定在视口底部，滚动后淡出 */
export default function ScrollHint() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 70)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`scroll-hint${hidden ? ' hidden' : ''}`} aria-hidden="true">
      <span>向下滑动 · 展开画卷</span>
      <i />
    </div>
  )
}
