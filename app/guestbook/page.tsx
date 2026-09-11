'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import './guestbook.css'

const PAGE_SIZE = 20
type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function GuestbookPage() {
  const { user, guestbook, ready, error, addGuestbook, deleteGuestbook } = useAppStore()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [localError, setLocalError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const submissionId = useRef(0)
  const composeTriggerRef = useRef<HTMLButtonElement>(null)
  const composeDialogRef = useRef<HTMLElement>(null)
  const busy = formState === 'submitting'

  const closeComposer = useCallback(() => {
    submissionId.current += 1
    setComposeOpen(false)
    setFormState('idle')
    setFormError('')
    setSuccess('')
    composeTriggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!composeOpen) return

    const previousOverflow = document.body.style.overflow
    const dialog = composeDialogRef.current
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeComposer()
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeComposer, composeOpen])

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
    const requestId = ++submissionId.current
    setFormState('submitting')
    setFormError('')
    setSuccess('')
    let err: string | null
    try {
      err = await addGuestbook(text, null)
    } catch {
      err = '发表失败，请稍后再试'
    }
    if (requestId !== submissionId.current) return
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
    queueMicrotask(() => composeTriggerRef.current?.focus())
  }

  function toggleComposer() {
    if (composeOpen) {
      closeComposer()
      return
    }
    submissionId.current += 1
    setComposeOpen(true)
    setFormState('idle')
    setFormError('')
    setSuccess('')
  }

  function updateContent(value: string) {
    if (busy) {
      submissionId.current += 1
      setFormState('idle')
    }
    setContent(value)
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条留言？')) return
    setLocalError('')
    const err = await deleteGuestbook(id)
    if (err) setLocalError(err)
  }

  return (
    <div className="wrap guestbook-page">
      <ScrollFX />
      <ArticleNav current="留言" />

      <PageIntro
        index="05"
        eyebrow="GUESTBOOK"
        title="留言"
        seal="留"
        description="来者有言，皆收于此。"
      />

      <article className="article content-sheet guestbook-sheet">
        <div className="guestbook-layout">
          <aside className="guestbook-window-panel" aria-label="山窗寄语">
            {user ? (
              <button
                ref={composeTriggerRef}
                type="button"
                className="guestbook-window-entry"
                onClick={toggleComposer}
                aria-label="写留言"
                aria-expanded={composeOpen}
                aria-haspopup="dialog"
                aria-controls="guestbook-immersive-sheet"
              >
                <span className="guestbook-write-kicker">BY THE WINDOW</span>
                <span className="guestbook-window-title">山窗寄语</span>
                <span className="guestbook-window-copy">窗外有山，纸上有话。</span>
                <span className="guestbook-window-space" aria-hidden="true">
                  <span>展笺书写</span>
                </span>
                <span className="guestbook-window-action">
                  <span className="gb-write-mark" aria-hidden="true" />
                  写留言
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                className="guestbook-window-entry guestbook-window-login"
                aria-label="登录后写留言"
              >
                <span className="guestbook-write-kicker">BY THE WINDOW</span>
                <span className="guestbook-window-title">山窗寄语</span>
                <span className="guestbook-window-copy">窗外有山，纸上有话。</span>
                <span className="guestbook-window-space" aria-hidden="true">
                  <span>候君展笺</span>
                </span>
                <span className="guestbook-window-action">
                  <span className="gb-write-mark" aria-hidden="true" />
                  登录后写留言
                </span>
              </Link>
            )}

            {success ? <p className="notice-text" role="status">{success}</p> : null}
          </aside>

          <section className="guestbook-messages" aria-label="已收留言">
            {error || localError ? <p className="error-text" role="alert">{localError || error}</p> : null}
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
          </section>
        </div>
      </article>

      {user && composeOpen
        ? createPortal(
          <div
            className="guestbook-immersive-layer"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeComposer()
            }}
          >
            <section
              id="guestbook-immersive-sheet"
              ref={composeDialogRef}
              className="guestbook-immersive-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guestbook-compose-title"
              aria-describedby="guestbook-compose-description"
              aria-busy={busy}
              data-form-state={formState}
            >
              <header className="guestbook-immersive-head">
                <div>
                  <span className="guestbook-write-kicker">BY THE WINDOW</span>
                  <h2 id="guestbook-compose-title">山窗寄语</h2>
                  <p id="guestbook-compose-description">窗外有山，纸上有话。</p>
                </div>
                <button type="button" className="guestbook-sheet-close" onClick={closeComposer}>
                  <span>收笺</span>
                  <span className="guestbook-sheet-close-mark" aria-hidden="true">×</span>
                </button>
              </header>

              <textarea
                className="guestbook-immersive-textarea"
                aria-label="留言内容"
                value={content}
                onChange={(event) => updateContent(event.target.value)}
                placeholder="写下此刻想说的话……"
                maxLength={500}
                autoFocus
              />

              <footer className="guestbook-immersive-foot">
                <span className="moments-counter">{content.length} / 500</span>
                <div className="guestbook-immersive-actions">
                  {formError ? <p className="error-text" role="alert">{formError}</p> : null}
                  <button
                    type="button"
                    className="btn guestbook-submit"
                    onClick={post}
                    disabled={busy || !content.trim()}
                  >
                    {busy ? '寄送中…' : formState === 'error' ? '重试留言' : '寄出留言'}
                  </button>
                </div>
              </footer>
            </section>
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}
