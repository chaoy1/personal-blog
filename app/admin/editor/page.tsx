'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import { DraftRecoveryDialog } from '@/components/admin/DraftRecoveryDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { useArticleDraftSync } from '@/components/admin/useArticleDraftSync'
import type { ArticleDraftSnapshot } from '@/lib/article-draft'
import { makeSlug } from '@/lib/slug'
import '../articles-paper.css'

export default function EditorPage() {
  return (
    <Suspense fallback={<p>加载中…</p>}>
      <Editor />
    </Suspense>
  )
}

function Editor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { notify } = useAdminFeedback()
  const [postId, setPostId] = useState<string | null>(id)
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(() => id ? '1970-01-01T00:00:00.000Z' : new Date().toISOString())
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [immersive, setImmersive] = useState(false)
  const [editorTone, setEditorTone] = useState<'paper' | 'plain' | 'warm' | 'night'>('paper')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(id ? 'loading' : 'ready')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const snapshot: ArticleDraftSnapshot = {
    version: 2,
    clientId: 'primary',
    postId,
    title,
    slug,
    excerpt,
    content,
    published,
    updatedAt,
  }
  const draftSync = useArticleDraftSync({
    snapshot,
    onPostId: (nextId) => {
      setPostId(nextId)
      router.replace(`/admin/editor?id=${nextId}`)
    },
    onUnauthorized: () => router.replace(
      `/admin/login?next=${encodeURIComponent(id ? `/admin/editor?id=${id}` : '/admin/editor')}`,
    ),
  })

  function touchDraft() {
    setUpdatedAt(new Date().toISOString())
    setSaveState('idle')
  }


  useEffect(() => {
    if (!id) {
      setLoadState('ready')
      return
    }
    let cancelled = false
    setLoadState('loading')
    setLoadError('')
    fetch(`/api/admin/posts/${id}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace(`/admin/login?next=${encodeURIComponent(`/admin/editor?id=${id}`)}`)
          if (!cancelled) {
            setLoadError('登录已过期，请重新登录')
            setLoadState('error')
          }
          return null
        }
        if (!res.ok) throw new Error('加载文章失败')
        return res.json()
      })
      .then((post) => {
        if (!post || cancelled) return
        setTitle(post.title)
        setSlug(post.slug)
        setSlugTouched(true)
        setExcerpt(post.excerpt ?? '')
        setContent(post.content ?? '')
        setPublished(post.published)
        setPostId(post.id)
        setUpdatedAt(post.updated_at)
        setLoadState('ready')
      })
      .catch((cause) => {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : '加载文章失败')
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, loadAttempt, router])

  // 沉浸模式按 Esc 退出
  useEffect(() => {
    if (!immersive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [immersive])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('blog-editor-tone')
      if (saved === 'paper' || saved === 'plain' || saved === 'warm' || saved === 'night') {
        setEditorTone(saved)
      }
    } catch {
      // 浏览器禁用本地存储时继续使用默认纸色
    }
  }, [])

  const hasUnsavedChanges = Boolean(title.trim() || excerpt.trim() || content.trim())
    && ['local-saved', 'server-saving', 'error', 'conflict'].includes(draftSync.status)

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges])

  function changeEditorTone(tone: 'paper' | 'plain' | 'warm' | 'night') {
    setEditorTone(tone)
    try {
      localStorage.setItem('blog-editor-tone', tone)
    } catch {
      // ignore
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    touchDraft()
    if (!slugTouched) setSlug(makeSlug(value))
  }

  function insertMarkdown(before: string, after = '', placeholder = '') {
    const ta = contentRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const selected = content.slice(s, e) || placeholder
    setContent(content.slice(0, s) + before + selected + after + content.slice(e))
    touchDraft()
    requestAnimationFrame(() => {
      ta.focus()
      const start = s + before.length
      ta.setSelectionRange(start, start + selected.length)
    })
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const input = event.currentTarget
    const start = input.selectionStart
    const end = input.selectionEnd
    const indent = '  '
    setContent((value) => `${value.slice(0, start)}${indent}${value.slice(end)}`)
    touchDraft()
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = start + indent.length
    })
  }

  const toolbar = [
    { label: 'H2', run: () => insertMarkdown('## ', '', '小标题') },
    { label: '粗', run: () => insertMarkdown('**', '**', '加粗') },
    { label: '斜', run: () => insertMarkdown('*', '*', '斜体') },
    { label: '引', run: () => insertMarkdown('> ', '', '引用的文字') },
    { label: '链', run: () => insertMarkdown('[', '](https://)', '链接文字') },
    { label: '码', run: () => insertMarkdown('`', '`', '代码') },
    { label: '块', run: () => insertMarkdown('```\n', '\n```', '代码块') },
    { label: '图', run: () => insertMarkdown('![', '](图片地址)', '图片说明') },
    { label: '·', run: () => insertMarkdown('- ', '', '列表项') },
  ]

  const characterCount = content.replace(/\s/g, '').length
  const paragraphCount = content.trim() ? content.trim().split(/\n\s*\n/).length : 0
  const saveStatusText = draftSync.status === 'server-saving'
    ? '正在保存…'
    : draftSync.status === 'server-saved' && draftSync.lastSavedAt
      ? `已保存于 ${new Date(draftSync.lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : draftSync.status === 'error'
        ? '自动保存失败，本地备份仍在'
        : draftSync.status === 'conflict'
          ? '发现版本冲突'
          : title.trim() || excerpt.trim() || content.trim() ? '已备份到本地' : 'Markdown'
  const editorSaveState = saving || draftSync.status === 'server-saving' ? 'saving' : saveState
  const editorSaveText = saving === 'publish'
    ? '发布中…'
    : saving === 'draft'
      ? '保存中…'
      : saveState === 'saved'
        ? '已保存'
        : saveState === 'error'
          ? '保存失败，本地内容仍保留'
          : saveStatusText


  async function save(nextPublished: boolean) {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      setSaveState('error')
      return null
    }
    setSaving(nextPublished ? 'publish' : 'draft')
    setSaveState('saving')
    try {
      const result = await draftSync.flush(nextPublished)
      setPublished(nextPublished)
      setUpdatedAt(result.updatedAt)
      setSaveState('saved')
      notify({ kind: 'success', message: nextPublished ? '文章已发布' : '草稿已保存' })
      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
      setSaveState('error')
      return null
    } finally {
      setSaving(null)
    }
  }

  async function openDraftPreview() {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      setSaveState('error')
      return
    }
    setSaving('draft')
    setSaveState('saving')
    try {
      const result = await draftSync.flush(false)
      setUpdatedAt(result.updatedAt)
      setSaveState('saved')
      router.push(`/admin/preview/${result.postId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '预览准备失败')
      setSaveState('error')
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      if (!saving) void save(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saving, title, slug, excerpt, content, published])

  if (loadState !== 'ready') {
    return (
      <section
        className="ap-editor-page ap-editor-shell-state"
        role="region"
        aria-label="文章编辑器"
        data-page-state={loadState}
      >
        <div className="ap-page-head">
          <Link href="/admin/posts" className="ap-quiet">← 文章列表</Link>
          <div className="ap-editor-top-title">
            <span>WRITING ROOM</span>
            <h1>{isEdit ? '编辑文章' : '写新文章'}</h1>
          </div>
          <p className="ap-article-hint" role="status">
            {loadState === 'loading' ? '正在加载文章…' : '文章加载失败'}
          </p>
        </div>
        {loadState === 'loading' ? (
          <div className="ap-sheet ap-article-skeleton" aria-busy="true" aria-hidden="true">
            <div className="editor-loading-line editor-loading-line-title" />
            <div className="editor-loading-line" />
            <div className="editor-loading-line editor-loading-line-body" />
          </div>
        ) : (
          <div className="ap-sheet ap-article-error" role="alert">
            <p>{loadError || '加载文章失败'}</p>
            <button type="button" className="ap-button" onClick={() => setLoadAttempt((value) => value + 1)}>
              重新加载
            </button>
          </div>
        )}
      </section>
    )
  }

  const writer = (
    <section className="ap-sheet ap-editor-manuscript" aria-label="手稿正文">
      <header className="ap-editor-paper-head"><span>MANUSCRIPT / 手稿</span><span>{published ? '已刊 · 成篇' : '未刊 · 待续'}</span></header>
      <label className="ap-editor-title-label" htmlFor="title">篇名</label>
      <input id="title" className="ap-editor-title-input" type="text" aria-label="文章标题" value={title}
        onChange={(event) => handleTitleChange(event.target.value)} placeholder="这篇文章叫什么？" />
      <div className="ap-editor-tool-row">
        <div className="ap-editor-markdown-tools" role="toolbar" aria-label="Markdown 快捷插入">
          {toolbar.map((tool) => <button key={tool.label} type="button" onClick={tool.run} title={`插入：${tool.label}`} disabled={mode === 'preview'}>{tool.label}</button>)}
        </div>
        <div className="ap-editor-modes" role="group" aria-label="正文模式">
          <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>编辑</button>
          <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>预览</button>
        </div>
      </div>
      <div className="ap-editor-writing-stage" data-tone={editorTone}>
        {mode === 'edit' ? <>
          <label className="ap-editor-body-label" htmlFor="article-content">Markdown 正文</label>
          <textarea id="article-content" ref={contentRef} aria-label="Markdown 正文" value={content}
            onChange={(event) => { setContent(event.target.value); touchDraft() }} onKeyDown={handleEditorKeyDown}
            placeholder={'用 Markdown 写作，支持 **加粗**、[链接](https://…)、代码块、表格等。'} spellCheck={false} />
        </> : <div className="ap-editor-inline-preview" aria-label="Markdown 正文预览">
          {content.trim() ? <MarkdownView content={content} /> : <p className="ap-article-hint">还没有内容，切回「编辑」开始写。</p>}
        </div>}
      </div>
      <footer className="ap-editor-paper-foot"><span>{characterCount} 字 · {paragraphCount} 段</span><span>Markdown <i>·</i> Ctrl / ⌘ S 保存</span></footer>
    </section>
  )

  const settings = (
    <aside className="ap-editor-margin" aria-label="文章设置">
      <section className="ap-sheet ap-editor-settings">
        <header className="ap-sheet-head"><div><p className="ap-eyebrow">THE MARGIN / 页边小记</p><h2>文章设置</h2></div><span className="ap-article-small-seal" aria-hidden="true">录</span></header>
        <label className="ap-control"><span>链接（slug）</span>
          <input id="slug" type="text" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value); touchDraft() }} placeholder="my-first-post" />
          <small>文章地址将是 /posts/{slug || '…'}，只含字母、数字和连字符。</small>
        </label>
        <label className="ap-control" htmlFor="excerpt"><span>摘要 · Markdown</span>
          <textarea id="excerpt" aria-label="摘要" value={excerpt} rows={4} onChange={(event) => { setExcerpt(event.target.value); touchDraft() }} placeholder="首页列表里显示的一句话简介（可留空）" />
        </label>
        {excerpt.trim() ? <div className="ap-editor-excerpt-preview" aria-label="摘要预览"><MarkdownView content={excerpt} /></div> : null}
        <div className="ap-editor-publish-state" data-testid="editor-publish-state" data-publish-state={published ? 'published' : 'draft'}>
          <span className="ap-chip">{published ? '当前状态 · 已发布' : '当前状态 · 草稿'}</span>
          <p>保存草稿不会出现在前台；点击发布后才会公开。</p>
        </div>
      </section>
      <section className="ap-sheet ap-editor-tone-sheet" aria-labelledby="editor-tone-title">
        <p className="ap-eyebrow">WRITING SURFACE</p><h2 id="editor-tone-title">挑一张合意的纸。</h2>
        <div className="ap-editor-tones" role="group" aria-label="写作背景">
          {(['paper', 'plain', 'warm', 'night'] as const).map((tone) => <button key={tone} type="button" data-tone={tone} onClick={() => changeEditorTone(tone)}
            aria-label={{ paper: '宣纸', plain: '素白', warm: '暖杏', night: '夜墨' }[tone]} aria-pressed={editorTone === tone}>
            <i aria-hidden="true" /><span>{{ paper: '宣纸', plain: '素白', warm: '暖杏', night: '夜墨' }[tone]}</span>
          </button>)}
        </div>
      </section>
      <div className="ap-editor-quiet-note"><span aria-hidden="true" /><p>文字有自己的步调。<br />慢慢写，也很好。</p></div>
    </aside>
  )

  const saveActions = (
    <div className="ap-editor-actions">
      <button type="button" className="ap-quiet" aria-pressed={immersive} onClick={() => setImmersive((value) => !value)}>{immersive ? '← 返回工作台' : '全屏写作'}</button>
      <button className="ap-button" type="button" onClick={() => void openDraftPreview()} disabled={saving !== null}>预览草稿</button>
      <button className="ap-button" type="button" onClick={() => void save(false)} disabled={saving !== null}>{saving === 'draft' ? '保存中…' : '保存草稿'}</button>
      <button className="ap-button ap-primary" type="button" onClick={() => void save(true)} disabled={saving !== null}>{saving === 'publish' ? '发布中…' : published ? '更新发布' : '发布文章'}</button>
    </div>
  )

  const recoveryDialog = (
    <DraftRecoveryDialog
      open={draftSync.status === 'conflict'}
      local={draftSync.restoreLocal()}
      onRestore={() => {
        const local = draftSync.restoreLocal()
        if (!local) return
        setTitle(local.title)
        setSlug(local.slug)
        setSlugTouched(Boolean(local.slug))
        setExcerpt(local.excerpt)
        setContent(local.content)
        setPublished(local.published)
        setUpdatedAt(new Date().toISOString())
        notify({ kind: 'info', message: '已恢复本地版本，请确认后保存' })
      }}
      onDiscard={() => {
        draftSync.discardLocal()
        notify({ kind: 'info', message: '已继续使用服务器版本' })
      }}
    />
  )

  return (
    <section className={`ap-editor-page${immersive ? ' ap-editor-is-immersive' : ''}`} role="region" aria-label="文章编辑器"
      data-page-state="ready" data-publish-state={published ? 'published' : 'draft'}>
      {recoveryDialog}
      <header className="ap-page-head ap-editor-page-head">
        <div><p className="ap-eyebrow">01 / WRITING ROOM</p><h1>{isEdit ? '编辑文章' : '写新文章'}</h1><p>接着写，慢慢成篇。把心里的句子，落在这一页纸上。</p></div>
        <Link href="/admin/posts" className="ap-quiet">← 文章列表</Link>
      </header>
      <div className="ap-editor-actionbar">
        <div className="ap-editor-save-identity"><span className="ap-article-small-seal" aria-hidden="true">稿</span>
          <span data-testid="editor-save-state" data-save-state={editorSaveState} role="status" aria-live="polite">{editorSaveText}</span>
        </div>{saveActions}
      </div>
      <div className="ap-editor-workspace">{writer}{settings}</div>
      {error ? <p className="ap-editor-error" role="alert">{error}</p> : null}
      <footer className="ap-article-footer">山窗常开，文字常新。<Link href="/admin/posts" className="ap-quiet">取消</Link></footer>
    </section>
  )
}
