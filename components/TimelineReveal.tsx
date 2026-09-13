'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import {
  PULL,
  displacedBy,
  dragRatio,
  isArmed,
  settleDuration,
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

  /** 把拉拽量写进 CSS 变量；形变全部由样式表按 --drag / --pull 组合 */
  const paint = useCallback((value: number) => {
    const node = pullRef.current
    if (!node) return
    node.style.setProperty('--pull', `${value.toFixed(2)}px`)
    node.style.setProperty('--drag', dragRatio(value).toFixed(3))
  }, [])

  const clearSettle = useCallback(() => {
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  /** 回弹：把当前位移弹回零。释放时的速度直接换成弹簧时长——拽得越狠，回得越久 */
  const springBack = useCallback(
    (velocity: number) => {
      const node = pullRef.current
      if (!node) return
      clearSettle()
      // 用位移（而非原始输入量）决定回弹节奏，这样手感与看到的距离一致
      const distance = displacedBy(pull.current)
      pull.current = 0
      armed.current = false
      node.dataset.armed = 'false'

      const duration = settleDuration(distance, velocity)
      node.style.setProperty('--spring-duration', `${duration}ms`)
      node.style.setProperty('--spring-ease', PULL.settleEase)
      node.dataset.phase = 'settle'
      paint(0)

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
      springBack(velocity)
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

      // 输入量线性累加；位移走曲线——所以越拉越沉，但 p 仍会涨到阈值以上
      pull.current += event.deltaY
      const displacement = displacedBy(pull.current)
      const nextArmed = isArmed(displacement)
      if (nextArmed !== armed.current) {
        armed.current = nextArmed
        node.dataset.armed = String(nextArmed)
      }
      paint(displacement)

      if (nextArmed) {
        release(lastDelta)
        return
      }

      // 停手才回弹：计时器已经在上一步取消过，这里重新挂一个
      idleTimer = window.setTimeout(() => {
        idleTimer = null
        springBack(lastDelta)
      }, 140)
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
