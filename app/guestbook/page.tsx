'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import ScrollFX from '@/components/ScrollFX'
import { useAuth } from '@/lib/auth-context'
import { useGuestbook } from '@/lib/guestbook-context'
import CommentThread from '@/components/CommentThread'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import Pagination from '@/components/Pagination'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { formatGuestbookDate } from '@/lib/guestbook-design'
import './guestbook.css'

const PAGE_SIZE = 6
/** 信笺最少保留的行数：写几行都不会让笺纸塌下去 */
const MIN_ROWS = 7
const MAX_LEN = 500
type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function GuestbookPage() {
  const { user, profile } = useAuth()
  const {
    guestbook,
    ready,
    error,
    hasData,
    isInitialLoading,
    isRefreshing,
    refreshGuestbook,
    addGuestbook,
    deleteGuestbook,
  } = useGuestbook()
  const resourceHasData = hasData ?? ready
  const resourceIsInitialLoading = isInitialLoading ?? !ready
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [localError, setLocalError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const listTitleRef = useRef<HTMLHeadingElement>(null)
  const submissionId = useRef(0)
  const composeTriggerRef = useRef<HTMLButtonElement>(null)
  const composeDialogRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const followComposerTailRef = useRef(false)
  const busy = formState === 'submitting'
  const { confirm, dialog } = useConfirmDialog()

  const closeComposer = useCallback(() => {
    submissionId.current += 1
    setComposeOpen(false)
    setFormState('idle')
    setFormError('')
    setSuccess('')
    composeTriggerRef.current?.focus()
  }, [])

  // 正文撑高后由外层书写区滚动，末尾继续输入才追随光标。
  const measureRows = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const parsed = Number.parseFloat(getComputedStyle(el).lineHeight)
    const lineHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 36
    el.style.height = 'auto'
    el.style.height = Math.max(lineHeight * MIN_ROWS, el.scrollHeight) + 'px'
    if (followComposerTailRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      followComposerTailRef.current = false
    }
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

  // 字体加载会改变字宽与软换行，但不一定触发 ResizeObserver。
  useEffect(() => {
    if (!composeOpen) return
    const fonts = document.fonts
    if (!fonts) return

    let active = true
    const remeasure = () => {
      if (active) measureRows()
    }
    void fonts.ready.then(remeasure)
    fonts.addEventListener('loadingdone', remeasure)
    return () => {
      active = false
      fonts.removeEventListener('loadingdone', remeasure)
    }
  }, [composeOpen, measureRows])

  // 关闭时复位光标跟随状态，下次打开仍保留未寄出的草稿。
  useEffect(() => {
    if (!composeOpen) {
      followComposerTailRef.current = false
      return
    }
    // 重新开笺时回到正文顶端。
    if (scrollRef.current) scrollRef.current.scrollTop = 0
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

  const pageState = !resourceHasData && resourceIsInitialLoading
    ? 'loading'
    : !resourceHasData && (error || localError)
      ? 'error'
      : resourceHasData && parents.length === 0 && !error && !localError
        ? 'empty'
        : isRefreshing
          ? 'refreshing'
          : 'ready'

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

  function updateContent(value: string, caretAtEnd: boolean) {
    if (busy) {
      submissionId.current += 1
      setFormState('idle')
    }
    followComposerTailRef.current = value.length > content.length && caretAtEnd
    setContent(value)
  }

  async function remove(id: string) {
    const confirmed = await confirm({
      title: '删除这条留言？',
      description: '此操作无法撤销。',
      confirmLabel: '确认删除',
    })
    if (!confirmed) return
    setLocalError('')
    const err = await deleteGuestbook(id)
    if (err) setLocalError(err)
  }

  return (
    <main
      className="wrap guestbook-page"
      aria-label="留言"
      data-page-state={pageState}
      data-entry-count={parents.length}
      data-refreshing={isRefreshing ? 'true' : 'false'}
    >
      <ScrollFX />
      <ArticleNav current="留言" />
      <div className="guestbook-masthead"><PageIntro
        index="05"
        eyebrow="GUESTBOOK"
        title="留言"
        seal="留"
        description="来者有言，皆收于此。"
      /><span className="hero-inscription" aria-hidden="true"><span>山窗常开<br/>来信有声</span><i>往来</i></span><span className="hero-tail" aria-hidden="true">A FEW WORDS, A SMALL ENCOUNTER</span></div>

      <article className="article content-sheet guestbook-sheet">
        <div className="guestbook-layout">
          <aside className="guestbook-window-panel" aria-label="山窗寄语">
            <div className="guestbook-window-entry">
              <span className="guestbook-write-kicker">BY THE WINDOW</span>
              <h2 className="guestbook-window-title">山窗寄语</h2>
              <p className="guestbook-window-copy">窗外有山，纸上有话。</p>
              <div className="mountain-window" aria-hidden="true"><div className="window-view"/><i className="window-mullion"/><span className="window-note">且坐书窗下</span></div>
              <div className="invitation"><span>致 · 途经这里的你</span><p>一声问候，一段近况，<br/>或是此刻想说的话。</p></div>
              {user ? <button ref={composeTriggerRef} type="button" className="guestbook-window-action" onClick={toggleComposer} aria-label="写留言" aria-expanded={composeOpen} aria-haspopup="dialog" aria-controls="guestbook-immersive-sheet"><svg viewBox="0 0 44 30" aria-hidden="true"><path d="M1 1H43V29H1Z"/><path className="envelope-flap" d="M1 1L22 17L43 1"/><path d="M1 29L16 15M43 29L28 15"/></svg><span>展笺书写</span><b aria-hidden="true">↗</b></button> : <Link href="/login" className="guestbook-window-action" aria-label="登录后写留言">登录后写留言 <span aria-hidden="true">↗</span></Link>}
              <p className="writing-note">{user ? '以你的名字落款 · 最多 500 字' : '登录后以你的名字落款'}</p>
              <div className="panel-tail" aria-hidden="true"><span>一言一笺</span><i>寄</i><span>收于山窗</span></div>
            </div>
            {success ? <p className="notice-text" role="status">{success}</p> : null}
          </aside>

          <section className="guestbook-messages" aria-label="已收留言" data-list-state={pageState}>
            <header className="section-head"><div><span className="eyebrow">LETTERS / 往来</span><h2 ref={listTitleRef} tabIndex={-1}>山窗来信</h2></div><p>共 <b>{String(parents.length).padStart(2,'0')}</b> 封<small>字短情长，皆有回响。</small></p></header>
            {!resourceHasData && resourceIsInitialLoading ? <p className="moments-empty">正在加载留言…</p> : null}
            {!resourceHasData && (error || localError) ? (
              <p className="error-text" role="alert">
                {localError || error}{' '}
                <button type="button" className="link-btn" onClick={refreshGuestbook}>重试</button>
              </p>
            ) : null}
            {resourceHasData && (error || localError || isRefreshing) ? (
              <p className="error-text" role="status">
                {localError || error || '正在同步留言…'}
                {error ? <button type="button" className="link-btn" onClick={refreshGuestbook}>重试同步</button> : null}
              </p>
            ) : null}

            {/* 留言内容优先展示 */}
            <div className="comment-list guestbook-list book-body">
              <span className="binding" aria-hidden="true"><i/><i/><i/><i/></span>
              <CommentThread
                variant="letters"
                rootOffset={(safePage - 1) * PAGE_SIZE}
                items={threadItems}
                userId={user?.id ?? null}
                emptyText={resourceHasData && !error ? '还没有人留言，来写第一句吧。' : undefined}
                onReply={(parentId, text) => addGuestbook(text, parentId)}
                onDelete={(id) => remove(id)}
              />
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={parents.length}
              onPageChange={(nextPage) => { setPage(nextPage); queueMicrotask(() => { listTitleRef.current?.focus(); listTitleRef.current?.scrollIntoView?.({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }) }}
              summary={`第 ${safePage} / ${totalPages} 页 · 共 ${parents.length} 条`}
            />
          </section>
        </div>
        <footer className="sheet-tail"><span>纸上留音，山水知意。</span><span>LETTERS WITH TIME · 卷五</span></footer>
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
              <header className="guestbook-sheet-head"><div><span className="guestbook-sheet-eyebrow">卷五 / 山窗书笺</span><h2 id="guestbook-compose-title">山窗寄语</h2></div><button type="button" className="guestbook-sheet-close" onClick={closeComposer}>收笺 <span aria-hidden="true">×</span></button></header>
              <div className="composer-to"><p id="guestbook-compose-description">见字如面，写下此刻想说的话。</p><span>{formatGuestbookDate(new Date().toISOString()).full}</span></div>
              <div className="guestbook-sheet-write" ref={scrollRef}><div className="guestbook-sheet-inner"><textarea ref={textareaRef} className="guestbook-immersive-textarea" aria-label="留言内容" value={content} onChange={event => updateContent(event.target.value,event.target.selectionStart===event.target.value.length)} placeholder="写下此刻想说的话……" maxLength={MAX_LEN} readOnly={busy} autoFocus/></div></div>
              <div className="signature"><span>落款 · <b>{profile?.nickname || '山窗访客'}</b><i>敬上</i></span><span className="moments-counter">{content.length} / {MAX_LEN}</span></div>
              {formError ? <p className="error-text" role="alert">{formError}</p> : null}
              <footer className="guestbook-immersive-foot"><small>以你的名字，收于山窗。</small><button type="button" className="btn guestbook-submit" onClick={post} disabled={busy || !content.trim()}><span>{busy ? '寄送中…' : formState === 'error' ? '重试寄出' : '寄出留言'}</span><svg viewBox="0 0 38 26" aria-hidden="true"><path d="M1 1H37V25H1Z M1 1L19 15L37 1 M1 25L14 13 M37 25L24 13"/></svg></button></footer>
            </section>
          </div>,
          document.body,
        )
        : null}
      {dialog}
    </main>
  )
}
