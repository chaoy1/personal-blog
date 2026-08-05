'use client'

import { useEffect, useState } from 'react'
import { SITE_NAME } from '@/lib/site'

/**
 * 首页首次进入：背景像画卷一样自左向右展开。
 * 一张宣纸面覆盖全屏，纸面绘有淡墨山影与题字印章；
 * 卷轴木杆沿纸面顶端从左向右滑过，纸面随之卷出屏幕，露出底下的千里江山。
 * 仅每个会话第一次播放。
 */
const DURATION = 2600

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
    const t = window.setTimeout(() => {
      setActive(false)
      document.documentElement.classList.remove('unfold-live')
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
      <div className="su-paper">
        <div className="su-curl" />
        <div className="su-art" />
        <div className="su-inscription">
          <span className="su-title">
            {SITE_NAME.split('').map((ch, i) => (
              <i key={i} style={{ animationDelay: `${0.35 + i * 0.12}s` }}>
                {ch}
              </i>
            ))}
          </span>
          <span className="su-seal">记</span>
        </div>
        <span className="su-colophon">流光容易把人抛 · 红了樱桃，绿了芭蕉</span>
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
