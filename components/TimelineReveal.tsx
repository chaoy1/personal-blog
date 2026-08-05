'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'

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

  if (groups.length === 0) return null

  return (
    <>
      <section className="timeline">
        {visible.map((g) => (
          <div key={g.year} className="tl-year-group">
            <div className="tl-year">
              <span>{g.year}</span>
            </div>
            {g.list.map((e) => (
              <article className={`tl-item tl-${e.type} reveal`} key={e.key}>
                <span className="tl-dot" aria-hidden="true" />
                <div className="tl-date">{formatDate(e.created_at)}</div>
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
              </article>
            ))}
          </div>
        ))}
      </section>

      {remaining > 0 ? (
        <div className="timeline-more-wrap">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShown((s) => s + 1)}
          >
            展开更早的时光（还有 {remaining} 年）
          </button>
        </div>
      ) : null}
    </>
  )
}
