'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'
import { useDialogBehavior } from '@/components/DialogBehavior'
import './photos-paper.css'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import type { PhotoStagingMetadata } from '@/components/admin/PhotoStagingGrid'
import { runAdminAction } from '@/lib/admin-action'
import { useUploadQueue, type UploadItem } from '@/lib/upload-queue'

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

type PhotoLoadState = 'loading' | 'refreshing' | 'ready' | 'error'
type UploadState = 'idle' | 'processing' | 'partial' | 'success' | 'error'
type PhotoSort = 'manual' | 'newest' | 'oldest'

type PhotoWorkspace = 'library' | 'albums' | 'upload'
const workspaceTabs: { id: PhotoWorkspace; label: string; mark: string }[] = [
  { id: 'library', label: '照片库', mark: '壹' },
  { id: 'albums', label: '相册管理', mark: '贰' },
  { id: 'upload', label: '上传暂存', mark: '叁' },
]
const frameCount = (value: number) => String(value).padStart(2, '0')

function PhotoPreview({ item }: { item: UploadItem }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const url = URL.createObjectURL(item.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [item.file])
  return preview ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={preview} alt={item.file.name} />
  ) : <div className="ap-photo-preview-placeholder" aria-hidden="true">影</div>
}

function PhotoEditorDialog({ title, initialFocusRef, onClose, children }: {
  title: string
  initialFocusRef: RefObject<HTMLInputElement | null>
  onClose(): void
  children: ReactNode
}) {
  const { dialogRef, onKeyDown } = useDialogBehavior<HTMLDivElement>({ open: true, onClose, initialFocusRef })
  return (
    <div className="ap-photo-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className="ap-photo-dialog" role="dialog" aria-modal="true" aria-labelledby="ap-photo-dialog-title" tabIndex={-1} onKeyDown={onKeyDown}>
        <header className="ap-photo-dialog-head">
          <div><p className="ap-eyebrow">COLLECTION / 一册光阴</p><h2 id="ap-photo-dialog-title">{title}</h2></div>
          <button type="button" className="ap-quiet" aria-label="关闭编辑" onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </div>
  )
}

export default function AdminPhotos() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const uploads = useUploadQueue({ bucket: 'photos', concurrency: 2 })
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null)
  const loadedRef = useRef(false)
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const [metadata, setMetadata] = useState<PhotoStagingMetadata>({})
  const [persistErrors, setPersistErrors] = useState<Record<string, string>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingPhoto, setEditingPhoto] = useState<AdminPhoto | null>(null)
  const [editingAlbum, setEditingAlbum] = useState<AdminAlbum | null>(null)
  const [busy, setBusy] = useState(false)
  const [photoLoadState, setPhotoLoadState] = useState<PhotoLoadState>('loading')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [activeAlbumId, setActiveAlbumId] = useState('')
  const [photoQuery, setPhotoQuery] = useState('')
  const [albumFilter, setAlbumFilter] = useState('')
  const [photoSort, setPhotoSort] = useState<PhotoSort>('manual')
  const [error, setError] = useState('')
  const [workspace, setWorkspace] = useState<PhotoWorkspace>('library')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [discardPrompt, setDiscardPrompt] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [dragging, setDragging] = useState(false)
  const editorFieldRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Partial<Record<PhotoWorkspace, HTMLButtonElement | null>>>({})

  const onUnauthorized = useCallback(() => {
    router.replace('/admin/login?next=%2Fadmin%2Fphotos')
  }, [router])

  const load = useCallback(async () => {
    const hasSnapshot = loadedRef.current
    setError('')
    setPhotoLoadState(hasSnapshot ? 'refreshing' : 'loading')
    try {
      const [photoRows, albumRows] = await Promise.all([
        runAdminAction<AdminPhoto[]>(fetch('/api/admin/photos'), { onUnauthorized }),
        runAdminAction<AdminAlbum[]>(fetch('/api/admin/albums'), { onUnauthorized }),
      ])
      setPhotos(photoRows)
      setAlbums(albumRows)
      loadedRef.current = true
      setPhotoLoadState('ready')
    } catch (cause) {
      if (!hasSnapshot) {
        setPhotos([])
        setAlbums([])
      }
      setPhotoLoadState('error')
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
        next[item.id] = current[item.id] ?? { caption: '', albumId: activeAlbumId }
      })
      return next
    })
  }, [uploads.items, activeAlbumId])

  const visiblePhotos = useMemo(() => {
    const needle = photoQuery.trim().toLocaleLowerCase('zh-CN')
    const filtered = (photos ?? []).filter((photo) => {
      const matchesQuery = !needle || photo.caption.toLocaleLowerCase('zh-CN').includes(needle) || photo.url.toLocaleLowerCase('zh-CN').includes(needle)
      const matchesAlbum = !albumFilter || (albumFilter === 'unfiled' ? !photo.album_id : photo.album_id === albumFilter)
      return matchesQuery && matchesAlbum
    })

    return [...filtered].sort((left, right) => {
      if (photoSort === 'newest') return right.created_at.localeCompare(left.created_at)
      if (photoSort === 'oldest') return left.created_at.localeCompare(right.created_at)
      return left.sort_order - right.sort_order
    })
  }, [albumFilter, photoQuery, photoSort, photos])

  async function selectActiveAlbum(nextAlbumId: string) {
    if (nextAlbumId === activeAlbumId) return
    if (uploads.items.length) {
      const accepted = await confirm({
        title: '切换当前相册？',
        description: '待上传队列会保留，但之后选择的照片将归入新的当前相册。',
        confirmLabel: '切换相册',
      })
      if (!accepted) return
    }
    setActiveAlbumId(nextAlbumId)
    if (nextAlbumId) {
      setMetadata((current) => {
        const next = { ...current }
        uploads.items.forEach((item) => {
          next[item.id] = { ...(next[item.id] ?? { caption: '', albumId: '' }), albumId: nextAlbumId }
        })
        return next
      })
    }
  }

  async function confirmUpload() {
    if (!uploads.items.length || busy) return
    setBusy(true)
    setUploadState('processing')
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
        setUploadState('partial')
        setError('部分照片未完成，已保留在暂存区，可修正后重试。')
      } else if (savedCount) {
        setUploadState('success')
      } else {
        setUploadState('idle')
      }
    } catch (cause) {
      setUploadState('error')
      setError(cause instanceof Error ? cause.message : '上传失败，队列已保留。')
    } finally {
      setBusy(false)
    }
  }

  async function createAlbum() {
    if (!newTitle.trim() || busy) return
    setBusy(true)
    setError('')
    setDialogError('')
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
      setCreatingAlbum(false)
      notify({ kind: 'success', message: '相册已创建' })
      await load()
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : '创建相册失败')
    } finally {
      setBusy(false)
    }
  }

  async function saveAlbum() {
    if (!editingAlbum?.title.trim() || busy) return
    setBusy(true)
    setError('')
    setDialogError('')
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
      setDialogError(cause instanceof Error ? cause.message : '更新相册失败')
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
      if (activeAlbumId === album.id) setActiveAlbumId('')
      if (albumFilter === album.id) setAlbumFilter('')
      setMetadata((current) => Object.fromEntries(Object.entries(current).map(([id, values]) => [id, values.albumId === album.id ? { ...values, albumId: '' } : values])))
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
    setDialogError('')
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
      setDialogError(cause instanceof Error ? cause.message : '更新照片失败')
    } finally {
      setBusy(false)
    }
  }

  async function changeOrder(photo: AdminPhoto, delta: number) {
    if (busy || photoSort !== 'manual') return
    setBusy(true)
    setError('')
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
    } finally {
      setBusy(false)
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

  const listBusy = photoLoadState === 'refreshing'
  const sortedPhotos = useMemo(() => [...(photos ?? [])].sort((left, right) => left.sort_order - right.sort_order), [photos])
  const originalPhoto = photos?.find((photo) => photo.id === editingPhoto?.id)
  const originalAlbum = albums.find((album) => album.id === editingAlbum?.id)
  const editorDirty = creatingAlbum ? Boolean(newTitle || newDescription) : editingAlbum ? (
    editingAlbum.title !== originalAlbum?.title || editingAlbum.description !== originalAlbum?.description
  ) : editingPhoto ? (
    editingPhoto.caption !== originalPhoto?.caption || editingPhoto.album_id !== originalPhoto?.album_id
  ) : false

  useEffect(() => {
    if (!editorDirty && !uploads.items.length) return
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [editorDirty, uploads.items.length])

  function closeEditor(discard = false) {
    if (busy) return
    if (editorDirty && !discard) { setDiscardPrompt(true); return }
    setCreatingAlbum(false)
    setEditingAlbum(null)
    setEditingPhoto(null)
    setNewTitle('')
    setNewDescription('')
    setDiscardPrompt(false)
    setDialogError('')
  }

  function openAlbum(album?: AdminAlbum) {
    setEditingAlbum(album ? { ...album } : null)
    setCreatingAlbum(!album)
    setDiscardPrompt(false)
    setDialogError('')
  }

  function viewAlbum(id: string) { setAlbumFilter(id); setPhotoQuery(''); setWorkspace('library') }
  const enqueuePhotos = (files: File[]) => uploads.enqueue(files.filter((file) => file.type.startsWith('image/')))

  return (
    <section className="ap-photos" role="region" aria-label="照片管理" data-page-state={photoLoadState}>
      {dialog}
      <header className="ap-page-head ap-photo-page-head">
        <div>
          <p className="ap-eyebrow">PHOTO CABINET / 沿途所见</p>
          <h1>为光影，留一处归所。 <i className="ap-photo-seal" aria-hidden="true">藏</i></h1>
          <p className="ap-description">给每一帧留下名字，把一起走过的日子，慢慢收成册。</p>
        </div>
        <button type="button" className="ap-button ap-primary" onClick={() => { setWorkspace('upload'); tabRefs.current.upload?.focus() }}>＋ 收几帧光影</button>
      </header>

      <section className="ap-photo-inventory" aria-label="光影概览">
        <div><span className="ap-photo-film-mark" aria-hidden="true">影</span><p>沿途的风景，已在案头。<small>PHOTO INDEX · 收藏目录</small></p></div>
        <dl><div><dt>已收光影</dt><dd><b>{photos === null ? '—' : frameCount(photos.length)}</b> 帧</dd></div><div><dt>相册</dt><dd><b>{photoLoadState === 'loading' ? '—' : frameCount(albums.length)}</b> 册</dd></div><div><dt>待整理</dt><dd><b>{frameCount(uploads.items.length)}</b> 帧</dd></div></dl>
      </section>
      {error ? <p className="error-text ap-photo-error" role="alert">{error}</p> : null}
      <div className="ap-photo-tabs" role="tablist" aria-label="光影工作区">
        {workspaceTabs.map((tab, index) => (
          <button key={tab.id} ref={(node) => { tabRefs.current[tab.id] = node }} id={`ap-photo-tab-${tab.id}`} type="button" role="tab" aria-selected={workspace === tab.id} aria-controls={`ap-photo-${tab.id}`} tabIndex={workspace === tab.id ? 0 : -1}
            onClick={() => setWorkspace(tab.id)} onKeyDown={(event) => {
              let next = index
              if (event.key === 'ArrowRight') next = (index + 1) % workspaceTabs.length
              else if (event.key === 'ArrowLeft') next = (index + workspaceTabs.length - 1) % workspaceTabs.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = workspaceTabs.length - 1
              else return
              event.preventDefault()
              setWorkspace(workspaceTabs[next].id)
              tabRefs.current[workspaceTabs[next].id]?.focus()
            }}>{tab.label} <span>{tab.id === 'upload' && uploads.items.length ? frameCount(uploads.items.length) : tab.mark}</span></button>
        ))}
      </div>

      <section id="ap-photo-library" className="ap-sheet ap-photo-library" role="tabpanel" aria-labelledby="ap-photo-tab-library" tabIndex={0} hidden={workspace !== 'library'}>
        <header className="ap-sheet-head"><div><p className="ap-eyebrow">THE CONTACT SHEET / 底片目录</p><h2>留住的片刻</h2></div><p className="ap-photo-head-note">每一张，都是停下来的一瞬。</p></header>
        <div className="ap-photo-filter" role="search" aria-label="照片筛选">
          <label className="ap-control ap-photo-search"><span>寻找光影</span><input type="search" aria-label="搜索照片" value={photoQuery} onChange={(event) => setPhotoQuery(event.target.value)} placeholder="搜索照片说明或地址" /></label>
          <label className="ap-control"><span>相册归属</span><select aria-label="相册筛选" value={albumFilter} onChange={(event) => setAlbumFilter(event.target.value)}><option value="">全部相册</option><option value="unfiled">未归类</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select></label>
          <label className="ap-control"><span>排列方式</span><select aria-label="照片排序" value={photoSort} onChange={(event) => setPhotoSort(event.target.value as PhotoSort)}><option value="manual">手动顺序</option><option value="newest">最新上传</option><option value="oldest">最早上传</option></select></label>
        </div>
        <div className="ap-photo-index-line"><span>FRAME / 光影</span><span>{visiblePhotos.length} 帧 · {photoSort === 'manual' ? '按手动顺序排列' : photoSort === 'newest' ? '按最新收录排列' : '按最早收录排列'}</span></div>
        {listBusy ? <p className="ap-photo-section-note" role="status">正在刷新照片…</p> : null}
        {photos === null ? <><p className="ap-photo-section-note" role="status">正在加载照片…</p><div className="ap-photo-grid ap-photo-grid-skeleton" aria-hidden="true"><div /><div /><div /></div></> : photos.length === 0 ? (
          <div className="ap-empty ap-photo-empty"><h3>这一页，还没有光影。</h3><p>相册还空着，先选择几张照片。</p><button type="button" className="ap-quiet" onClick={() => setWorkspace('upload')}>收几帧光影 ↗</button></div>
        ) : visiblePhotos.length === 0 ? (
          <div className="ap-empty ap-photo-empty"><h3>没有符合筛选条件的照片。</h3><p>试试其他相册，或换一个关键词。</p><button type="button" className="ap-quiet" onClick={() => { setPhotoQuery(''); setAlbumFilter('') }}>清除筛选 ↙</button></div>
        ) : (
          <div className="ap-photo-grid" role="grid" aria-label="照片列表" aria-busy={listBusy}>
            {visiblePhotos.map((photo, index) => (
              <figure key={photo.id} className="ap-photo-card ap-item" role="gridcell" data-photo-id={photo.id}>
                <div className="ap-photo-card-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" /><span className="ap-photo-frame-index" aria-hidden="true">FRAME {frameCount(index + 1)}</span>
                </div>
                <figcaption><h3>{photo.caption || '未命名的光影'}</h3><div className="ap-photo-card-note"><span>{albumOf(photo.album_id)?.title || '未归类'}</span><span aria-hidden="true">·</span><time dateTime={photo.created_at}>{formatDate(photo.created_at)}</time></div></figcaption>
                <div className="ap-photo-card-actions">
                  <button type="button" onClick={() => void changeOrder(photo, -1)} aria-label="向前移动" disabled={busy || listBusy || photoSort !== 'manual' || photo.sort_order === 0 || sortedPhotos[0]?.id === photo.id}>←</button>
                  <button type="button" onClick={() => void changeOrder(photo, 1)} aria-label="向后移动" disabled={busy || listBusy || photoSort !== 'manual' || sortedPhotos.at(-1)?.id === photo.id}>→</button>
                  <button type="button" data-photo-action="edit" disabled={busy} onClick={() => { setEditingPhoto({ ...photo }); setDialogError(''); setDiscardPrompt(false) }}>编辑小记</button>
                  <button type="button" data-photo-action="delete" disabled={busy} onClick={() => void removePhoto(photo)}>删除</button>
                </div>
              </figure>
            ))}
          </div>
        )}
        <footer className="ap-photo-library-foot"><p>说明与归属可以随时整理。前后移动仅在手动顺序下可用。</p><button type="button" className="ap-quiet" disabled={busy || listBusy || photoLoadState === 'loading'} onClick={() => void load()}>{listBusy ? '刷新中…' : '重新加载照片'}</button><button type="button" className="ap-quiet" onClick={() => setWorkspace('albums')}>整理相册 ↗</button></footer>
      </section>

      <section id="ap-photo-albums" className="ap-sheet" role="tabpanel" aria-labelledby="ap-photo-tab-albums" tabIndex={0} hidden={workspace !== 'albums'}>
        <header className="ap-sheet-head"><div><p className="ap-eyebrow">COLLECTION SLEEVES / 相册封套</p><h2>一册一段光阴</h2></div><button type="button" className="ap-button" disabled={busy} onClick={() => openAlbum()}>＋ 新建相册</button></header>
        <p className="ap-photo-section-note">先为一段旅程留出位置，再慢慢装满它。</p>
        {photoLoadState === 'loading' ? <p role="status">正在加载相册…</p> : albums.length ? (
          <div className="ap-photo-album-grid">{albums.map((album, index) => {
            const contents = sortedPhotos.filter((photo) => photo.album_id === album.id)
            return <article key={album.id} className="ap-photo-album-card ap-item">
              <div className="ap-photo-album-cover">{contents[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contents[0].url} alt={`${album.title}相册封面`} loading="lazy" />
              ) : <span aria-hidden="true">册</span>}</div>
              <span className="ap-photo-album-number">COLLECTION / {frameCount(index + 1)}</span><h3>{album.title}</h3><p>{album.description || '留一点余白，等下一段光阴。'}</p>
              <div className="ap-photo-album-meta"><span>{frameCount(contents.length)} 帧光影</span><time dateTime={album.created_at}>{formatDate(album.created_at)}建册</time></div>
              <div className="ap-photo-album-actions"><button type="button" className="ap-quiet" onClick={() => viewAlbum(album.id)}>翻看 ↗</button><button type="button" className="ap-quiet" disabled={busy} onClick={() => openAlbum(album)}>编辑</button><button type="button" className="ap-quiet" disabled={busy} onClick={() => void removeAlbum(album)}>删除相册</button></div>
            </article>
          })}</div>
        ) : <div className="ap-empty"><p>还没有相册，可以先创建一个。</p></div>}
        <div className="ap-photo-unfiled"><span aria-hidden="true">散页</span><div><h3>未归类的光影</h3><p>{(photos ?? []).filter((photo) => !photo.album_id).length} 帧光影，还在等一个归处。</p></div><button type="button" className="ap-quiet" onClick={() => viewAlbum('unfiled')}>翻看散页 ↗</button></div>
      </section>

      <section id="ap-photo-upload" className="ap-sheet" role="tabpanel" aria-labelledby="ap-photo-tab-upload" tabIndex={0} hidden={workspace !== 'upload'}>
        <header className="ap-sheet-head"><div><p className="ap-eyebrow">BEFORE FILING / 暂存桌</p><h2>先放在这里，慢慢整理。</h2></div><span className="ap-chip">待收录 {uploads.items.length} 帧</span></header>
        <div className="ap-photo-upload-intro"><p>选好照片，为它留一句说明，再决定收进哪一册。</p><label className="ap-control"><span>当前相册</span><select value={activeAlbumId} onChange={(event) => void selectActiveAlbum(event.target.value)} disabled={busy || uploads.busy}><option value="">暂不指定</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select></label></div>
        <section aria-label="照片暂存区" data-testid="photo-staging">
          <div className={`ap-photo-drop${dragging ? ' is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) enqueuePhotos(Array.from(event.dataTransfer.files)) }}>
            <span className="ap-photo-drop-mark" aria-hidden="true">影</span><h3>把沿途所见，带回案头。</h3><p>可拖入图片，或从电脑中选择。</p>
            <label className="ap-button ap-primary ap-photo-file-label">选择本地照片<input type="file" aria-label="选择照片（选择后不会立即上传）" accept="image/*" multiple disabled={busy || uploads.busy} onChange={(event) => { enqueuePhotos(Array.from(event.target.files ?? [])); event.target.value = '' }} /></label>
          </div>
          <p className="ap-photo-preview-note">照片先保留在暂存区；确认上传后，文件与说明会一并保存。</p>
          <div className="ap-photo-stage-head"><h3>待收录的照片 <span>{uploads.items.length} 帧</span></h3><button type="button" className="ap-quiet" disabled={!uploads.items.length || busy || uploads.busy} onClick={async () => { const accepted = await confirm({ title: '清空上传暂存？', description: '尚未保存的照片与说明会从队列移除。', confirmLabel: '清空暂存' }); if (accepted) uploads.items.forEach((item) => uploads.remove(item.id)) }}>清空暂存</button></div>
          {uploads.items.length ? <div className="ap-photo-stage-grid">{uploads.items.map((item) => {
            const values = metadata[item.id] ?? { caption: '', albumId: activeAlbumId }
            return <article className="ap-photo-stage-card ap-item" key={item.id}>
              <PhotoPreview item={item} /><span className="ap-photo-stage-name">{item.file.name}</span>
              <p className="ap-photo-stage-status">{item.status === 'uploading' ? `上传中 ${item.progress}%` : item.status === 'error' ? '上传失败' : item.status === 'done' ? '文件已上传，等待保存' : '等待上传'}</p>
              <label className="ap-control"><span>照片说明</span><input type="text" disabled={busy} value={values.caption} onChange={(event) => setMetadata((current) => ({ ...current, [item.id]: { ...values, caption: event.target.value } }))} /></label>
              <label className="ap-control"><span>存入相册</span><select disabled={busy} value={values.albumId} onChange={(event) => setMetadata((current) => ({ ...current, [item.id]: { ...values, albumId: event.target.value } }))}><option value="">不归入相册</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select></label>
              {persistErrors[item.id] || item.error ? <p className="error-text" role="alert">{persistErrors[item.id] || item.error}</p> : null}
              <div className="ap-photo-stage-actions">{item.status === 'error' ? <button type="button" className="ap-quiet" disabled={busy} onClick={() => uploads.retry(item.id)}>重试 {item.file.name}</button> : null}<button type="button" className="ap-quiet" disabled={busy || item.status === 'uploading'} onClick={() => uploads.remove(item.id)}>移出暂存 ×</button></div>
            </article>
          })}</div> : <div className="ap-photo-stage-empty">桌面还空着，选几张照片再开始。</div>}
        </section>
        <footer className="ap-photo-stage-foot"><span data-testid="photo-upload-state" data-upload-state={uploadState} aria-live="polite">{uploadState === 'processing' ? '正在处理上传' : uploadState === 'partial' ? '部分完成，可继续重试' : uploadState === 'success' ? '上传完成' : uploadState === 'error' ? '上传失败，队列已保留' : uploads.items.length ? `${uploads.items.length} 帧待收录 · 确认前可继续整理` : '尚未选择照片'}</span><button type="button" className="ap-button ap-primary" disabled={!uploads.items.length || busy || uploads.busy} onClick={() => void confirmUpload()}>{busy || uploads.busy ? '上传处理中…' : '确认上传'}</button></footer>
      </section>

      <footer className="ap-photo-footer"><span>山窗案头 · 光影有归处。</span><span>FRAMES, KEPT WITH TIME <i className="ap-photo-small-seal" aria-hidden="true">影</i></span></footer>
      {(creatingAlbum || editingAlbum || editingPhoto) ? (
        <PhotoEditorDialog title={editingPhoto ? '为它留一句话' : editingAlbum ? '整理这一册' : '新建相册'} initialFocusRef={editorFieldRef} onClose={() => closeEditor()}>
          <form onSubmit={(event) => { event.preventDefault(); if (editingPhoto) void savePhoto(); else if (editingAlbum) void saveAlbum(); else void createAlbum() }}>
            {editingPhoto ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editingPhoto.url} alt={editingPhoto.caption || '待编辑的照片'} className="ap-photo-edit-image" />
              <label className="ap-control"><span>照片说明</span><input ref={editorFieldRef} value={editingPhoto.caption} disabled={busy} onChange={(event) => setEditingPhoto({ ...editingPhoto, caption: event.target.value })} /></label>
              <label className="ap-control"><span>照片相册</span><select value={editingPhoto.album_id ?? ''} disabled={busy} onChange={(event) => setEditingPhoto({ ...editingPhoto, album_id: event.target.value || null })}><option value="">不归入相册</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select></label>
            </> : <>
              <label className="ap-control"><span>相册标题</span><input ref={editorFieldRef} required disabled={busy} value={editingAlbum?.title ?? newTitle} onChange={(event) => editingAlbum ? setEditingAlbum({ ...editingAlbum, title: event.target.value }) : setNewTitle(event.target.value)} placeholder="给这一册取个名字" /></label>
              <label className="ap-control"><span>一句说明</span><textarea rows={3} disabled={busy} value={editingAlbum?.description ?? newDescription} onChange={(event) => editingAlbum ? setEditingAlbum({ ...editingAlbum, description: event.target.value }) : setNewDescription(event.target.value)} placeholder="关于这段时光，想留下什么？" /></label>
            </>}
            {dialogError ? <p className="error-text ap-photo-error" role="alert">{dialogError}</p> : null}
            {discardPrompt ? <div className="ap-photo-discard" role="alert"><p>还有未保存的修改，要放弃吗？</p><button type="button" className="ap-quiet" onClick={() => setDiscardPrompt(false)}>继续编辑</button><button type="button" className="ap-button" onClick={() => closeEditor(true)}>放弃修改</button></div> : null}
            <footer className="ap-photo-dialog-foot"><button type="button" className="ap-quiet" disabled={busy} onClick={() => closeEditor()}>取消</button><button type="submit" className="ap-button ap-primary" disabled={busy || (!editingPhoto && !(editingAlbum?.title ?? newTitle).trim())}>{busy ? '保存中…' : editingPhoto ? '保存小记 ↗' : editingAlbum ? '保存这一册 ↗' : '创建相册'}</button></footer>
          </form>
        </PhotoEditorDialog>
      ) : null}
    </section>
  )
}
