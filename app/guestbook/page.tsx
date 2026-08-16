'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'

const PAGE_SIZE = 20

export default function GuestbookPage() {
  const { user, profile, guestbook, ready, error, addGuestbook, deleteGuestbook } = useAppStore()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  // 顶层留言（含兼容：父级已不存在的回复按顶层处理），新的在前
  const { parents, rootIdOf } = useMemo(() => {
    const byId = new Map(guestbook.map((g) => [g.id, g]))
    const rootIdOf = new Map<string, string>()
    for (const g of guestbook) {
      let cur = g
      const guard = new Set<string>()
      while (cur.parent_id && byId.has(cur.parent_id) && !guard.has(cur.parent_id)) {
        guard.add(cur.id)
        cur = byId.get(cur.parent_id)!
      }
      rootIdOf.set(g.id, cur.id)
    }
    const parents = guestbook
      .filter((g) => rootIdOf.get(g.id) === g.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return { parents, rootIdOf }
  }, [guestbook])

  const totalPages = Math.max(1, Math.ceil(parents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = parents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // 交给串楼组件的条目：当页顶层 + 这些顶层下的所有回复
  const threadItems = useMemo(() => {
    const ids = new Set(pageItems.map((p) => p.id))
    return guestbook.filter((g) => ids.has(rootIdOf.get(g.id) ?? g.id))
  }, [guestbook, pageItems, rootIdOf])

  async function post() {
    const text = content.trim()
    if (!user || !text) return
    setBusy(true)
    setLocalError('')
    const err = await addGuestbook(text, null)
    setBusy(false)
    if (err) {
      setLocalError(err)
      return
    }
    setContent('')
    setComposeOpen(false)
    setPage(1)
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

        {error || localError ? <p className="error-text">{localError || error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载留言…</p> : null}

        {/* 留言内容优先展示 */}
        <div className="comment-list guestbook-list">
          <CommentThread
            items={threadItems}
            userId={user?.id ?? null}
            busy={busy}
            emptyText={ready && !error ? '还没有人留言，来写第一句吧。' : undefined}
            onReply={(parentId, text) => addGuestbook(text, parentId)}
            onDelete={(id) => remove(id)}
          />
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

        {/* 编写入口收起在列表之后，点开才占据视觉中心 */}
        <div className="gb-compose">
          {user ? (
            composeOpen ? (
              <div className="moments-composer gb-composer">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`以「${nickname}」的身份留下几句话…`}
                  maxLength={500}
                  autoFocus
                />
                <div className="moments-actions">
                  <span className="moments-counter">{content.length}/500</span>
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
                    type="button"
                    className="btn btn-sm"
                    onClick={post}
                    disabled={busy || !content.trim()}
                  >
                    {busy ? '处理中…' : '留言'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm gb-compose-open"
                onClick={() => setComposeOpen(true)}
              >
                ✎ 写留言
              </button>
            )
          ) : (
            <p className="moments-login-tip gb-login-tip">
              <Link href="/login">登录</Link> 后即可留言和回复。
            </p>
          )}
        </div>
      </article>
    </div>
  )
}
