'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'

export default function Comments({ slug }: { slug: string }) {
  const { user, comments, error, addComment } = useAppStore()
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const list = useMemo(
    () =>
      comments
        .filter((c) => c.post_slug === slug)
        .sort((a, b) => (a.created_at > b.created_at ? 1 : -1)),
    [comments, slug]
  )

  async function submit() {
    const text = content.trim()
    if (!user || !text) return
    setBusy(true)
    setLocalError('')
    const err = await addComment(slug, text, null)
    setBusy(false)
    if (err) {
      setLocalError(err)
      return
    }
    setContent('')
    setComposeOpen(false)
  }

  return (
    <section className="comments">
      <div className="comments-title">
        <span>评论</span>
        <span className="comments-count">{list.length}</span>
      </div>

      {error || localError ? <p className="error-text">{localError || error}</p> : null}

      {/* 评论内容优先展示 */}
      <div className="comment-list">
        <CommentThread
          items={list}
          userId={user?.id ?? null}
          busy={busy}
          emptyText="还没有评论，来坐坐。"
          onReply={(parentId, text) => addComment(slug, text, parentId)}
        />
      </div>

      {/* 编写入口收起在评论之后，点开才占据视觉中心 */}
      <div className="gb-compose">
        {user ? (
          composeOpen ? (
            <div className="comment-form gb-composer">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="说点什么…"
                rows={3}
                autoFocus
              />
              <div className="comment-form-foot">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setComposeOpen(false)
                    setContent('')
                  }}
                >
                  收起
                </button>
                <button
                  className="btn btn-sm"
                  type="button"
                  disabled={busy || !content.trim()}
                  onClick={submit}
                >
                  {busy ? '发布中…' : '发布评论'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm gb-compose-open"
              onClick={() => setComposeOpen(true)}
            >
              ✎ 写评论
            </button>
          )
        ) : (
          <p className="comment-login-tip gb-login-tip">
            <Link href="/login">登录</Link> 后即可发表评论。
          </p>
        )}
      </div>
    </section>
  )
}
