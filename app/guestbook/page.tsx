'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'
import PageIntro from '@/components/PageIntro'

const PAGE_SIZE = 20
type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function GuestbookPage() {
  const { user, profile, guestbook, ready, error, addGuestbook, deleteGuestbook } = useAppStore()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [localError, setLocalError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const busy = formState === 'submitting'

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
    setFormState('submitting')
    setFormError('')
    setSuccess('')
    const err = await addGuestbook(text, null)
    if (err) {
      setFormError(err)
      setFormState('error')
      return
    }
    setContent('')
    setComposeOpen(false)
    setPage(1)
    setSuccess('留言已保存')
    setFormState('success')
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
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>留言</span>
      </nav>

      <PageIntro
        index="05"
        eyebrow="GUESTBOOK"
        title="留言"
        seal="留"
        description="来者有言，皆收于此。"
      />

      <article className="article content-sheet">

        <section className="guestbook-write" aria-label="写留言">
          <div className="guestbook-write-head">
            <div>
              <span className="guestbook-write-kicker">LEAVE A NOTE</span>
              <p>若有一句话想留下，就写在这里。</p>
            </div>
            {user ? (
              <button
                type="button"
                className={`gb-compose-open${composeOpen ? ' active' : ''}`}
                onClick={() => setComposeOpen((value) => !value)}
                aria-expanded={composeOpen}
              >
                <span className="gb-write-mark" aria-hidden="true" />
                {composeOpen ? '收起纸笺' : '写留言'}
              </button>
            ) : (
              <p className="moments-login-tip gb-login-tip">
                <Link href="/login">登录后写留言</Link>
              </p>
            )}
          </div>

          {user && composeOpen ? (
            <div className="moments-composer gb-composer" aria-busy={busy} data-form-state={formState}>
              <textarea
                aria-label="留言内容"
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
                  }}
                >
                  取消
                </button>
                <button type="button" className="btn btn-sm" onClick={post} disabled={busy || !content.trim()}>
                  {busy ? '处理中…' : '留下这句话'}
                </button>
                {formState === 'error' ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={post} disabled={busy || !content.trim()}>
                    重试留言
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {error || localError || formError ? <p className="error-text" role="alert">{formError || localError || error}</p> : null}
        {success ? <p className="notice-text" role="status">{success}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载留言…</p> : null}

        {/* 留言内容优先展示 */}
        <div className="comment-list guestbook-list">
          <CommentThread
            items={threadItems}
            userId={user?.id ?? null}
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

      </article>
    </div>
  )
}
