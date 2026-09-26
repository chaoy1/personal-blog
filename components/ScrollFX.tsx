'use client'

import { useEffect, useLayoutEffect } from 'react'
import useAmbientMotion, { supportsFinePointer } from './useAmbientMotion'

const REVEAL_SELECTOR = '.item, .reveal'
const REVEAL_DELAY_STEP_MS = 70
const REVEAL_DELAY_MAX_STEPS = 3
const REVEAL_TRANSITION_MS = 650

/** 服务端渲染时 useLayoutEffect 没有意义，退回 useEffect 免得 React 告警。 */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

// 首屏完整入场序列在一次「页面加载」里只完整播一次。这个标记活在模块内存里：
// 客户端路由回到首页时它还是 true，于是那一次只重播「开卷 + 落墨」；而整页加载
// （首次进入、刷新、新标签页）模块是全新的，永远走完整序列 —— 想再看一遍完整版，
// 按 F5 就够了，不必去清缓存。
let heroPlayedInThisLoad = false

/**
 * 滚动与入场动效：
 * 1. IntersectionObserver 让 .item / .reveal 元素进入视口时浮现（含错落延迟）
 * 2. MutationObserver 监听后续插入的节点（闲语、评论等异步内容同样生效）
 * 3. 首页 masthead 视差、导航栏滚动态
 * 4. 卡片上的「墨光」：悬停时一团淡墨光晕跟随指针（--mx/--my）
 */
export default function ScrollFX() {
  const active = useAmbientMotion()

  // 客户端路由回到首页时，赶在首帧绘制前把 hero-revisit 挂到根节点上，
  // 否则会先闪一下完整序列再跳到短版。ScrollFX 也挂在别的页面上，所以要先
  // 确认当前确实是首页；整页加载时这里是本次加载的第一次，不挂，走完整序列。
  useIsoLayoutEffect(() => {
    if (!document.querySelector('.home-page')) return
    if (heroPlayedInThisLoad) {
      document.documentElement.classList.add('hero-revisit')
    } else {
      heroPlayedInThisLoad = true
    }
  }, [])

  useEffect(() => {
    if (active === null) return

    const masthead = document.querySelector<HTMLElement>('.masthead')
    const nav = document.querySelector<HTMLElement>('.site-nav')
    const root = document.documentElement

    const syncNav = () => nav?.classList.toggle('nav-scrolled', window.scrollY > 10)

    if (!active) {
      root.classList.add('motion-static')
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => el.classList.add('is-in'))

      const onStaticScroll = () => syncNav()
      window.addEventListener('scroll', onStaticScroll, { passive: true })
      syncNav()

      return () => {
        window.removeEventListener('scroll', onStaticScroll)
        root.classList.remove('motion-static')
      }
    }

    root.classList.remove('motion-static')

    // ---------- 入场浮现 ----------
    let io: IntersectionObserver | null = null
    const seen = new WeakSet<HTMLElement>()
    const transitionTimers = new Set<number>()

    const observe = (el: HTMLElement) => {
      if (seen.has(el)) return
      seen.add(el)
      if (!io) {
        el.classList.add('is-in')
        el.classList.add('is-settled')
        return
      }
      // 按观察顺序给一个轻微错落延迟，最多错开三步，避免长列表越等越久。
      const siblings = el.parentElement
        ? Array.from(el.parentElement.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
        : [el]
      const idx = Math.max(0, siblings.indexOf(el))
      el.style.transitionDelay = `${Math.min(idx, REVEAL_DELAY_MAX_STEPS) * REVEAL_DELAY_STEP_MS}ms`
      io.observe(el)
    }

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) observe(root)
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(observe)
    }

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement
              el.classList.add('is-in')
              io?.unobserve(el)
              // 动画完成后清掉延迟，避免影响后续的 hover 过渡
              const delayMs = Number.parseFloat(el.style.transitionDelay) || 0
              const timer = window.setTimeout(() => {
                el.style.transitionDelay = ''
                el.classList.add('is-settled')
                transitionTimers.delete(timer)
              }, REVEAL_TRANSITION_MS + delayMs)
              transitionTimers.add(timer)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }
      )
      // Hide list cards only after the observer is ready to reveal them.
      root.classList.add('motion-ready')
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
      const target = (e.target as HTMLElement | null)?.closest?.('.item, .posts-page .entry')
      if (!(target instanceof HTMLElement)) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      target.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
    }
    const trackPointer = supportsFinePointer()
    if (trackPointer) window.addEventListener('pointermove', onPointerMove, { passive: true })

    // ---------- masthead 视差 + 导航滚动态 ----------
    let raf = 0
    let ticking = false

    const onScroll = () => {
      syncNav()
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (masthead) {
          masthead.style.setProperty('--home-hero-scroll-y', `${y * 0.28}px`)
          masthead.style.opacity = String(Math.max(0, 1 - y / 420))
        }
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (trackPointer) window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(raf)
      transitionTimers.forEach((timer) => window.clearTimeout(timer))
      if (masthead) {
        masthead.style.removeProperty('--home-hero-scroll-y')
        masthead.style.opacity = ''
      }
      mo.disconnect()
      io?.disconnect()
      root.classList.remove('motion-ready')
    }
  }, [active])

  return null
}
