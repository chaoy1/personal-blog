'use client'

import React, { useEffect, useState } from 'react'

import { shouldPlayFullUnfold } from '@/lib/motion-policy'

const UNFOLD_DURATION_MS = 3600
const CONTENT_COMPLETE_MS = 4200

export default function ScrollUnfold() {
  // 服务端首屏就渲染画卷，避免 hydration 后才插入遮罩造成闪现。
  const [active, setActive] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame: number | undefined
    let unfoldTimer: number | undefined
    let contentTimer: number | undefined

    if (!shouldPlayFullUnfold({ reduced, storedVersion: null })) {
      setActive(false)
      return () => root.classList.remove('unfold-live', 'unfold-returning')
    }

    const startUnfold = () => {
      animationFrame = window.requestAnimationFrame(() => {
        root.classList.add('unfold-live')
        setActive(true)

        unfoldTimer = window.setTimeout(() => {
          setActive(false)
        }, UNFOLD_DURATION_MS)

        contentTimer = window.setTimeout(() => {
          root.classList.remove('unfold-live')
        }, CONTENT_COMPLETE_MS)
      })
    }

    const whenInteractive = () => {
      if (document.readyState !== 'loading') {
        document.removeEventListener('readystatechange', whenInteractive)
        startUnfold()
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('readystatechange', whenInteractive)
    } else {
      startUnfold()
    }

    return () => {
      document.removeEventListener('readystatechange', whenInteractive)
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
      if (unfoldTimer !== undefined) window.clearTimeout(unfoldTimer)
      if (contentTimer !== undefined) window.clearTimeout(contentTimer)
      root.classList.remove('unfold-live', 'unfold-returning')
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
