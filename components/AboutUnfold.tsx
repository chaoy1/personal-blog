'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * 关于页「展立轴」打开动效的调度。
 *
 * 动画本身全部由 CSS 承担（app/studio.css 里「关于页打开动效：展立轴」一节），
 * 这个组件只做两件事：
 *
 *  1. 每次页面加载只完整播一次。客户端路由再次回到关于页时，在首帧之前给
 *     .about-page 挂上 data-unfold="done" 直接落终态；整页加载（首次进入、
 *     刷新、新开标签）模块是全新的，永远走完整序列 —— 想再看一遍按 F5 就够了。
 *     这是 ScrollFX 里 heroPlayedInThisLoad 的同一套办法。
 *
 *  2. 跳过。动画期间用户一滚动 / 一按键 / 一按下，就落终态，不让人干等。
 *
 * prefers-reduced-motion 不在这里判断：那一条由 studio.css 的媒体查询直接兜住，
 * 于是即使 JS 没跑到、或者用户禁用了 JS，降级依然是对的。
 */
let playedInThisLoad = false

/** 服务端渲染时 useLayoutEffect 没有意义，退回 useEffect 免得 React 告警。 */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** 25 拍 × 96ms = 2400ms；留一点余量再收掉跳过监听。 */
const UNFOLD_MS = 2400
const SKIP_GRACE_MS = 200

export default function AboutUnfold() {
  useIsoLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>('.about-page')
    if (!page) return

    if (playedInThisLoad) {
      page.dataset.unfold = 'done'
      return
    }
    playedInThisLoad = true
  }, [])

  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.about-page')
    if (!page || page.dataset.unfold === 'done') return
    if (typeof window.matchMedia !== 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let settled = false
    let readyAt = 0
    let timer = 0

    const stop = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onSkip)
      window.removeEventListener('keydown', onSkip)
      window.removeEventListener('pointerdown', onSkip)
    }

    const onSkip = () => {
      // 刚进场的那一下（比如路由切换自带的滚动）不算「用户要跳过」
      if (performance.now() - readyAt < SKIP_GRACE_MS) return
      page.dataset.unfold = 'done'
      stop()
    }

    readyAt = performance.now()
    timer = window.setTimeout(stop, UNFOLD_MS + 400)

    window.addEventListener('scroll', onSkip, { passive: true })
    window.addEventListener('keydown', onSkip)
    window.addEventListener('pointerdown', onSkip)

    return stop
  }, [])

  return null
}
