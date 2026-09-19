'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAuth } from '@/lib/auth-context'
import { useMoments } from '@/lib/moments-context'
import Avatar from '@/components/Avatar'
import CommentThread from '@/components/CommentThread'
import ArticleNav from '@/components/ArticleNav'
import { useConfirmDialog } from '@/components/ConfirmDialog'
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

  const pageState = !hasData && isInitialLoading
    ? 'loading'
    : !hasData && error
      ? 'error'
      : hasData && moments.length === 0 && !error
        ? 'empty'
        : 'ready'

  function toggleComments(id: string) {
    setOpenPanels((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
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
          <header className="moments-hero">
            <div className="moments-hero-wash" aria-hidden="true" />
            <span className="moments-postmark" aria-hidden="true">
              COLLECTED
              <br />
              NOTES
            </span>
            <div className="moments-hero-copy">
              <p className="moments-hero-meta">
                <span>卷 02</span>
                <i aria-hidden="true" />
                <small>MUSINGS</small>
              </p>
              <h1 className="moments-hero-title" id="moments-title">
                <span className="moments-hero-char">闲</span>
                <span className="moments-hero-char">语</span>
                <span className="article-seal" aria-hidden="true">言</span>
              </h1>
              <p className="moments-hero-lede">片言只语，也是一日光景。</p>
              <span className="moments-hero-rule" aria-hidden="true" />
            </div>
          </header>

          <div className="moments-sheet-content">
            <div className="collection-heading">
              <h2>近来所记</h2>
              <span>
                {hasData ? `${pad(moments.length)} NOTES　·　按时序展卷` : 'NOTES　·　按时序展卷'}
              </span>
            </div>

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

            <div className="moments-list" aria-label="闲语列表" role="region">
              {moments.map((m) => {
                const likeCount = momentLikes.filter((l) => l.moment_id === m.id).length
                const liked = user
                  ? momentLikes.some((l) => l.moment_id === m.id && l.user_id === user.id)
                  : false
                const mComments = momentComments.filter((c) => c.moment_id === m.id)
                const date = dateParts(m.created_at)
                const paragraphs = m.content ? contentParagraphs(m.content) : []
                const images = m.images ?? []
                const panelOpen = openPanels[m.id] ?? true
                const canDelete = Boolean(user?.id === m.user_id && isOwner)

                return (
                  <article key={m.id} className="moment reveal" data-moment-id={m.id}>
                    <div className="date-rail" aria-label={date.label}>
                      <span className="day">{date.day}</span>
                      <span className="month">{date.month}</span>
                      <span className="year">{date.year}</span>
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

                        {images.length === 1 ? (
                          <figure className="photo-leaf">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={images[0]}
                              alt="闲语配图"
                              data-lightbox-date={date.label}
                            />
                            <figcaption>{date.tail}</figcaption>
                          </figure>
                        ) : null}

                        {images.length === 2 ? (
                          <div className="paired-photos">
                            {images.map((u, i) => (
                              <figure key={i}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={u}
                                  alt="闲语配图"
                                  data-lightbox-date={date.label}
                                />
                                <figcaption>{`${date.month} · ${pad(i + 1)}`}</figcaption>
                              </figure>
                            ))}
                          </div>
                        ) : null}

                        {images.length > 2 ? (
                          <div className="moment-images" data-count={images.length}>
                            {images.map((u, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={u}
                                alt="闲语配图"
                                data-lightbox-date={date.label}
                              />
                            ))}
                          </div>
                        ) : null}
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
                          喜欢 · {likeCount}
                        </button>
                        <span className="action-separator" aria-hidden="true" />
                        <button
                          type="button"
                          className="moment-comments-toggle"
                          onClick={() => toggleComments(m.id)}
                          aria-expanded={panelOpen}
                          aria-controls={`moment-comments-${m.id}`}
                        >
                          评论 · {mComments.length}
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
              })}

              {hasData && moments.length === 0 && !error ? (
                <p className="moments-empty">还没有闲语。</p>
              ) : null}
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
