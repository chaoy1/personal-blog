'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'

type Comment = {
  id: string
  content: string
  parent_id: string | null
  created_at: string
  user_id: string
  profiles: { nickname: string; avatar_url: string } | null
}

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(
        ({ data }) =>
          setSession(
            (data.session as { user: { id: string; email?: string } } | null) ?? null
          )
      )
    sb.from('comments')
      .select(
        'id, content, parent_id, created_at, user_id, profiles!comments_user_id_fkey(nickname, avatar_url)'
      )
      .eq('post_slug', slug)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError('读取评论失败：' + error.message)
        else setComments((data ?? []) as unknown as Comment[])
      })
  }, [slug])

  async function submit(parentId: string | null) {
    const text = (parentId ? replyContent : content).trim()
    if (!session || !text) return
    setBusy(true)
    const { error } = await supabaseBrowser().from('comments').insert({
      post_slug: slug,
      user_id: session.user.id,
      parent_id: parentId,
      content: text,
    })
    setBusy(false)
    if (error) {
      setError('发布失败：' + error.message)
      return
    }
    setContent('')
    setReplyContent('')
    setReplyTo(null)
    const { data } = await supabaseBrowser()
      .from('comments')
      .select(
        'id, content, parent_id, created_at, user_id, profiles!comments_user_id_fkey(nickname, avatar_url)'
      )
      .eq('post_slug', slug)
      .order('created_at', { ascending: true })
    if (data) setComments(data as unknown as Comment[])
  }

  const top = comments.filter((c) => !c.parent_id)

  function avatar(c: Comment, size: 'sm' | 'md') {
    if (c.profiles?.avatar_url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img className={`c-avatar ${size}`} src={c.profiles.avatar_url} alt="头像" />
    }
    return <span className={`c-avatar ${size} placeholder`}>影</span>
  }

  return (
    <section className="comments">
      <div className="comments-title">
        <span>评论</span>
        <span className="comments-count">{comments.length}</span>
      </div>

      {session ? (
        <div className="comment-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么…（登录状态）"
            rows={3}
          />
          <div className="comment-form-foot">
            <span className="hint">登录身份：{session.user.email?.split('@')[0]}</span>
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

      {error ? <p className="error-text">{error}</p> : null}

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
                {session ? (
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

                {comments
                  .filter((r) => r.parent_id === c.id)
                  .map((r) => (
                    <div key={r.id} className="comment reply">
                      {avatar(r, 'sm')}
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-name">
                            {r.profiles?.nickname || '旅人'}
                          </span>
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
