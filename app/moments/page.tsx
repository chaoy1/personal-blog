'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAuth } from '@/lib/auth-context'
import { useMoments } from '@/lib/moments-context'
import Avatar from '@/components/Avatar'
import CommentThread from '@/components/CommentThread'
import ArticleNav from '@/components/ArticleNav'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import type { MomentItem } from '@/lib/store-types'
import '../moments.css'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const FULL_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/** 把 ISO 时间拆成日期栏要的年 / 月 / 日三行 */
function dateParts(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { day: '--', month: '', year: iso, label: iso, tail: iso }
  }
  const month = date.getMonth()
  return {
    day: pad(date.getDate()),
    month: MONTHS[month],
    year: String(date.getFullYear()),
    label: `${date.getFullYear()}年${month + 1}月${date.getDate()}日`,
    tail: `${FULL_MONTHS[month]} · ${pad(date.getDate())}`,
  }
}

/** 保留作者写在正文里的换行，空行不占位 */
function contentParagraphs(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function MomentsPage() {
  const { user } = useAuth()
  const {
    isOwner,
    moments,
    momentComments,
    momentLikes,
    error,
    ready,
    hasData,
    isInitialLoading,
    isRefreshing,
    refreshMoments,
    deleteMoment,
    addMomentComment,
    toggleMomentLike,
  } = useMoments()
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({})
  const [localError, setLocalError] = useState('')
  const { confirm, dialog } = useConfirmDialog()

  const groups = useMemo(() => {
    const grouped = new Map<string, { key: string; year: string; month: string; monthName: string; items: MomentItem[] }>()
    const sorted = [...moments].sort((a,b) => (Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0))
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
    for (const moment of sorted) {
      const date = new Date(moment.created_at), valid = !Number.isNaN(date.getTime())
      const year = valid ? String(date.getFullYear()) : '未注明', month = valid ? pad(date.getMonth()+1) : '--'
      const key = `${year}-${month}`
      if (!grouped.has(key)) grouped.set(key, {key,year,month,monthName:valid ? monthNames[date.getMonth()] : '日期待补',items:[]})
      grouped.get(key)!.items.push(moment)
    }
    return [...grouped.values()]
  }, [moments])
  const years = [...new Set(groups.map(g => g.year))]
  const [activeYear, setActiveYear] = useState('')
  const [expandedYear, setExpandedYear] = useState<string | null | undefined>(undefined)
  const selectedYear = activeYear || years[0]
  const openYear = expandedYear === undefined ? years[0] : expandedYear
  useEffect(() => {
    if (!groups.length) return
    const locate = () => {
      let id = location.hash.slice(1)
      try { id = decodeURIComponent(id) } catch { return }
      const group = groups.find(g => id === `month-${g.key}` || id === `year-${g.year}`)
      if (group) {setActiveYear(group.year);setExpandedYear(group.year);document.getElementById(id)?.scrollIntoView({block:'start'})}
    }
    locate();window.addEventListener('hashchange', locate)
    return () => window.removeEventListener('hashchange', locate)
  }, [groups])

  const pageState = !hasData && isInitialLoading
    ? 'loading'
    : !hasData && error
      ? 'error'
      : hasData && moments.length === 0 && !error
        ? 'empty'
        : 'ready'

  function toggleComments(id: string) {
    setOpenPanels((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }))
  }

  async function remove(id: string) {
    const confirmed = await confirm({
      title: '删去这条闲语？',
      description: '此操作无法撤销。',
      confirmLabel: '确认删除',
    })
    if (!confirmed) return
    setLocalError('')
    const err = await deleteMoment(id)
    if (err) setLocalError(err)
  }

  async function toggleLike(momentId: string) {
    if (!user) return
    setLocalError('')
    const err = await toggleMomentLike(momentId)
    if (err) setLocalError(err)
  }

  async function sendComment(momentId: string) {
    const text = (commentText[momentId] ?? '').trim()
    if (!user || !text) return
    setLocalError('')
    const err = await addMomentComment(momentId, text)
    if (err) {
      setLocalError(err)
      return
    }
    setCommentText((prev) => ({ ...prev, [momentId]: '' }))
  }

  return (
    <div className="wrap">
      <ScrollFX />
      <ArticleNav current="闲语" />

      <main className="moments-page" data-page-state={pageState}>
        <section className="moments-sheet" aria-labelledby="moments-title">
          <div className="top-rule" aria-hidden="true" />
          <header className="moments-hero">
            <div className="hero-copy">
              <div className="hero-overline"><span>卷 02</span><small>THE EVERYDAY NOTES</small></div>
              <h1 id="moments-title"><span className="title">闲语</span><span className="title-tail">日常札记</span></h1>
              <p className="hero-intro">片言只语，<b>也是一日光景。</b></p>
              <div className="hero-index"><span>EST. 2024</span><i aria-hidden="true" /><span>{hasData ? `${pad(moments.length)} NOTES` : 'NOTES'}</span></div>
            </div>
            <div className="hero-art" aria-hidden="true" />
            <span className="hero-stamp" aria-hidden="true">言</span>
            <span className="hero-aside" aria-hidden="true">纸短情长 · 来日续写</span>
          </header>

          <div className="moments-sheet-content">
            <div className="collection-heading"><h2>近来所记<small aria-hidden="true">NOTES / 片刻</small></h2><span>共收录 <b>{hasData ? pad(moments.length) : '—'}</b> 则</span></div>
            <div className="collection-intro"><span>把细碎的光阴，轻轻收进这一页。</span><span>一则闲语 · 一段回声</span></div>

            {!hasData && isInitialLoading ? <p className="moments-empty">正在加载闲语…</p> : null}
            {!hasData && error ? (
              <p className="error-text" role="alert">
                {localError || error}{' '}
                <button type="button" className="link-btn" onClick={() => void refreshMoments()}>
                  重试
                </button>
              </p>
            ) : null}
            {hasData && (error || isRefreshing) ? (
              <p className="error-text" role="status">
                {error || '正在同步闲语…'}
                {error ? (
                  <button type="button" className="link-btn" onClick={() => void refreshMoments()}>
                    重试同步
                  </button>
                ) : null}
              </p>
            ) : null}

            {localError ? <p className="error-text" role="alert">{localError}</p> : null}

            <div className="notes-layout">
              {years.length > 0 ? <aside className="month-rail" aria-label="年份和月份索引"><div className="rail-inner">
                <div className="rail-preface"><small>IN THE MARGINS</small><strong>片刻有声</strong><p>山间一阵风，窗前一盏茶，都是值得记下的日常。</p></div>
                <span className="rail-label">年份 / 月序</span>
                {years.map(year => <div className="year-directory" key={year}>
                  <button type="button" className="year-toggle" aria-pressed={selectedYear === year} aria-expanded={openYear === year} aria-controls={`months-${year}`} onClick={() => {
                    setActiveYear(year); setExpandedYear(openYear === year ? null : year)
                    document.getElementById(`year-${year}`)?.scrollIntoView({ block: 'start', behavior: 'auto' })
                  }}>{year} <small>{pad(groups.filter(g => g.year === year).reduce((n,g) => n+g.items.length,0))} 则</small></button>
                  <div className="year-months" id={`months-${year}`} hidden={openYear !== year}>
                    {groups.filter(g => g.year === year).map(g => <a className="month-link" key={g.key} href={`#month-${g.key}`} onClick={() => {setActiveYear(year);setExpandedYear(year)}}><b>{g.month}</b><span>{g.monthName}</span></a>)}
                  </div>
                </div>)}
                <span className="rail-foot" aria-hidden="true">心有所记 · 日有所思</span>
              </div></aside> : null}
            <div className="moments-list" aria-label="闲语列表" role="region">
              {years.map(year => <div className="year-notes" id={`year-${year}`} key={year}>
                {groups.filter(g => g.year === year).map(group => <section className="month-group" key={group.key} aria-labelledby={`month-${group.key}`}>
                  <h2 className="month-heading" id={`month-${group.key}`}>{group.month}<small>{group.monthName} · {year}</small></h2>
                  <div className="note-list">{group.items.map((m) => {
                const likeCount = momentLikes.filter((l) => l.moment_id === m.id).length
                const liked = user
                  ? momentLikes.some((l) => l.moment_id === m.id && l.user_id === user.id)
                  : false
                const mComments = momentComments.filter((c) => c.moment_id === m.id)
                const date = dateParts(m.created_at)
                const paragraphs = m.content ? contentParagraphs(m.content) : []
                const images = m.images ?? []
                const panelOpen = openPanels[m.id] ?? false
                const canDelete = Boolean(user?.id === m.user_id && isOwner)

                return (
                  <article key={m.id} className="moment reveal" data-moment-id={m.id} data-count={images.length} onPointerMove={event => {
                    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
                    const box = event.currentTarget.getBoundingClientRect()
                    event.currentTarget.style.setProperty('--mx', `${event.clientX-box.left}px`)
                    event.currentTarget.style.setProperty('--my', `${event.clientY-box.top}px`)
                  }}>
                    <div className="date-rail" aria-label={date.label}>
                      <span className="day">{date.day}</span>
                      <span className="month">{date.month}</span>
                      <span className="year">{date.year}</span><span className="date-seal" aria-hidden="true">言</span>
                    </div>

                    <div className="moment-inner">
                      <div className="moment-head">
                        <Avatar className="moment-avatar" src={m.profiles?.avatar_url} />
                        <div className="author">
                          <strong>{m.profiles?.nickname || '旅人'}</strong>
                          <small>MOMENT · 闲语</small>
                        </div>
                        <span className="note-label">一日一记</span>
                        {canDelete ? (
                          <button type="button" className="moment-del" onClick={() => void remove(m.id)}>
                            删除
                          </button>
                        ) : null}
                      </div>

                      <div
                        className={`moment-layout${
                          images.length === 0 ? ' moment-layout--text' : ''
                        }${images.length > 2 ? ' moment-layout--wide' : ''}`}
                      >
                        {paragraphs.length > 0 ? (
                          <div className="moment-body">
                            {paragraphs.map((line, i) => (
                              <p key={i} className="moment-content">{line}</p>
                            ))}
                          </div>
                        ) : null}

                        {images.length > 0 ? <div className="moment-images photos" role="group" aria-label={`${images.length} 张配图`}>
                          {images.map((url, index) => <figure className="photo" key={`${url}-${index}`} hidden={index >= 3}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="闲语配图" loading="lazy" data-lightbox-date={date.label} />
                            {index === 2 && images.length > 3 ? <span className="photo-more" aria-hidden="true">+{images.length-3}</span> : null}
                          </figure>)}
                        </div> : null}

                      </div>

                      <div className="moment-actions">
                        <button
                          type="button"
                          className={`moment-like${liked ? ' liked' : ''}`}
                          onClick={() => void toggleLike(m.id)}
                          disabled={!user}
                          aria-pressed={liked}
                        >
                          <span className="heart" aria-hidden="true">{liked ? '♥' : '♡'}</span>
                          <span className="action-label">喜欢 · {likeCount}</span>
                        </button>
                        <span className="action-separator" aria-hidden="true" />
                        <button
                          type="button"
                          className="moment-comments-toggle"
                          onClick={() => toggleComments(m.id)}
                          aria-expanded={panelOpen}
                          aria-controls={`moment-comments-${m.id}`}
                        >
                          <span className="action-label">回应 · {mComments.length}</span>
                        </button>
                        <span className="action-tail" aria-hidden="true">{date.tail}</span>
                      </div>

                      <div
                        className="moment-comments"
                        id={`moment-comments-${m.id}`}
                        data-panel
                        hidden={!panelOpen}
                      >
                        <CommentThread
                          items={mComments}
                          userId={user?.id ?? null}
                          onReply={(parentId, text) => addMomentComment(m.id, text, parentId)}
                        />
                        {user ? (
                          <form
                            className="moment-comment-form"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void sendComment(m.id)
                            }}
                          >
                            <input
                              type="text"
                              aria-label="评论"
                              value={commentText[m.id] ?? ''}
                              onChange={(e) =>
                                setCommentText((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              placeholder="写下你的回应…"
                              maxLength={300}
                              onKeyDown={(e) => {
                                if (
                                  e.key === 'Enter' &&
                                  !e.nativeEvent.isComposing &&
                                  e.nativeEvent.keyCode !== 229
                                ) {
                                  e.preventDefault()
                                  void sendComment(m.id)
                                }
                              }}
                            />
                            <button
                              type="submit"
                              className="send"
                              disabled={!(commentText[m.id] ?? '').trim()}
                            >
                              寄语
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}</div></section>)}
              </div>)}

              {hasData && moments.length === 0 && !error ? (
                <p className="moments-empty">还没有闲语。</p>
              ) : null}
            </div>

            </div>

            {!user && ready ? (
              <p className="moments-login-tip">
                <Link href="/login">登录</Link> 后可以点赞和评论。
              </p>
            ) : null}
          </div>

          <footer className="colophon">纸短情长 · 来日续写 <b aria-hidden="true">记</b></footer>
        </section>
      </main>
      {dialog}
    </div>
  )
}
