'use client'

import { useState, type CSSProperties, type PointerEvent } from 'react'
import Link from 'next/link'

export function AboutPortrait({ src, name }: { src: string | null; name: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className={`about-preface-portrait${loaded && !failed ? ' about-preface-loaded' : ''}`}>
      <span className="about-preface-portrait-monogram" aria-hidden={Boolean(src && !failed)} role={src && !failed ? undefined : 'img'} aria-label={src && !failed ? undefined : '博主头像'}>{Array.from(name)[0] || '记'}</span>
      {src && !failed ? <img src={src} alt="博主头像" width={100} height={100} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} /> : null}
      <span className="about-preface-portrait-caption">小屋主人</span>
      <span className="about-preface-portrait-seal" aria-hidden="true">署</span>
    </div>
  )
}

type CollectionProps = { href: string; accent: string; tab: string; scene: string; index: string; title: string; description: string; action: string }

export function AboutCollectionCard({ href, accent, tab, scene, index, title, description, action }: CollectionProps) {
  const clearTilt = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.removeProperty('--rx')
    event.currentTarget.style.removeProperty('--ry')
  }
  const tilt = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
    event.currentTarget.style.setProperty('--rx', `${(.5 - y) * 1.4}deg`)
    event.currentTarget.style.setProperty('--ry', `${(x - .5) * 1.8}deg`)
  }
  return (
    <Link className="about-preface-collection" href={href} style={{ '--accent': accent } as CSSProperties} onPointerMove={tilt} onPointerLeave={clearTilt}>
      <span className="about-preface-card-backing" aria-hidden="true" />
      <span className="about-preface-card-tab" aria-hidden="true">{tab}</span>
      <div className={`about-preface-card-scene about-preface-scene-${scene}`} aria-hidden="true" />
      <div className="about-preface-card-copy"><small>{index}</small><h3>{title}</h3><p>{description}</p><span className="about-preface-card-action">{action}<b aria-hidden="true">↗</b></span></div>
      <span className="about-preface-card-fold" aria-hidden="true" />
    </Link>
  )
}
