'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAppStore } from '@/lib/app-store'
import CommentThread from '@/components/CommentThread'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import './guestbook.css'

const PAGE_SIZE = 20
/** 信笺最少保留的行数：写几行都不会让笺纸塌下去 */
const MIN_ROWS = 7
const MAX_LEN = 500
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
  /** 行号栏要显示几行：跟着正文的实际视觉行数走 */
  const [rowCount, setRowCount] = useState(MIN_ROWS)
  const submissionId = useRef(0)
  const composeTriggerRef = useRef<HTMLButtonElement>(null)
  const composeDialogRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = formState === 'submitting'

  const closeComposer = useCallback(() => {
    submissionId.current += 1
    setComposeOpen(false)
    setFormState('idle')
    setFormError('')
    setSuccess('')
    composeTriggerRef.current?.focus()
  }, [])

  /**
   * 行号跟着正文的实际视觉行数走。
   * 用 scrollHeight 量：默认的 soft wrap 只在视觉上折行、不在 value 里插换行，
   * 所以只有量渲染高度才能同时算对「手动换行」和「自动折行」。
   * 再把 textarea 的高度顶到内容高度，行号栏与格线才是同一套行。
   */
  const measureRows = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const styles = window.getComputedStyle(el)

    // getComputedStyle 在某些环境（jsdom、未挂样式时）会给出空字符串，
    // 所以每个值都要有兜底，别让 NaN 把整条测量打断。
    const parsedFont = Number.parseFloat(styles.fontSize)
    const fontSize = Number.isFinite(parsedFont) && parsedFont > 0 ? parsedFont : 16

    // line-height 可能是 px、也可能是无单位倍数（CSS 里写的就是 2.1）
    const raw = styles.lineHeight?.trim() ?? ''
    const lineHeight = raw.endsWith('px')
      ? Number.parseFloat(raw)
      : /^[\d.]+$/.test(raw)
        ? Number.parseFloat(raw) * fontSize
        : fontSize * 2.1 // 'normal'/空值兜底：按本站设定的 2.1 倍算
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return

    /**
     * 把行高"钉死"成同一个整数 px 值，同时喂给正文的行高与行号的行距。
     * 这一步是行号对得上的关键：
     * 只要两边从同一个数出发，就不会因为各自的取整方式不同而逐行积累错位。
     */
    const snapped = `${Math.round(lineHeight)}px`
    if (el.style.lineHeight !== snapped) el.style.lineHeight = snapped
    const host = el.closest<HTMLElement>('.guestbook-sheet-inner')
    if (host && host.style.getPropertyValue('--sheet-line') !== snapped) {
      host.style.setProperty('--sheet-line', snapped)
    }

    /**
     * 量高度一律用 scrollHeight / offsetHeight，不用 getBoundingClientRect：
     * 开笺动画会给外层加 scaleY，getBoundingClientRect 返回的是缩放过的值，
     * 据此算出的行高会偏小、行号随之逐行错位（此前 25 行差了十几像素）。
     * 这两个属性是整数且不受祖先 transform 影响，量与用都在整数域里，最稳。
     */
    const previousHeight = el.style.height
    el.style.height = 'auto' // 先松开，否则 scrollHeight 不会小于当前高度
    const contentHeight = el.scrollHeight
    el.style.height = previousHeight
    if (!Number.isFinite(contentHeight) || contentHeight <= 0) return

    // 行数吸附到整数，并把高度也钉成整数行：第 N 个行号才落在第 N 条格线上
    const lines = Math.max(MIN_ROWS, Math.round(contentHeight / lineHeight))
    const nextHeight = `${lines * Math.round(lineHeight)}px`
    if (el.style.height !== nextHeight) el.style.height = nextHeight

    setRowCount(lines)
  }, [])

  // 打开弹层、或正文变化时重新量（useLayoutEffect：避免先画错再跳一下）
  useLayoutEffect(() => {
    if (!composeOpen) return
    measureRows()
  }, [composeOpen, content, measureRows])

  // 视口变化、字体加载完成等会改变折行，用 ResizeObserver 兜住
  useEffect(() => {
    const el = textareaRef.current
    if (!composeOpen || !el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measureRows())
    observer.observe(el)
    return () => observer.disconnect()
  }, [composeOpen, measureRows])

  /**
   * 行号栏跟着正文一起滚，并按 scrollTop 取整，
   * 否则行号会停在半行上、与格线错开。
   */
  const handleWriteScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const gutter = gutterRef.current
    if (!gutter) return
    const top = event.currentTarget.scrollTop
    gutter.style.transform = `translateY(${-Math.round(top)}px)`
  }, [])

  // 关掉弹层时复位，下次打开是干净的一张笺
  useEffect(() => {
    if (!composeOpen) {
      setRowCount(MIN_ROWS)
      return
    }
    // 重新开笺：滚动位置与行号偏移都回到顶端
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    if (gutterRef.current) gutterRef.current.style.transform = 'translateY(0)'
  }, [composeOpen])

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
              <div className="guestbook-window-entry">
                <span className="guestbook-write-kicker">BY THE WINDOW</span>
                <span className="guestbook-window-title">山窗寄语</span>
                <span className="guestbook-window-copy">窗外有山，纸上有话。</span>
                <span className="guestbook-window-space" aria-hidden="true">
                  <span>展笺书写</span>
                </span>
                <button
                  ref={composeTriggerRef}
                  type="button"
                  className="guestbook-window-action"
                  onClick={toggleComposer}
                  aria-label="写留言"
                  aria-expanded={composeOpen}
                  aria-haspopup="dialog"
                  aria-controls="guestbook-immersive-sheet"
                >
                  <span className="gb-write-mark" aria-hidden="true" />
                  写留言
                </button>
              </div>
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
              <div className="guestbook-sheet-scenery" aria-hidden="true" />

              <header className="guestbook-sheet-head">
                <span className="guestbook-sheet-mark">
                  <b aria-hidden="true">05</b>
                  <span className="guestbook-sheet-eyebrow">BY THE WINDOW</span>
                </span>
                <button type="button" className="guestbook-sheet-close" onClick={closeComposer}>
                  <span>收笺</span>
                  <span className="guestbook-sheet-close-mark" aria-hidden="true">×</span>
                </button>
              </header>

              <div className="guestbook-sheet-title">
                <h2 id="guestbook-compose-title">山窗寄语</h2>
                <p id="guestbook-compose-description">窗外有山，纸上有话。</p>
              </div>

              <div
                className="guestbook-sheet-write"
                ref={scrollRef}
                onScroll={handleWriteScroll}
              >
                <div className="guestbook-sheet-inner">
                  <div className="guestbook-sheet-gutter" aria-hidden="true" ref={gutterRef}>
                    {Array.from({ length: rowCount }, (_, index) => (
                      <i key={index}>{String(index + 1).padStart(2, '0')}</i>
                    ))}
                  </div>
                  <div className="guestbook-sheet-paperline">
                    <textarea
                      ref={textareaRef}
                      className="guestbook-immersive-textarea"
                      aria-label="留言内容"
                      value={content}
                      onChange={(event) => updateContent(event.target.value)}
                      placeholder="写下此刻想说的话……"
                      maxLength={MAX_LEN}
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <footer className="guestbook-immersive-foot">
                <span className="moments-counter">{content.length} / {MAX_LEN}</span>
                <div className="guestbook-immersive-actions">
                  {formError ? <p className="error-text" role="alert">{formError}</p> : null}
                  <button
                    type="button"
                    className="btn guestbook-submit"
                    onClick={post}
                    disabled={busy || !content.trim()}
                  >
                    {busy ? '寄送中…' : formState === 'error' ? '重试寄出' : '寄出留言'}
                  </button>
                </div>
              </footer>

              <span className="guestbook-sheet-seal" aria-hidden="true">寄</span>
            </section>
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}
