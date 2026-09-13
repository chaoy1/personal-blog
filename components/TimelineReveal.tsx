'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import {
  PULL,
  advance,
  dragRatio,
  isArmed,
  quantize,
  settleDuration,
  stepIndex,
  settleEase,
  tensionToNextStep,
} from '@/lib/timeline-pull'
import './TimelineReveal.css'

export type TimelineEntry = {
  key: string
  type: 'post' | 'photo' | 'moment'
  title: string
  excerpt: string
  image?: string
  href: string
  created_at: string
}

export default function TimelineReveal({ entries }: { entries: TimelineEntry[] }) {
  const groups = useMemo(() => {
    const map = new Map<number, TimelineEntry[]>()
    for (const e of entries) {
      const y = new Date(e.created_at).getFullYear() || 0
      if (!map.has(y)) map.set(y, [])
      map.get(y)!.push(e)
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, list]) => ({ year, list }))
  }, [entries])

  const [shown, setShown] = useState(1)
  const visible = groups.slice(0, shown)
  const remaining = groups.length - shown

  const pullRef = useRef<HTMLDivElement>(null)
  const pull = useRef(0)
  const armed = useRef(false)
  /** 一次展开只触发一次：置位后到新内容渲染完成前不再响应下拉 */
  const released = useRef(false)
  const settleTimer = useRef<number | null>(null)
  const revealTimer = useRef<number | null>(null)
  const [revealing, setRevealing] = useState(false)

  const hasMore = remaining > 0

  /**
   * 把当前手感写进 CSS 变量。
   * --pull    : 台阶量化后的位移，形变主体
   * --drag    : 归一化程度 0–1，驱动投影/旋转/透明度
   * --tension : 顶住下一格的紧绷程度 0–1，到位前先拉紧再跳，节奏就出来了
   * --step    : 当前第几格，供样式做顿挫相关的微调
   */
  const paint = useCallback((displacement: number, tension: number, steps: number) => {
    const node = pullRef.current
    if (!node) return
    node.style.setProperty('--pull', `${displacement.toFixed(2)}px`)
    node.style.setProperty('--drag', dragRatio(displacement).toFixed(3))
    node.style.setProperty('--tension', Math.min(1, Math.max(0, tension)).toFixed(3))
    // 台阶序号要与 tension 同一口径（用 stepIndex，不是位移除步长），
    // 否则张力已经归零进入下一格、序号还停在上一格。
    node.style.setProperty('--step', String(steps))
  }, [])

  const clearSettle = useCallback(() => {
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  /** 回弹：把当前台阶弹回零。节奏由"拉了几格 + 松手快慢"共同决定 */
  const springBack = useCallback(
    (velocity: number, releasing = false) => {
      const node = pullRef.current
      if (!node) return
      clearSettle()
      // 用当前台阶位置（而非原始输入量）决定回弹节奏，手感才与看到的距离一致
      const distance = quantize(pull.current)
      pull.current = 0
      armed.current = false
      node.dataset.armed = 'false'

      const duration = settleDuration(distance, velocity, releasing)
      node.style.setProperty('--spring-duration', `${duration}ms`)
      node.style.setProperty('--spring-ease', settleEase(releasing))
      node.dataset.phase = 'settle'
      node.dataset.releasing = releasing ? 'true' : 'false'
      paint(0, 0, 0)

      settleTimer.current = window.setTimeout(() => {
        if (pullRef.current) pullRef.current.dataset.phase = ''
        settleTimer.current = null
      }, duration + 40)
    },
    [clearSettle, paint],
  )

  /** 到达阈值：展开上一年，并把纸签弹回 */
  const release = useCallback(
    (velocity: number) => {
      // 展开过程中不再重复触发。松开阈值后组件会重渲染，
      // 重渲染本身又会跑一遍这个回调——没有这道闸，刚归零的拉拽量会被再清一次，
      // 表现就是"拉到位了却什么都没发生，还得重拉"。
      if (released.current) return
      released.current = true
      setRevealing(true)
      springBack(velocity, true)
      // 归零在这里显式做一次（不要用"跟着 shown 变化再归零"的 effect，
      // 那会在连续下拉的过程中清掉已积累的量）。
      pull.current = 0
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current)
      revealTimer.current = window.setTimeout(() => {
        setShown((s) => Math.min(groups.length, s + 1))
        setRevealing(false)
        revealTimer.current = null
        // 新内容渲染完再解锁，允许继续往下拉
        released.current = false
      }, Math.round(PULL.unfoldMs * 0.42))
    },
    [groups.length, springBack],
  )

  const click = useCallback(() => {
    if (!hasMore) return
    release(0)
  }, [hasMore, release])

  /**
   * 滚轮拉拽。
   * 只在"已经滚到页面底部、且还有旧卷"时接管：把继续下滑的滚轮量
   * 转成纸签位移，而不是让它去滚页面（此时本来也无处可滚）。
   * 向上滚不拦截，正常往上走。
   */
  useEffect(() => {
    if (!hasMore) return
    const node = pullRef.current
    if (!node) return
    // 系统已要求减少动效：不接管滚轮，退回"点一下展开"
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let lastDelta = 0
    let lastTime = 0
    let idleTimer: number | null = null

    const atBottom = () => {
      const doc = document.documentElement
      return window.innerHeight + window.scrollY >= doc.scrollHeight - 2
    }

    const onWheel = (event: WheelEvent) => {
      if (!atBottom()) return
      // 正在展开：这段时间不响应下拉
      if (released.current) {
        if (event.deltaY > 0) event.preventDefault()
        return
      }
      // 向上滚：交回页面，并顺带把已有的拉拽量弹回
      if (event.deltaY < 0) {
        if (pull.current > 0) {
          event.preventDefault()
          springBack(event.deltaY)
        }
        return
      }
      // 向下滚：接管，转成拉拽
      event.preventDefault()
      // 关键：先取消待发的回弹。否则上一条事件的 140ms 计时器会在
      // 连续下拉的过程中触发，把已积累的拉拽量清掉（拉拽量会周期性归零，
      // 于是永远到不了阈值）。
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
      clearSettle()
      node.dataset.phase = ''
      lastDelta = event.deltaY

      // 速度阻尼：间隔越短（甩得越猛），这一下推进得越少
      const now = typeof event.timeStamp === 'number' && event.timeStamp > 0 ? event.timeStamp : performance.now()
      const deltaMs = lastTime > 0 ? now - lastTime : 16
      lastTime = now

      pull.current = advance(pull.current, event.deltaY, deltaMs)
      // 台阶量化：位移一格一格跳，中间靠 --tension 表现"顶住"的张力
      const displacement = quantize(pull.current)
      const nextArmed = isArmed(displacement)
      if (nextArmed !== armed.current) {
        armed.current = nextArmed
        node.dataset.armed = String(nextArmed)
      }
      paint(displacement, tensionToNextStep(pull.current), stepIndex(pull.current))

      if (nextArmed) {
        release(lastDelta)
        return
      }

      // 停手才回弹。这个停顿本身就是节奏的一部分：
      // 拉 → 顿一下 → 弹回 → 再拉，所以间隔给得比"帧级"长一点。
      idleTimer = window.setTimeout(() => {
        idleTimer = null
        springBack(lastDelta)
      }, 260)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (idleTimer !== null) window.clearTimeout(idleTimer)
    }
  }, [clearSettle, hasMore, paint, release, springBack, shown])

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current)
    },
    [],
  )

  if (groups.length === 0) return null

  return (
    <>
      <section className="timeline">
        {visible.map((g) => (
          <div key={g.year} className="tl-year-group">
            {/* 新展出的那一卷从上方翻下来；首帧的 2026 不参与动画 */}
            <div className={`tl-year${g.year === visible[visible.length - 1]?.year && shown > 1 ? ' timeline-year-enter' : ''}`}>
              <span>{g.year}</span>
            </div>
            {g.list.map((e) => (
              <article className={`tl-item tl-${e.type} reveal`} key={e.key}>
                <div className="tl-date">{formatDate(e.created_at)}</div>
                <div className="tl-track">
                  <span className="tl-dot" aria-hidden="true" />
                  <div className="tl-card">
                    <span className={`tl-tag tl-tag-${e.type}`} aria-hidden="true">
                      {e.type === 'post' ? '文' : e.type === 'photo' ? '影' : '言'}
                    </span>
                    <div className="tl-body">
                      {e.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="tl-thumb" src={e.image} alt={e.title} loading="lazy" />
                      ) : null}
                      <div className="tl-text">
                        <span className="tl-kicker">
                          {e.type === 'post' ? 'ARTICLE · 文章' : e.type === 'photo' ? 'FRAME · 光影' : 'MOMENT · 闲语'}
                        </span>
                        {e.type === 'post' ? (
                          <Link className="tl-title" href={e.href}>
                            {e.title}
                          </Link>
                        ) : (
                          <span className="tl-title">{e.title}</span>
                        )}
                        {e.excerpt ? <p className="tl-excerpt">{e.excerpt}</p> : null}
                        <Link className="tl-more" href={e.href}>
                          {e.type === 'post' ? '阅读全文 →' : '查看全部 →'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}
      </section>

      {hasMore ? (
        <div className="timeline-more-wrap">
          <div
            className="timeline-pull"
            ref={pullRef}
            data-phase=""
            data-armed="false"
            data-revealing={revealing ? 'true' : 'false'}
          >
            <button type="button" className="timeline-unfold" onClick={click}>
              <span className="timeline-unfold-seal" aria-hidden="true">续</span>
              <span className="timeline-unfold-copy">
                <b>续展旧卷</b>
                <small>尚余 {remaining} 年时光</small>
              </span>
              <span className="timeline-unfold-arrow" aria-hidden="true">↓</span>
            </button>
            <span className="timeline-pull-hint" aria-hidden="true">继续下拉，旧卷自展</span>
          </div>
        </div>
      ) : null}
    </>
  )
}
