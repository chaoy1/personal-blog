'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'

type AdminPhoto = {
  id: string
  url: string
  caption: string
  album_id: string | null
  created_at: string
}

type AdminAlbum = {
  id: string
  title: string
  description: string
  created_at: string
}

export default function AdminPhotos() {
  const router = useRouter()
  const [photos, setPhotos] = useState<AdminPhoto[]>([])
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const [caption, setCaption] = useState('')
  const [albumId, setAlbumId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([fetch('/api/admin/photos'), fetch('/api/admin/albums')])
      if (pRes.status === 401 || aRes.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!pRes.ok || !aRes.ok) throw new Error('加载失败')
      setPhotos(await pRes.json())
      setAlbums(await aRes.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
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
        setError(j.error || '上传失败')
        continue
      }
      const { url } = await res.json()
      const pRes = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, caption, album_id: albumId || null }),
      })
      if (!pRes.ok) {
        const j = await pRes.json().catch(() => ({}))
        setError(j.error || '保存照片失败')
      }
    }
    setBusy(false)
    setCaption('')
    load()
  }

  async function createAlbum() {
    if (!newTitle.trim()) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: '' }),
    })
    setBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || '创建相册失败')
      return
    }
    setNewTitle('')
    load()
  }

  async function removeAlbum(id: string) {
    if (!window.confirm('确定删除这个相册？相册里的照片不会被删除，只是移出该相册。')) return
    const res = await fetch(`/api/admin/albums/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || '删除相册失败')
      return
    }
    if (albumId === id) setAlbumId('')
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这张照片？')) return
    await fetch(`/api/admin/photos/${id}`, { method: 'DELETE' })
    load()
  }

  const albumOf = (id: string | null) => albums.find((a) => a.id === id)

  return (
    <>
      <div className="admin-toolbar">
        <h1>相册管理</h1>
      </div>

      <div className="admin-album-create">
        <input
          type="text"
          className="album-caption"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新相册标题"
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={createAlbum}
          disabled={busy || !newTitle.trim()}
        >
          新建相册
        </button>
      </div>

      {albums.length > 0 ? (
        <div className="admin-album-chips">
          {albums.map((a) => (
            <span key={a.id} className="admin-album-chip">
              {a.title}
              <button type="button" aria-label={`删除相册 ${a.title}`} onClick={() => removeAlbum(a.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="album-upload">
        <input
          type="text"
          className="album-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="照片说明（可留空）"
        />
        <select
          className="album-pick"
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          aria-label="存入相册"
        >
          <option value="">全部照片（不归入相册）</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <label className="btn btn-sm">
          {busy ? '上传中…' : '+ 上传照片'}
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
            <span className="album-date">
              {albumOf(p.album_id) ? `${albumOf(p.album_id)!.title} · ` : ''}
              {formatDate(p.created_at)}
            </span>
            <button
              type="button"
              className="album-del"
              onClick={() => remove(p.id)}
              aria-label="删除照片"
            >
              ×
            </button>
          </figure>
        ))}
      </div>
      {photos.length === 0 && !error ? (
        <p className="moments-empty">相册还空着。</p>
      ) : null}
    </>
  )
}
