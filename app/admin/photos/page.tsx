'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'

type AdminPhoto = {
  id: string
  url: string
  caption: string
  created_at: string
}

export default function AdminPhotos() {
  const router = useRouter()
  const [photos, setPhotos] = useState<AdminPhoto[]>([])
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/photos')
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('加載失敗')
      setPhotos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加載失敗')
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function upload(files: FileList | null) {
    if (!files) return
    setBusy(true)
    setError('')
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('bucket', 'photos')
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || '上傳失敗')
        continue
      }
      const { url } = await res.json()
      await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, caption }),
      })
    }
    setBusy(false)
    setCaption('')
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('確定刪除這張照片？')) return
    await fetch(`/api/admin/photos/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="admin-toolbar">
        <h1>相冊管理</h1>
      </div>

      <div className="album-upload">
        <input
          type="text"
          className="album-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="照片說明（可留空）"
        />
        <label className="btn btn-sm">
          {busy ? '上傳中…' : '＋ 上傳照片'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="album-grid" style={{ marginTop: 26 }}>
        {photos.map((p) => (
          <figure key={p.id} className="album-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption || '照片'} loading="lazy" />
            {p.caption ? <figcaption>{p.caption}</figcaption> : null}
            <span className="album-date">{formatDate(p.created_at)}</span>
            <button
              type="button"
              className="album-del"
              onClick={() => remove(p.id)}
              aria-label="刪除照片"
            >
              ×
            </button>
          </figure>
        ))}
      </div>
      {photos.length === 0 && !error ? (
        <p className="moments-empty">相冊還空著。</p>
      ) : null}
    </>
  )
}
