'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore } from '@/lib/app-store'
import Avatar from '@/components/Avatar'
import CommentThread from '@/components/CommentThread'

export default function MomentsPage() {
  const {
    user,
    isOwner,
    moments,
    momentComments,
    momentLikes,
    error,
    ready,
    deleteMoment,
    addMomentComment,
    toggleMomentLike,
  } = useAppStore()
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  async function remove(id: string) {
    if (!window.confirm('确定删除这条闲语？')) return
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
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>闲语</span>
      </nav>

      <article className="article">
        <p className="eyebrow">MUSINGS</p>
        <h1>
          闲语
          <span className="article-seal" aria-hidden="true">
            言
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {error || localError ? <p className="error-text">{localError || error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载闲语…</p> : null}

        <div className="moments-list">
          {moments.map((m) => {
            const likeCount = momentLikes.filter((l) => l.moment_id === m.id).length
            const liked = user
              ? momentLikes.some((l) => l.moment_id === m.id && l.user_id === user.id)
              : false
            const mComments = momentComments.filter((c) => c.moment_id === m.id)

            return (
              <div key={m.id} className="moment reveal">
                <div className="moment-head">
                  <Avatar className="moment-avatar" src={m.profiles?.avatar_url} />
                  <div>
                    <span className="moment-name">{m.profiles?.nickname || '旅人'}</span>
                    <span className="moment-date">{formatDate(m.created_at)}</span>
                  </div>
                  {user?.id === m.user_id && isOwner ? (
                    <button type="button" className="link-btn moment-del" onClick={() => remove(m.id)}>
                      删除
                    </button>
                  ) : null}
                </div>
                {m.content ? <p className="moment-content">{m.content}</p> : null}
                {m.images.length > 0 ? (
                  <div className="moment-images">
                    {m.images.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt="闲语配图" />
                    ))}
                  </div>
                ) : null}

                <div className="moment-actions">
                  <button
                    type="button"
                    className={`moment-like${liked ? ' liked' : ''}`}
                    onClick={() => toggleLike(m.id)}
                    disabled={!user}
                  >
                    {liked ? '♥ 已赞' : '♥ 点赞'} · {likeCount}
                  </button>
                  <span className="moment-stat">评论 {mComments.length}</span>
                </div>

                <div className="moment-comments">
                  <CommentThread
                    items={mComments}
                    userId={user?.id ?? null}
                    onReply={(parentId, text) => addMomentComment(m.id, text, parentId)}
                  />
                  {user ? (
                    <div className="moment-comment-form">
                      <input
                        type="text"
                        value={commentText[m.id] ?? ''}
                        onChange={(e) =>
                          setCommentText((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        placeholder="评论一下…"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendComment(m.id)
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => sendComment(m.id)}
                        disabled={busy || !(commentText[m.id] ?? '').trim()}
                      >
                        发送
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {ready && moments.length === 0 && !error ? (
            <p className="moments-empty">还没有闲语。</p>
          ) : null}
        </div>

        {!user && ready ? (
          <p className="moments-login-tip gb-login-tip">
            <Link href="/login">登录</Link> 后可以点赞和评论。
          </p>
        ) : null}
      </article>
    </div>
  )
}
