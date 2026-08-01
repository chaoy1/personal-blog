'use client'

import { Suspense, useEffect, useState } from 'react'
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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(makeSlug(value))
  }

  async function save() {
    setError('')
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    try {
      const payload = { title, slug, excerpt, content, published }
      const res = await fetch(
        isEdit ? `/api/admin/posts/${id}` : '/api/admin/posts',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
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

  return (
    <>
      <Link href="/admin" className="back-link">
        ← 返回文章列表
      </Link>
      <div className="admin-toolbar" style={{ marginTop: 18 }}>
        <h1>{isEdit ? '编辑文章' : '写新文章'}</h1>
      </div>

      <div className="field">
        <label htmlFor="title">标题</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="这篇文章叫什么？"
        />
      </div>

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

      <div className="tabs">
        <button
          type="button"
          className={`tab ${mode === 'edit' ? 'active' : ''}`}
          onClick={() => setMode('edit')}
        >
          编辑
        </button>
        <button
          type="button"
          className={`tab ${mode === 'preview' ? 'active' : ''}`}
          onClick={() => setMode('preview')}
        >
          预览
        </button>
      </div>

      {mode === 'edit' ? (
        <div className="field">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'用 Markdown 写作，支持 **加粗**、[链接](https://…)、代码块、表格等。'}
          />
        </div>
      ) : (
        <div className="preview-pane">
          {content.trim() ? (
            <MarkdownView content={content} />
          ) : (
            <p style={{ color: 'var(--ink-faint)' }}>还没有内容，切回「编辑」开始写。</p>
          )}
        </div>
      )}

      <label className="check-row">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        立即发布（取消勾选则保存为草稿）
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="editor-actions">
        <button className="btn" type="button" onClick={save} disabled={saving}>
          {saving ? '保存中…' : isEdit ? '保存修改' : '发布文章'}
        </button>
        <Link href="/admin" className="btn btn-ghost">
          取消
        </Link>
      </div>
    </>
  )
}
