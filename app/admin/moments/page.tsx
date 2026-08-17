'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'

const MOMENT_DRAFT_KEY = 'admin-moment-draft-v1'

type AdminMoment = {
  id: string
  content: string
  images: string[]
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export default function AdminMoments() {
  const router = useRouter()
  const [moments, setMoments] = useState<AdminMoment[]>([])
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [draftNotice, setDraftNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/moments')
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('加载失败')
      setMoments(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MOMENT_DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as { content?: string; images?: string[] }
        setContent(typeof draft.content === 'string' ? draft.content : '')
        setImages(Array.isArray(draft.images) ? draft.images.filter((item) => typeof item === 'string') : [])
        setDraftNotice('已恢复上次暂存')
      }
    } catch {
      // 暂存损坏时忽略，不影响正常发布
    } finally {
      setDraftReady(true)
    }
  }, [])

  useEffect(() => {
    if (!draftReady) return
    try {
      if (!content.trim() && images.length === 0) localStorage.removeItem(MOMENT_DRAFT_KEY)
      else localStorage.setItem(MOMENT_DRAFT_KEY, JSON.stringify({ content, images }))
    } catch {
      // ignore
    }
  }, [content, images, draftReady])

  async function uploadFiles(files: FileList | null) {
    if (!files) return
    setBusy(true)
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('bucket', 'moments')
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (res.ok) {
        const { url } = await res.json()
        setImages((prev) => [...prev, url])
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j.error || '上传失败')
      }
    }
    setBusy(false)
  }

  async function publish() {
    if (!content.trim() && images.length === 0) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/moments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, images }),
    })
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || '发布失败')
      setBusy(false)
      return
    }
    setBusy(false)
    setContent('')
    setImages([])
    setDraftNotice('')
    try {
      localStorage.removeItem(MOMENT_DRAFT_KEY)
    } catch {
      // ignore
    }
    load()
  }

  function removePendingImage(index: number) {
    setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))
  }

  function clearDraft() {
    setContent('')
    setImages([])
    setDraftNotice('')
  }

  function saveDraft() {
    try {
      localStorage.setItem(MOMENT_DRAFT_KEY, JSON.stringify({ content, images }))
      setDraftNotice('已暂存')
    } catch {
      setError('当前浏览器无法暂存内容')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条闲语？')) return
    await fetch(`/api/admin/moments/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <AdminPageHead
        index="02"
        eyebrow="QUICK NOTES"
        title="闲语"
        description="短句不必完整，记下当下就好。"
      />

      <div className="moments-composer">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setDraftNotice('')
          }}
          placeholder="以博主身份发布闲语…"
        />
        {images.length > 0 ? (
          <div className="moments-images moment-draft-images">
            {images.map((u, i) => (
              <span key={`${u}-${i}`} className="moment-draft-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`待发布配图 ${i + 1}`} />
                <button type="button" onClick={() => removePendingImage(i)} aria-label={`移除第 ${i + 1} 张配图`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="moments-actions">
          <span className="moment-draft-note">
            {draftNotice || (content.trim() || images.length ? '正在自动暂存' : '尚未开始书写')}
          </span>
          <label className="btn btn-ghost btn-sm">
            配图
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </label>
          {content.trim() || images.length ? (
            <button className="btn btn-ghost btn-sm" type="button" onClick={saveDraft} disabled={busy}>
              暂存
            </button>
          ) : null}
          {content.trim() || images.length ? (
            <button className="btn btn-ghost btn-sm" type="button" onClick={clearDraft} disabled={busy}>
              清空暂存
            </button>
          ) : null}
          <button className="btn btn-sm" type="button" onClick={publish} disabled={busy}>
            {busy ? '处理中…' : '发布'}
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="admin-list">
        {moments.map((m, index) => (
          <div key={m.id} className="admin-item">
            <span className="admin-item-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3>{m.content || '（仅图片）'}</h3>
              <div className="meta">
                {formatDate(m.created_at)} · 配图 {m.images.length} 张
              </div>
            </div>
            <div className="ops">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => remove(m.id)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {moments.length === 0 ? (
          <p className="moments-empty">还没有闲语。</p>
        ) : null}
      </div>
    </>
  )
}
