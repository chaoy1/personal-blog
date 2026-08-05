'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import { useAppStore, type CommentItem } from '@/lib/app-store'
import Avatar from '@/components/Avatar'

export default function Comments({ slug }: { slug: string }) {
  const { user, profile, comments, error, addComment } = useAppStore()
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const list = useMemo(
    () =>
      comments
        .filter((c) => c.post_slug === slug)
        .sort((a, b) => (a.created_at > b.created_at ? 1 : -1)),
    [comments, slug]
  )

  async function submit(parentId: string | null) {
    const text = (parentId ? replyContent : content).trim()
    if (!user || !text) return
    setBusy(true)
    setLocalError('')
    const err = await addComment(slug, text, parentId)
    setBusy(false)
    if (err) {
      setLocalError(err)
      return
    }
    setContent('')
    setReplyContent('')
    setReplyTo(null)
  }

  const top = list.filter((c) => !c.parent_id)

  function avatar(c: CommentItem, size: 'sm' | 'md') {
    return <Avatar className={`c-avatar ${size}`} src={c.profiles?.avatar_url} />
  }

  const nickname = profile?.nickname || user?.email?.split('@')[0] || '我'

  return (
    <section className="comments">
      <div className="comments-title">
        <span>评论</span>
        <span className="comments-count">{list.length}</span>
      </div>

      {user ? (
        <div className="comment-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么…（登录状态）"
            rows={3}
          />
          <div className="comment-form-foot">
            <span className="hint">登录身份：{nickname}</span>
            <button
              className="btn btn-sm"
              type="button"
              disabled={busy || !content.trim()}
              onClick={() => submit(null)}
            >
              {busy ? '发布中…' : '发布评论'}
            </button>
          </div>
        </div>
      ) : (
        <p className="comment-login-tip">
          <Link href="/login">登录</Link> 后即可发表评论。
        </p>
      )}

      {error || localError ? <p className="error-text">{localError || error}</p> : null}

      <div className="comment-list">
        {top.length === 0 ? (
          <p className="comment-empty">还没有评论，来坐坐。</p>
        ) : (
          top.map((c) => (
            <div key={c.id} className="comment reveal">
              {avatar(c, 'md')}
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-name">{c.profiles?.nickname || '旅人'}</span>
                  <span className="comment-date">{formatDate(c.created_at)}</span>
                </div>
                <p className="comment-content">{c.content}</p>
                {user ? (
                  <button
                    type="button"
                    className="link-btn comment-reply-btn"
                    onClick={() => setReplyTo(replyTo?.id === c.id ? null : c)}
                  >
                    {replyTo?.id === c.id ? '取消回复' : '回复'}
                  </button>
                ) : null}

                {replyTo?.id === c.id ? (
                  <div className="reply-form">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`回复 ${c.profiles?.nickname || '旅人'}：`}
                      rows={2}
                    />
                    <button
                      className="btn btn-sm"
                      type="button"
                      disabled={busy || !replyContent.trim()}
                      onClick={() => submit(c.id)}
                    >
                      回复
                    </button>
                  </div>
                ) : null}

                {list
                  .filter((r) => r.parent_id === c.id)
                  .map((r) => (
                    <div key={r.id} className="comment reply">
                      {avatar(r, 'sm')}
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-name">{r.profiles?.nickname || '旅人'}</span>
                          <span className="comment-date">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="comment-content">{r.content}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
