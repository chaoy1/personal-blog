'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'
import { useAppStore, type AlbumItem, type PhotoItem } from '@/lib/app-store'

type View = { mode: 'list' } | { mode: 'album'; album: AlbumItem } | { mode: 'all' }

export default function AlbumPage() {
  const {
    user,
    albums,
    photos,
    error,
    ready,
    refreshAlbums,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    deletePhoto,
  } = useAppStore()
  const [view, setView] = useState<View>({ mode: 'list' })
  const [caption, setCaption] = useState('')
  const [uploadAlbum, setUploadAlbum] = useState('all')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const photosOf = (albumId: string) => photos.filter((p) => p.album_id === albumId)
  const orphanPhotos = photos.filter((p) => !p.album_id)
  const coverOf = (album: AlbumItem) => album.cover_url || photosOf(album.id)[0]?.url || ''

  async function createNewAlbum() {
    if (!user || !newTitle.trim()) return
    setBusy(true)
    setLocalError('')
    const album = await createAlbum(newTitle.trim(), newDesc.trim())
    setBusy(false)
    if (!album) {
      setLocalError('创建相册失败')
      return
    }
    setNewTitle('')
    setNewDesc('')
    setShowNew(false)
    setView({ mode: 'album', album })
  }

  async function saveAlbumEdit() {
    if (view.mode !== 'album' || !editTitle.trim()) return
    setBusy(true)
    setLocalError('')
    const err = await updateAlbum(view.album.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
    })
    setBusy(false)
    if (err) {
      setLocalError(err)
      return
    }
    setEditing(false)
    const updated = albums.find((a) => a.id === view.album.id)
    if (updated) setView({ mode: 'album', album: updated })
  }

  async function removeAlbum(album: AlbumItem) {
    if (!window.confirm(`确定删除相册「${album.title}」？相册里的照片不会被删除，只是移出该相册。`)) {
      return
    }
    setLocalError('')
    const err = await deleteAlbum(album.id)
    if (err) {
      setLocalError(err)
      return
    }
    setView({ mode: 'list' })
  }

  async function upload(files: FileList | null) {
    if (!files || !user) return
    setBusy(true)
    setLocalError('')
    const targetAlbum = uploadAlbum === 'all' ? null : uploadAlbum
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadErr } = await supabaseBrowser()
        .storage.from('photos')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadErr) {
        setLocalError(`上传失败：${uploadErr.message}`)
        continue
      }
      try {
        await supabaseBrowser().from('photos').insert({
          user_id: user.id,
          url: storagePublicUrl('photos', path),
          caption: caption.trim(),
          album_id: targetAlbum,
        })
      } catch {
        // ignore
      }
    }
    setBusy(false)
    setCaption('')
    await refreshAlbums()
  }

  async function removePhoto(id: string) {
    if (!window.confirm('确定删除这张照片？')) return
    setLocalError('')
    const err = await deletePhoto(id)
    if (err) setLocalError(err)
  }

  const isOwnerOf = (userId: string) => user?.id === userId

  const uploadBar = (
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
        value={uploadAlbum}
        onChange={(e) => setUploadAlbum(e.target.value)}
        aria-label="存入相册"
      >
        <option value="all">全部照片</option>
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
  )

  const photoGrid = (list: PhotoItem[]) => (
    <div className="album-grid">
      {list.map((photo) => (
        <figure key={photo.id} className="album-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" />
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
          <span className="album-date">{formatDate(photo.created_at)}</span>
          {isOwnerOf(photo.user_id) ? (
            <button
              type="button"
              className="album-del"
              onClick={() => removePhoto(photo.id)}
              aria-label="删除照片"
            >
              ×
            </button>
          ) : null}
        </figure>
      ))}
    </div>
  )

  const currentAlbum = view.mode === 'album' ? view.album : null
  const currentPhotos = currentAlbum
    ? photosOf(currentAlbum.id)
    : view.mode === 'all'
      ? orphanPhotos
      : []

  return (
    <div className="wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>相册</span>
      </nav>

      <article className="article" style={{ maxWidth: 940 }}>
        <p className="eyebrow">ALBUM</p>
        <h1>
          相册
          <span className="article-seal" aria-hidden="true">
            影
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {user ? uploadBar : <p className="moments-login-tip"><Link href="/login">登录</Link> 后即可上传照片。</p>}
        {error || localError ? <p className="error-text">{localError || error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载相册…</p> : null}

        {view.mode === 'list' ? (
          <>
            {user ? (
              <div className="album-toolbar">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? '收起' : '+ 新建相册'}
                </button>
              </div>
            ) : null}

            {showNew ? (
              <div className="album-edit-form">
                <input
                  type="text"
                  className="album-caption"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="相册标题，如「2026 年初」"
                />
                <textarea
                  className="album-desc-input"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="相册说明（可留空）"
                />
                <div className="album-edit-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={createNewAlbum}
                    disabled={busy || !newTitle.trim()}
                  >
                    创建
                  </button>
                </div>
              </div>
            ) : null}

            <div className="albums-grid">
              {albums.map((album) => {
                const cover = coverOf(album)
                const count = photosOf(album.id).length
                return (
                  <button
                    key={album.id}
                    type="button"
                    className="album-card"
                    onClick={() => setView({ mode: 'album', album })}
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="album-cover" src={cover} alt={album.title} loading="lazy" />
                    ) : (
                      <span className="album-cover placeholder">影</span>
                    )}
                    <span className="album-card-title">{album.title}</span>
                    {album.description ? (
                      <span className="album-card-desc">{album.description}</span>
                    ) : null}
                    <span className="album-card-meta">
                      {count} 张 · {formatDate(album.created_at)}
                    </span>
                    {isOwnerOf(album.user_id) ? (
                      <span
                        className="album-del"
                        role="button"
                        aria-label="删除相册"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAlbum(album)
                        }}
                      >
                        ×
                      </span>
                    ) : null}
                  </button>
                )
              })}
              {orphanPhotos.length > 0 ? (
                <button type="button" className="album-card" onClick={() => setView({ mode: 'all' })}>
                  {orphanPhotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="album-cover" src={orphanPhotos[0].url} alt="全部照片" loading="lazy" />
                  ) : (
                    <span className="album-cover placeholder">影</span>
                  )}
                  <span className="album-card-title">全部照片</span>
                  <span className="album-card-desc">未归入相册的照片</span>
                  <span className="album-card-meta">{orphanPhotos.length} 张</span>
                </button>
              ) : null}
            </div>
            {ready && albums.length === 0 && orphanPhotos.length === 0 && !error ? (
              <p className="moments-empty">相册还空着，先建一本相册吧。</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="album-head">
              <button type="button" className="link-btn" onClick={() => setView({ mode: 'list' })}>
                ← 全部相册
              </button>
              <div className="album-head-text">
                <h2>{currentAlbum ? currentAlbum.title : '全部照片'}</h2>
                {currentAlbum?.description ? (
                  <p className="album-head-desc">{currentAlbum.description}</p>
                ) : null}
                <span className="album-date">
                  {currentPhotos.length} 张
                  {currentAlbum ? ` · ${formatDate(currentAlbum.created_at)}` : ''}
                </span>
              </div>
              {currentAlbum && isOwnerOf(currentAlbum.user_id) ? (
                <div className="album-head-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditing((v) => !v)
                      setEditTitle(currentAlbum.title)
                      setEditDesc(currentAlbum.description)
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeAlbum(currentAlbum)}
                  >
                    删除
                  </button>
                </div>
              ) : null}
            </div>

            {editing && currentAlbum ? (
              <div className="album-edit-form">
                <input
                  type="text"
                  className="album-caption"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="相册标题"
                />
                <textarea
                  className="album-desc-input"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="相册说明（可留空）"
                />
                <div className="album-edit-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={saveAlbumEdit}
                    disabled={busy || !editTitle.trim()}
                  >
                    保存
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                    取消
                  </button>
                </div>
              </div>
            ) : null}

            {currentPhotos.length > 0 ? (
              photoGrid(currentPhotos)
            ) : (
              <p className="moments-empty">这本相册还没有照片，上传第一张吧。</p>
            )}
          </>
        )}
      </article>
    </div>
  )
}
