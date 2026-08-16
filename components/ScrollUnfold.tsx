'use client'

import { useEffect, useState } from 'react'

/**
 * 首页首次进入：背景像画卷一样自左向右展开。
 * 一张宣纸面覆盖全屏，纸面仅有淡墨山影，不浮现任何文字；
 * 卷轴木杆沿纸面从左向右滑过，纸面随之卷出屏幕，露出底下的千里江山。
 * 仅每个会话第一次播放。
 */
const DURATION = 3000
// 首屏内容在卷轴之后依次浮现，全部播完再移除 unfold-live，
// 避免动画延迟被中途取消而瞬间跳到终态（卡顿的来源之一）。
const CLASS_REMOVE_DELAY = 5950

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
    document.documentElement.classList.add('unfold-live')
    const t1 = window.setTimeout(() => {
      setActive(false)
      try {
        sessionStorage.setItem('unfoldSeen', '1')
      } catch {
        // ignore
      }
    }, DURATION + 80)
    const t2 = window.setTimeout(() => {
      document.documentElement.classList.remove('unfold-live')
    }, CLASS_REMOVE_DELAY)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  if (!active) return null

  return (
    <div className="scroll-unfold" aria-hidden="true">
      <div className="su-paper">
        <div className="su-curl" />
        <div className="su-art" />
      </div>
      <div className="su-roll">
        <i className="su-roll-paper" />
      </div>
      <div className="su-rod">
        <i className="su-cap t" />
        <i className="su-cap b" />
        <i className="su-ribbon t-l" />
        <i className="su-ribbon t-r" />
        <i className="su-ribbon b-l" />
        <i className="su-ribbon b-r" />
      </div>
      <div className="su-shadow" />
    </div>
  )
}
