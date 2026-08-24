'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { PhotoStagingGrid, type PhotoStagingMetadata } from '@/components/admin/PhotoStagingGrid'
import { runAdminAction } from '@/lib/admin-action'
import { useUploadQueue } from '@/lib/upload-queue'

type AdminPhoto = {
  id: string
  url: string
  caption: string
  album_id: string | null
  sort_order: number
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
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const uploads = useUploadQueue({ bucket: 'photos', concurrency: 2 })
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null)
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const [metadata, setMetadata] = useState<PhotoStagingMetadata>({})
  const [persistErrors, setPersistErrors] = useState<Record<string, string>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingPhoto, setEditingPhoto] = useState<AdminPhoto | null>(null)
  const [editingAlbum, setEditingAlbum] = useState<AdminAlbum | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onUnauthorized = useCallback(() => {
    router.replace('/admin/login?next=%2Fadmin%2Fphotos')
  }, [router])

  const load = useCallback(async () => {
    setError('')
    try {
      const [photoRows, albumRows] = await Promise.all([
        runAdminAction<AdminPhoto[]>(fetch('/api/admin/photos'), { onUnauthorized }),
        runAdminAction<AdminAlbum[]>(fetch('/api/admin/albums'), { onUnauthorized }),
      ])
      setPhotos(photoRows)
      setAlbums(albumRows)
    } catch (cause) {
      setPhotos([])
      setError(cause instanceof Error ? cause.message : '加载照片失败')
    }
  }, [onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setMetadata((current) => {
      const next: PhotoStagingMetadata = {}
      uploads.items.forEach((item) => {
        next[item.id] = current[item.id] ?? { caption: '', albumId: '' }
      })
      return next
    })
  }, [uploads.items])

  async function confirmUpload() {
    if (!uploads.items.length || busy) return
    setBusy(true)
    setError('')
    setPersistErrors({})
    try {
      const results = await uploads.start()
      const nextErrors: Record<string, string> = {}
      let savedCount = 0

      for (const item of results) {
        if (item.status === 'error') {
          nextErrors[item.id] = item.error ?? '文件上传失败'
          continue
        }
        if (item.status !== 'done' || !item.url) continue
        const values = metadata[item.id] ?? { caption: '', albumId: '' }
        try {
          await runAdminAction(
            fetch('/api/admin/photos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: item.url,
                caption: values.caption,
                album_id: values.albumId || null,
              }),
            }),
            { onUnauthorized },
          )
          uploads.remove(item.id)
          savedCount += 1
        } catch (cause) {
          nextErrors[item.id] = cause instanceof Error ? cause.message : '保存照片失败'
        }
      }

      setPersistErrors(nextErrors)
      if (savedCount) {
        notify({ kind: 'success', message: `已保存 ${savedCount} 张照片` })
        await load()
      }
      if (Object.keys(nextErrors).length) {
        setError('部分照片未完成，已保留在暂存区，可修正后重试。')
      }
    } finally {
      setBusy(false)
    }
  }

  async function createAlbum() {
    if (!newTitle.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await runAdminAction(
        fetch('/api/admin/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, description: newDescription }),
        }),
        { onUnauthorized },
      )
      setNewTitle('')
      setNewDescription('')
      notify({ kind: 'success', message: '相册已创建' })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建相册失败')
    } finally {
      setBusy(false)
    }
  }

  async function saveAlbum() {
    if (!editingAlbum?.title.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await runAdminAction(
        fetch(`/api/admin/albums/${editingAlbum.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingAlbum.title,
            description: editingAlbum.description,
          }),
        }),
        { onUnauthorized },
      )
      notify({ kind: 'success', message: '相册信息已更新' })
      setEditingAlbum(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '更新相册失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeAlbum(album: AdminAlbum) {
    const accepted = await confirm({
      title: `删除相册：“${album.title}”？`,
      description: '只会删除相册，里面的照片会保留并移出该相册。',
      confirmLabel: '删除相册',
    })
    if (!accepted) return
    try {
      await runAdminAction(fetch(`/api/admin/albums/${album.id}`, { method: 'DELETE' }), { onUnauthorized })
      notify({ kind: 'success', message: `相册“${album.title}”已删除，照片仍保留` })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除相册失败')
    }
  }

  async function savePhoto() {
    if (!editingPhoto || busy) return
    setBusy(true)
    setError('')
    try {
      await runAdminAction(
        fetch(`/api/admin/photos/${editingPhoto.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: editingPhoto.caption,
            album_id: editingPhoto.album_id,
            sort_order: editingPhoto.sort_order,
          }),
        }),
        { onUnauthorized },
      )
      notify({ kind: 'success', message: '照片信息已更新' })
      setEditingPhoto(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '更新照片失败')
    } finally {
      setBusy(false)
    }
  }

  async function changeOrder(photo: AdminPhoto, delta: number) {
    try {
      await runAdminAction(
        fetch(`/api/admin/photos/${photo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: Math.max(0, photo.sort_order + delta) }),
        }),
        { onUnauthorized },
      )
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '调整顺序失败')
    }
  }

  async function removePhoto(photo: AdminPhoto) {
    const accepted = await confirm({
      title: '删除这张照片？',
      description: photo.caption ? `“${photo.caption}”将被永久删除。` : '这张照片记录将被永久删除。',
      confirmLabel: '删除照片',
    })
    if (!accepted) return
    try {
      await runAdminAction(fetch(`/api/admin/photos/${photo.id}`, { method: 'DELETE' }), { onUnauthorized })
      notify({ kind: 'success', message: '照片已删除' })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除照片失败')
    }
  }

  const albumOf = (id: string | null) => albums.find((album) => album.id === id)

  return (
    <>
      {dialog}
      <AdminPageHead
        index="03"
        eyebrow="PHOTO CABINET"
        title="光影"
        description="归拢照片，为每一帧留下名字。"
      />

      <section className="admin-album-create" aria-labelledby="new-album-title">
        <div className="admin-album-create-mark" aria-hidden="true">册</div>
        <div className="admin-album-create-copy">
          <span>NEW COLLECTION</span>
          <h2 id="new-album-title">新建相册</h2>
          <p>先给一组照片留出位置，之后再慢慢装满。</p>
        </div>
        <div className="admin-album-create-fields">
          <label>
            <span>相册标题</span>
            <input type="text" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
          </label>
          <label>
            <span>一句说明</span>
            <input type="text" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
          </label>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void createAlbum()} disabled={busy || !newTitle.trim()}>
          创建相册
        </button>
      </section>

      {albums.length > 0 ? (
        <div className="admin-album-list">
          {albums.map((album) => (
            <article key={album.id} className="admin-album-row">
              {editingAlbum?.id === album.id ? (
                <>
                  <input
                    aria-label="相册标题"
                    value={editingAlbum.title}
                    onChange={(event) => setEditingAlbum({ ...editingAlbum, title: event.target.value })}
                  />
                  <input
                    aria-label="相册说明"
                    value={editingAlbum.description}
                    onChange={(event) => setEditingAlbum({ ...editingAlbum, description: event.target.value })}
                  />
                  <button type="button" className="btn btn-sm" onClick={() => void saveAlbum()} disabled={!editingAlbum.title.trim()}>保存</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingAlbum(null)}>取消</button>
                </>
              ) : (
                <>
                  <div><strong>{album.title}</strong><p>{album.description || '暂无说明'}</p></div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingAlbum({ ...album })}>编辑</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void removeAlbum(album)}>删除相册</button>
                </>
              )}
            </article>
          ))}
        </div>
      ) : <p className="hint">还没有相册，可以先创建一个。</p>}

      <PhotoStagingGrid
        controller={uploads}
        albums={albums}
        metadata={metadata}
        errors={persistErrors}
        onMetadata={(id, value) => setMetadata((current) => ({ ...current, [id]: value }))}
      />
      {uploads.items.length ? (
        <button type="button" className="btn" onClick={() => void confirmUpload()} disabled={busy || uploads.busy}>
          {busy || uploads.busy ? '上传处理中…' : '确认上传'}
        </button>
      ) : null}

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      {photos === null ? (
        <p className="hint" role="status">正在加载照片…</p>
      ) : photos.length === 0 ? (
        <div className="empty-state"><div className="big">空</div>相册还空着。</div>
      ) : (
        <div className="album-grid" style={{ marginTop: 26 }}>
          {photos.map((photo) => (
            <figure key={photo.id} className="album-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" />
              {editingPhoto?.id === photo.id ? (
                <div className="photo-inline-editor">
                  <input
                    aria-label="照片说明"
                    value={editingPhoto.caption}
                    onChange={(event) => setEditingPhoto({ ...editingPhoto, caption: event.target.value })}
                  />
                  <select
                    aria-label="照片相册"
                    value={editingPhoto.album_id ?? ''}
                    onChange={(event) => setEditingPhoto({ ...editingPhoto, album_id: event.target.value || null })}
                  >
                    <option value="">不归入相册</option>
                    {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" onClick={() => void savePhoto()}>保存</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingPhoto(null)}>取消</button>
                </div>
              ) : (
                <>
                  {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                  <span className="album-date">
                    {albumOf(photo.album_id) ? `${albumOf(photo.album_id)!.title} · ` : ''}
                    {formatDate(photo.created_at)}
                  </span>
                  <div className="photo-card-actions">
                    <button type="button" onClick={() => void changeOrder(photo, -1)} aria-label="向前移动">←</button>
                    <button type="button" onClick={() => void changeOrder(photo, 1)} aria-label="向后移动">→</button>
                    <button type="button" onClick={() => setEditingPhoto({ ...photo })}>编辑</button>
                    <button type="button" onClick={() => void removePhoto(photo)}>删除</button>
                  </div>
                </>
              )}
            </figure>
          ))}
        </div>
      )}
    </>
  )
}
