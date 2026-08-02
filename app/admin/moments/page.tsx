'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'

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
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条说说？')) return
    await fetch(`/api/admin/moments/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="admin-toolbar">
        <h1>说说管理</h1>
      </div>

      <div className="moments-composer">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="以博主身份发布说说…"
        />
        {images.length > 0 ? (
          <div className="moments-images">
            {images.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt="配图" />
            ))}
          </div>
        ) : null}
        <div className="moments-actions">
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
          <button className="btn btn-sm" type="button" onClick={publish} disabled={busy}>
            {busy ? '处理中…' : '发布'}
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="admin-list">
        {moments.map((m) => (
          <div key={m.id} className="admin-item">
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
          <p className="moments-empty">还没有说说。</p>
        ) : null}
      </div>
    </>
  )
}
