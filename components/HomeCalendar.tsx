'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Solar } from 'lunar-javascript'
import { useAppStore } from '@/lib/app-store'

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

type PostMeta = { id: string; title: string; created_at: string }

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function HomeCalendar({ posts }: { posts: PostMeta[] }) {
  const { moments, photos } = useAppStore()
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  const marks = useMemo(() => {
    const map = new Map<string, { count: number; kinds: Set<string> }>()
    const add = (iso: string, kind: string) => {
      const k = dayKey(new Date(iso))
      if (!map.has(k)) map.set(k, { count: 0, kinds: new Set() })
      const m = map.get(k)!
      m.count += 1
      m.kinds.add(kind)
    }
    for (const p of posts) add(p.created_at, 'post')
    for (const m of moments) add(m.created_at, 'moment')
    for (const p of photos) add(p.created_at, 'photo')
    return map
  }, [posts, moments, photos])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const lunar = Solar.fromDate(cursor).getLunar()
  const monthLunar = `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月`

  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const todayKey = dayKey(new Date())
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month

  return (
    <div className="home-calendar">
      <div className="hc-head">
        <button
          type="button"
          className="hc-nav"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="上个月"
        >
          ‹
        </button>
        <div className="hc-title">
          <span className="hc-month">
            {year}年{month + 1}月
          </span>
          <span className="hc-lunar">{monthLunar}</span>
        </div>
        <button
          type="button"
          className="hc-nav"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="下个月"
        >
          ›
        </button>
      </div>

      <div className="hc-week">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="hc-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`empty-${i}`} className="hc-cell empty" />
          const k = dayKey(d)
          const mark = marks.get(k)
          const isToday = k === todayKey
          return (
            <span
              key={k}
              className={`hc-cell${mark ? ' has-rec' : ''}${isToday && isCurrentMonth ? ' today' : ''}`}
              title={mark ? `这天有 ${mark.count} 条记录` : undefined}
            >
              {d.getDate()}
              {mark ? (
                <span className="hc-dots">
                  {mark.kinds.has('post') ? <i className="hc-dot post" /> : null}
                  {mark.kinds.has('moment') ? <i className="hc-dot moment" /> : null}
                  {mark.kinds.has('photo') ? <i className="hc-dot photo" /> : null}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>

      <div className="hc-legend">
        <span><i className="hc-dot post" />文章</span>
        <span><i className="hc-dot moment" />说说</span>
        <span><i className="hc-dot photo" />照片</span>
      </div>

      <div className="hc-foot">
        <Link href="/timeline">时光记录 · 时间轴 →</Link>
      </div>
    </div>
  )
}
