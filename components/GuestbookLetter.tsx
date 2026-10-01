'use client'

import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { formatGuestbookDate, nextGuestbookAccent, type GuestbookAccent } from '@/lib/guestbook-design'

type Props = {
  name: string
  date: string
  number: number
  replyCount: number
  actions: ReactNode
  children: ReactNode
}

export default function GuestbookLetter({ name, date, number, replyCount, actions, children }: Props) {
  const [tone, setTone] = useState<GuestbookAccent | null>(null)
  const letterRef = useRef<HTMLElement>(null)
  const pointerInside = useRef(false)
  const gradient = `gb-fold-${useId().replace(/:/g, '')}`
  const stamp = formatGuestbookDate(date)
  useEffect(() => {
    const letter = letterRef.current
    if (!letter || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      letter.classList.add('arriving')
      observer.disconnect()
    }, { threshold: 0.12 })
    observer.observe(letter)
    return () => observer.disconnect()
  }, [])

  function changeTone() {
    setTone(previous => nextGuestbookAccent(previous))
  }

  function movePointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const card = event.currentTarget
    const box = card.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
    card.style.setProperty('--letter-rx', `${(.5 - y) * 1.1}deg`)
    card.style.setProperty('--letter-ry', `${(x - .5) * 1.5}deg`)
    card.style.setProperty('--letter-mx', `${x * 100}%`)
    card.style.setProperty('--letter-my', `${y * 100}%`)
  }

  return <article
    ref={letterRef}
    className="comment letter crafted-letter"
    data-hover-tone={tone ?? undefined}
    aria-label={`${name}的来信`}
    onAnimationEnd={event => {
      if (event.target === event.currentTarget) event.currentTarget.classList.remove('arriving')
    }}
    onPointerEnter={event => {
      if (event.pointerType === 'touch') return
      pointerInside.current = true
      if (!event.currentTarget.contains(document.activeElement)) changeTone()
    }}
    onPointerLeave={event => {
      pointerInside.current = false
      for (const property of ['--letter-rx', '--letter-ry', '--letter-mx', '--letter-my']) {
        event.currentTarget.style.removeProperty(property)
      }
    }}
    onPointerMove={movePointer}
    onFocus={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !pointerInside.current) changeTone()
    }}
  >
    <span className="letter-backing" aria-hidden="true" />
    <span className="letter-surface" aria-hidden="true" />
    <span className="letter-folio" aria-hidden="true">
      <i>笺</i><b>{String(number).padStart(2, '0')}</b>
    </span>
    <span className="letter-fold" aria-hidden="true">
      <svg viewBox="0 0 60 60">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--fold-shadow)" />
            <stop offset=".55" stopColor="var(--fold-paper)" />
            <stop offset="1" stopColor="var(--fold-light)" />
          </linearGradient>
        </defs>
        <path d="M0 60H60V0Z" fill="var(--paper)" />
        <path d="M0 60L60 0Q51 30 53 52Q25 44 0 60Z" fill={`url(#${gradient})`} />
        <path d="M0 60Q25 44 53 52Q51 30 60 0" fill="none" stroke="var(--line)" strokeWidth=".8" />
      </svg>
    </span>
    <header className="letter-head">
      <span className="avatar" aria-hidden="true">{Array.from(name)[0]}</span>
      <span className="author">{name}<small className="author-tag">山窗来客 · 留笺</small></span>
      <time className="letter-date" dateTime={date} aria-label={stamp.full}>
        <span>{stamp.year}</span><b>{stamp.day}</b>
      </time>
    </header>
    <div className="letter-body">{children}</div>
    <footer className="letter-foot">
      <span>来信 / {String(number).padStart(2, '0')}{replyCount ? ` · ${String(replyCount).padStart(2, '0')} 回信` : ''}</span>
      <div className="letter-actions">{actions}</div>
    </footer>
  </article>
}
