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
  }


  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/admin/posts/${id}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/admin/login')
          return null
        }
        return res.ok ? res.json() : null
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
      })
      .catch(() => {
        if (!cancelled) setError('加载文章失败')
      })
    return () => {
      cancelled = true
    }
  }, [id, router])

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


  async function save(nextPublished: boolean) {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      return null
    }
    setSaving(nextPublished ? 'publish' : 'draft')
    try {
      const result = await draftSync.flush(nextPublished)
      setPublished(nextPublished)
      setUpdatedAt(result.updatedAt)
      notify({ kind: 'success', message: nextPublished ? '文章已发布' : '草稿已保存' })
      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
      return null
    } finally {
      setSaving(null)
    }
  }

  async function openDraftPreview() {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving('draft')
    try {
      const result = await draftSync.flush(false)
      setUpdatedAt(result.updatedAt)
      router.push(`/admin/preview/${result.postId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '预览准备失败')
    } finally {
      setSaving(null)
    }
  }

  const writer = (
    <>
      <input
        id="title"
        className="editor-title"
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="这篇文章叫什么？"
      />
      <div className="md-toolbar" role="toolbar" aria-label="Markdown 快捷插入">
        <span className="md-toolbar-label" aria-hidden="true">MARKDOWN</span>
        {toolbar.map((t) => (
          <button key={t.label} type="button" onClick={t.run} title={`插入：${t.label}`}>
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className={mode === 'preview' ? 'on' : ''}
          onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          title="切换编辑 / 预览"
        >
          {mode === 'edit' ? '预览' : '编辑'}
        </button>
        <span className="editor-tone-label">底色</span>
        <span className="editor-tone-picker" aria-label="写作背景">
          {(['paper', 'plain', 'warm', 'night'] as const).map((tone) => (
            <button
              key={tone}
              type="button"
              className={`editor-tone-swatch tone-${tone}${editorTone === tone ? ' active' : ''}`}
              onClick={() => changeEditorTone(tone)}
              aria-label={{ paper: '宣纸', plain: '素白', warm: '暖杏', night: '夜墨' }[tone]}
              aria-pressed={editorTone === tone}
              title={{ paper: '宣纸', plain: '素白', warm: '暖杏', night: '夜墨' }[tone]}
            />
          ))}
        </span>
      </div>
      {mode === 'edit' ? (
        <textarea
          ref={contentRef}
          className="editor-body"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            touchDraft()
          }}
          onKeyDown={handleEditorKeyDown}
          placeholder={'用 Markdown 写作，支持 **加粗**、[链接](https://…)、代码块、表格等。'}
          spellCheck={false}
        />
      ) : (
        <div className="preview-pane">
          {content.trim() ? (
            <MarkdownView content={content} />
          ) : (
            <p style={{ color: 'var(--ink-faint)' }}>还没有内容，切回「编辑」开始写。</p>
          )}
        </div>
      )}
      <div className="editor-status" aria-live="polite">
        <span>{characterCount} 字</span>
        <span>{paragraphCount} 段</span>
        <span>{saveStatusText}</span>
      </div>
    </>
  )

  const settings = (
    <details className="editor-settings">
      <summary>文章设置</summary>
      <div className="field">
        <label htmlFor="slug">链接（slug）</label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
            touchDraft()
          }}
          placeholder="my-first-post"
        />
        <div className="hint">文章地址将是 /posts/{slug || '…'}，只含字母、数字和连字符。</div>
      </div>
      <div className="field">
        <label htmlFor="excerpt">摘要</label>
        <input
          id="excerpt"
          type="text"
          value={excerpt}
          onChange={(e) => {
            setExcerpt(e.target.value)
            touchDraft()
          }}
          placeholder="首页列表里显示的一句话简介（可留空）"
        />
      </div>
      <div className="editor-publish-state">
        <span className={published ? 'published' : undefined}>{published ? '当前状态 · 已发布' : '当前状态 · 草稿'}</span>
        <p>保存草稿不会出现在前台；点击发布后才会公开。</p>
      </div>
    </details>
  )

  const saveActions = (
    <div className="editor-save-actions">
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void openDraftPreview()} disabled={saving !== null}>
        预览草稿
      </button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void save(false)} disabled={saving !== null}>
        {saving === 'draft' ? '保存中…' : '保存草稿'}
      </button>
      <button className="btn btn-sm" type="button" onClick={() => void save(true)} disabled={saving !== null}>
        {saving === 'publish' ? '发布中…' : published ? '更新发布' : '发布文章'}
      </button>
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

  if (immersive) {
    return (
      <div className="editor-immersive">
        {recoveryDialog}
        <div className="editor-immersive-top">
          <button type="button" className="editor-quiet-action" onClick={() => setImmersive(false)}>
            ← 返回工作台
          </button>
          <span className="editor-immersive-title">{title || '未命名文章'}</span>
          {saveActions}
        </div>
        <div className={`editor-stage editor-stage-immersive editor-tone-${editorTone}`}>
          {writer}
          {settings}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <>
      {recoveryDialog}
      <div className="editor-topbar">
        <Link href="/admin" className="back-link">
          ← 文章列表
        </Link>
        <div className="editor-top-title">
          <span>WRITING ROOM</span>
          <h1>{isEdit ? '编辑文章' : '写新文章'}</h1>
        </div>
        <div className="editor-top-actions">
          <button type="button" className="editor-quiet-action" onClick={() => setImmersive(true)}>
            全屏写作
          </button>
          {saveActions}
        </div>
      </div>

      <div className={`editor-stage editor-tone-${editorTone}`}>
        {writer}
        {settings}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="editor-actions">
        <Link href="/admin" className="btn btn-ghost">
          取消
        </Link>
      </div>
    </>
  )
}
