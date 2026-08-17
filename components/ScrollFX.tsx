'use client'

import { useEffect } from 'react'
import useAmbientMotion, { supportsFinePointer } from './useAmbientMotion'

const REVEAL_SELECTOR = '.item, .reveal'

/**
 * 滚动与入场动效：
 * 1. IntersectionObserver 让 .item / .reveal 元素进入视口时浮现（含错落延迟）
 * 2. MutationObserver 监听后续插入的节点（闲语、评论等异步内容同样生效）
 * 3. 首页 masthead 视差、导航栏滚动态
 * 4. 卡片上的「墨光」：悬停时一团淡墨光晕跟随指针（--mx/--my）
 */
export default function ScrollFX() {
  const active = useAmbientMotion()

  useEffect(() => {
    const masthead = document.querySelector<HTMLElement>('.masthead')
    const nav = document.querySelector<HTMLElement>('.site-nav')
    const reduced = !active

    // ---------- 入场浮现 ----------
    let io: IntersectionObserver | null = null
    const seen = new WeakSet<HTMLElement>()
    const transitionTimers = new Set<number>()

    const observe = (el: HTMLElement) => {
      if (seen.has(el)) return
      seen.add(el)
      if (reduced || !io) {
        el.classList.add('is-in')
        return
      }
      // 按观察顺序给一个轻微错落延迟，成组元素依次浮现（节奏放缓，避免同帧堆叠）
      const siblings = el.parentElement
        ? Array.from(el.parentElement.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
        : [el]
      const idx = Math.max(0, siblings.indexOf(el))
      el.style.transitionDelay = `${Math.min(idx, 5) * 105}ms`
      io.observe(el)
    }

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) observe(root)
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(observe)
    }

    if ('IntersectionObserver' in window && active) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement
              el.classList.add('is-in')
              io?.unobserve(el)
              // 动画完成后清掉延迟，避免影响后续的 hover 过渡
              const timer = window.setTimeout(() => {
                el.style.transitionDelay = ''
                transitionTimers.delete(timer)
              }, 1300)
              transitionTimers.add(timer)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }
      )
    }

    scan(document)

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    // ---------- 卡片墨光跟随 ----------
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const target = (e.target as HTMLElement | null)?.closest?.('.item')
      if (!(target instanceof HTMLElement)) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      target.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
    }
    const trackPointer = active && supportsFinePointer()
    if (trackPointer) window.addEventListener('pointermove', onPointerMove, { passive: true })

    // ---------- masthead 视差 + 导航滚动态 ----------
    let raf = 0
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (masthead && !reduced) {
          masthead.style.transform = `translate3d(0, ${y * 0.28}px, 0)`
          masthead.style.opacity = String(Math.max(0, 1 - y / 420))
        }
        if (nav) nav.classList.toggle('nav-scrolled', y > 10)
        ticking = false
      })
    }

    if (active) {
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
    }

    return () => {
      if (active) window.removeEventListener('scroll', onScroll)
      if (trackPointer) window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(raf)
      transitionTimers.forEach((timer) => window.clearTimeout(timer))
      if (masthead) {
        masthead.style.transform = ''
        masthead.style.opacity = ''
      }
      mo.disconnect()
      io?.disconnect()
    }
  }, [active])

  return null
}
