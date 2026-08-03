'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
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
  const isEdit = Boolean(id)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(true)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [immersive, setImmersive] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

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

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(makeSlug(value))
  }

  function insertMarkdown(before: string, after = '', placeholder = '') {
    const ta = contentRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const selected = content.slice(s, e) || placeholder
    setContent(content.slice(0, s) + before + selected + after + content.slice(e))
    requestAnimationFrame(() => {
      ta.focus()
      const start = s + before.length
      ta.setSelectionRange(start, start + selected.length)
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

  async function save() {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    try {
      const payload = { title, slug, excerpt, content, published }
      const res = await fetch(isEdit ? `/api/admin/posts/${id}` : '/api/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '保存失败')
        return
      }
      router.push('/admin')
    } finally {
      setSaving(false)
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
      </div>
      {mode === 'edit' ? (
        <textarea
          ref={contentRef}
          className="editor-body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
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
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="首页列表里显示的一句话简介（可留空）"
        />
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        立即发布（取消勾选则保存为草稿）
      </label>
    </details>
  )

  const saveBtn = (
    <button className="btn btn-sm" type="button" onClick={save} disabled={saving}>
      {saving ? '保存中…' : isEdit ? '保存修改' : '发布文章'}
    </button>
  )

  if (immersive) {
    return (
      <div className="editor-immersive">
        <div className="editor-immersive-top">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImmersive(false)}>
            ← 退出沉浸
          </button>
          <span className="editor-immersive-title">{title || '未命名文章'}</span>
          {saveBtn}
        </div>
        <div className="editor-stage editor-stage-immersive">
          {writer}
          {settings}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="editor-topbar">
        <Link href="/admin" className="back-link">
          ← 文章列表
        </Link>
        <h1>{isEdit ? '编辑文章' : '写新文章'}</h1>
        <div className="editor-top-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImmersive(true)}>
            沉浸写作
          </button>
          {saveBtn}
        </div>
      </div>

      <div className="editor-stage">
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
