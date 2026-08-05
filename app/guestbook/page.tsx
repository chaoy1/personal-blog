'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore, type GuestbookItem } from '@/lib/app-store'
import Avatar from '@/components/Avatar'

const PAGE_SIZE = 20

export default function GuestbookPage() {
  const { user, profile, guestbook, ready, error, addGuestbook, deleteGuestbook } = useAppStore()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<GuestbookItem | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const parents = useMemo(
    () => guestbook.filter((g) => !g.parent_id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [guestbook]
  )
  const totalPages = Math.max(1, Math.ceil(parents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = parents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const repliesOf = (parentId: string) =>
    guestbook
      .filter((g) => g.parent_id === parentId)
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))

  async function post(parentId?: string | null) {
    const text = (parentId ? replyContent : content).trim()
    if (!user || !text) return
    setBusy(true)
    setLocalError('')
    const err = await addGuestbook(text, parentId ?? null)
    setBusy(false)
    if (err) {
      setLocalError(err)
      return
    }
    setContent('')
    setReplyContent('')
    setReplyTo(null)
    if (!parentId) setPage(1)
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条留言？')) return
    setLocalError('')
    const err = await deleteGuestbook(id)
    if (err) setLocalError(err)
  }

  const nickname = profile?.nickname || user?.email?.split('@')[0] || '我'

  return (
    <div className="wrap">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>留言</span>
      </nav>

      <article className="article">
        <p className="eyebrow">GUESTBOOK</p>
        <h1>
          留言
          <span className="article-seal" aria-hidden="true">
            留
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {user ? (
          <div className="moments-composer">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`以「${nickname}」的身份留下几句话…`}
              maxLength={500}
            />
            <div className="moments-actions">
              <span className="moments-counter">{content.length}/500</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => post(null)}
                disabled={busy || !content.trim()}
              >
                {busy ? '处理中…' : '留言'}
              </button>
            </div>
          </div>
        ) : (
          <p className="moments-login-tip">
            <Link href="/login">登录</Link> 后即可留言和回复。
          </p>
        )}

        {error || localError ? <p className="error-text">{localError || error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载留言…</p> : null}

        <div className="comment-list guestbook-list">
          {pageItems.map((m) => {
            const replies = repliesOf(m.id)
            return (
              <div key={m.id} className="comment reveal">
                <Avatar className="c-avatar md" src={m.profiles?.avatar_url} />
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-name">{m.profiles?.nickname || '旅人'}</span>
                    <span className="comment-date">{formatDate(m.created_at)}</span>
                    {user ? (
                      <button
                        type="button"
                        className="link-btn comment-reply-btn"
                        onClick={() => setReplyTo(replyTo?.id === m.id ? null : m)}
                      >
                        {replyTo?.id === m.id ? '取消回复' : '回复'}
                      </button>
                    ) : null}
                    {user?.id === m.user_id ? (
                      <button type="button" className="link-btn guestbook-del" onClick={() => remove(m.id)}>
                        删除
                      </button>
                    ) : null}
                  </div>
                  <p className="comment-content">{m.content}</p>

                  {replyTo?.id === m.id ? (
                    <div className="reply-form">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`回复 ${m.profiles?.nickname || '旅人'}：`}
                        rows={2}
                        maxLength={500}
                      />
                      <button
                        className="btn btn-sm"
                        type="button"
                        disabled={busy || !replyContent.trim()}
                        onClick={() => post(m.id)}
                      >
                        回复
                      </button>
                    </div>
                  ) : null}

                  {replies.length > 0 ? (
                    <div className="comment-replies">
                      {replies.map((r) => (
                        <div key={r.id} className="comment reply">
                          <Avatar className="c-avatar sm" src={r.profiles?.avatar_url} />
                          <div className="comment-body">
                            <div className="comment-meta">
                              <span className="comment-name">{r.profiles?.nickname || '旅人'}</span>
                              <span className="comment-date">{formatDate(r.created_at)}</span>
                              {user?.id === r.user_id ? (
                                <button
                                  type="button"
                                  className="link-btn guestbook-del"
                                  onClick={() => remove(r.id)}
                                >
                                  删除
                                </button>
                              ) : null}
                            </div>
                            <p className="comment-content">{r.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {ready && parents.length === 0 && !error ? (
            <p className="moments-empty">还没有人留言，来写第一句吧。</p>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="pager">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              ← 上一页
            </button>
            <span className="pager-info">
              第 {safePage} / {totalPages} 页 · 共 {parents.length} 条
            </span>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              下一页 →
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}
