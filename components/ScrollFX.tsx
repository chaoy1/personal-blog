'use client'

import { useEffect } from 'react'

export default function ScrollFX() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.item'))
    const masthead = document.querySelector<HTMLElement>('.masthead')
    const nav = document.querySelector<HTMLElement>('.site-nav')

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in')
              io.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12 }
      )
      items.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`
        io.observe(el)
      })
    } else {
      items.forEach((el) => el.classList.add('is-in'))
    }

    let raf = 0
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (masthead) {
          masthead.style.transform = `translate3d(0, ${y * 0.28}px, 0)`
          masthead.style.opacity = String(Math.max(0, 1 - y / 420))
        }
        if (nav) nav.classList.toggle('nav-scrolled', y > 10)
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

  return null
}
