'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'
import ScrollFX from '@/components/ScrollFX'

const PAGE_SIZE = 20

type GuestbookMessage = {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export default function GuestbookPage() {
  const [messages, setMessages] = useState<GuestbookMessage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (p: number) => {
    const sb = supabaseBrowser()
    const from = (p - 1) * PAGE_SIZE
    const { count } = await sb.from('guestbook').select('*', { count: 'exact', head: true })
    const { data, error } = await sb
      .from('guestbook')
      .select('*, profiles!guestbook_user_id_fkey(nickname, avatar_url)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      setError('读取留言失败：' + error.message)
      return
    }
    setMessages((data ?? []) as unknown as GuestbookMessage[])
    setTotal(count ?? 0)
  }, [])

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(({ data }) =>
        setSession(
          data.session
            ? { user: data.session.user as { id: string; email?: string } }
            : null
        )
      )
      .catch(() => setSession(null))
    load(1).catch(() => setError('数据库尚未初始化，请运行 supabase/schema-v2.sql 与 schema-v5.sql'))
  }, [load])

  async function post() {
    const text = content.trim()
    if (!session || !text) return
    setBusy(true)
    setError('')
    const { error } = await supabaseBrowser()
      .from('guestbook')
      .insert({ user_id: session.user.id, content: text })
    setBusy(false)
    if (error) {
      setError('发表失败：' + error.message)
      return
    }
    setContent('')
    setPage(1)
    load(1)
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条留言？')) return
    const { error } = await supabaseBrowser().from('guestbook').delete().eq('id', id)
    if (error) {
      setError('删除失败：' + error.message)
      return
    }
    load(page)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

        {session ? (
          <div className="moments-composer">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此留下几句话…"
              maxLength={500}
            />
            <div className="moments-actions">
              <span className="moments-counter">{content.length}/500</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={post}
                disabled={busy || !content.trim()}
              >
                {busy ? '处理中…' : '留 言'}
              </button>
            </div>
          </div>
        ) : (
          <p className="moments-login-tip">
            <Link href="/login">登录</Link> 后即可留言。
          </p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="comment-list guestbook-list">
          {messages.map((m) => (
            <div key={m.id} className="comment reveal">
              {m.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="c-avatar md" src={m.profiles.avatar_url} alt="头像" />
              ) : (
                <span className="c-avatar md placeholder">客</span>
              )}
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-name">{m.profiles?.nickname || '旅人'}</span>
                  <span className="comment-date">{formatDate(m.created_at)}</span>
                  {session?.user.id === m.user_id ? (
                    <button type="button" className="link-btn guestbook-del" onClick={() => remove(m.id)}>
                      删除
                    </button>
                  ) : null}
                </div>
                <p className="comment-content">{m.content}</p>
              </div>
            </div>
          ))}
          {messages.length === 0 && !error ? (
            <p className="moments-empty">还没有人留言，来写第一句吧。</p>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="pager">
            <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1) }}>
              ← 上一页
            </button>
            <span className="pager-info">
              第 {page} / {totalPages} 页 · 共 {total} 条
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1) }}>
              下一页 →
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}
