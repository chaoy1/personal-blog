'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function Comments({ slug }: { slug: string }) {
  const { user, comments, error, addComment } = useAppStore()
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState('')
  const submissionId = useRef(0)
  const busy = formState === 'submitting'

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
    const requestId = ++submissionId.current
    setFormState('submitting')
    setLocalError('')
    setSuccess('')
    let err: string | null
    try {
      err = await addComment(slug, text, null)
    } catch {
      err = '发布失败，请稍后再试'
    }
    if (requestId !== submissionId.current) return
    if (err) {
      setLocalError(err)
      setFormState('error')
      return
    }
    setContent('')
    setComposeOpen(false)
    setSuccess('评论已发布')
    setFormState('success')
  }

  function openComposer() {
    submissionId.current += 1
    setComposeOpen(true)
    setFormState('idle')
    setLocalError('')
    setSuccess('')
  }

  function closeComposer() {
    submissionId.current += 1
    setComposeOpen(false)
    setFormState('idle')
  }

  function updateContent(value: string) {
    if (busy) {
      submissionId.current += 1
      setFormState('idle')
    }
    setContent(value)
  }

  return (
    <section className="comments" aria-busy={busy} data-form-state={formState}>
      <div className="comments-title">
        <span>评论</span>
        <span className="comments-count">{list.length}</span>
      </div>

      {error || localError ? <p className="error-text" role="alert">{localError || error}</p> : null}
      {success ? <p className="notice-text" role="status">{success}</p> : null}

      {/* 评论内容优先展示 */}
      <div className="comment-list">
        <CommentThread
          items={list}
          userId={user?.id ?? null}
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
                aria-label="评论内容"
                value={content}
                onChange={(e) => updateContent(e.target.value)}
                placeholder="说点什么…"
                rows={3}
                autoFocus
              />
              <div className="comment-form-foot">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeComposer}
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
                {formState === 'error' ? (
                  <button className="btn btn-ghost btn-sm" type="button" disabled={busy || !content.trim()} onClick={submit}>
                    重试发布评论
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm gb-compose-open"
              onClick={openComposer}
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
