'use client'

import { useEffect, useState } from 'react'

/**
 * 首页首次进入：背景像画卷一样自上而下展开。
 * 一张宣纸面覆盖全屏，卷轴杆沿纸面顶端从顶部滑向底部，
 * 纸面随之滑出屏幕，露出底下的千里江山。仅每个会话第一次播放。
 */
const DURATION = 2100

export default function ScrollUnfold() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    try {
      if (sessionStorage.getItem('unfoldSeen')) return
    } catch {
      // ignore
    }
    setActive(true)
    const t = window.setTimeout(() => {
      setActive(false)
      try {
        sessionStorage.setItem('unfoldSeen', '1')
      } catch {
        // ignore
      }
    }, DURATION)
    return () => window.clearTimeout(t)
  }, [])

  if (!active) return null

  return (
    <div className="scroll-unfold" aria-hidden="true">
      <div className="su-paper" />
      <div className="su-rod">
        <i className="su-knob l" />
        <i className="su-knob r" />
      </div>
      <div className="su-shadow" />
    </div>
  )
}
