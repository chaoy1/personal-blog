'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { UploadQueue } from '@/components/admin/UploadQueue'
import { runAdminAction } from '@/lib/admin-action'
import { scheduleDeferredAction } from '@/lib/deferred-action'
import { useUploadQueue } from '@/lib/upload-queue'

const MOMENT_DRAFT_KEY = 'admin-moment-draft-v1'

type AdminMoment = {
  id: string
  content: string
  images: string[]
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

type ListState = 'loading' | 'refreshing' | 'ready' | 'error'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type ComposerBaseline = {
  editingId: string | null
  content: string
  images: string[]
}

export default function AdminMoments() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const uploads = useUploadQueue({ bucket: 'moments', concurrency: 2 })
  const [moments, setMoments] = useState<AdminMoment[] | null>(null)
  const momentsRef = useRef<AdminMoment[] | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [listState, setListState] = useState<ListState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [baseline, setBaseline] = useState<ComposerBaseline>({ editingId: null, content: '', images: [] })

  const onUnauthorized = useCallback(() => {
    router.replace('/admin/login?next=%2Fadmin%2Fmoments')
  }, [router])

  const load = useCallback(async () => {
    const hasSnapshot = momentsRef.current !== null
    setError('')
    setListState(hasSnapshot ? 'refreshing' : 'loading')
    try {
      const data = await runAdminAction<AdminMoment[]>(fetch('/api/admin/moments'), { onUnauthorized })
      momentsRef.current = data
      setMoments(data)
      setListState('ready')
    } catch (cause) {
      if (!hasSnapshot) {
        momentsRef.current = []
        setMoments([])
      }
      setListState('error')
      setError(cause instanceof Error ? cause.message : '加载闲语失败')
    }
  }, [onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MOMENT_DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as { content?: unknown; images?: unknown }
        setContent(typeof draft.content === 'string' ? draft.content : '')
        setImages(Array.isArray(draft.images) ? draft.images.filter((item): item is string => typeof item === 'string') : [])
      }
    } catch {
      localStorage.removeItem(MOMENT_DRAFT_KEY)
    } finally {
      setDraftReady(true)
    }
  }, [])

  useEffect(() => {
    if (!draftReady || editingId) return
    try {
      if (!content.trim() && images.length === 0) localStorage.removeItem(MOMENT_DRAFT_KEY)
      else localStorage.setItem(MOMENT_DRAFT_KEY, JSON.stringify({ content, images }))
    } catch {
      // Server save remains available when local storage is unavailable.
    }
  }, [content, draftReady, editingId, images])

  function clearUploads() {
    uploads.items.forEach((item) => uploads.remove(item.id))
    uploads.clearCompleted()
  }

  function isComposerDirty() {
    return uploads.items.length > 0
      || editingId !== baseline.editingId
      || content !== baseline.content
      || images.length !== baseline.images.length
      || images.some((image, index) => image !== baseline.images[index])
  }

  async function confirmDiscardComposer() {
    if (!isComposerDirty()) return true
    return confirm({
      title: '放弃尚未保存的闲语？',
      description: '切换编辑目标会丢弃当前正文、配图和上传队列。',
      confirmLabel: '放弃更改',
    })
  }

  function resetComposer() {
    setContent('')
    setImages([])
    setEditingId(null)
    setBaseline({ editingId: null, content: '', images: [] })
    clearUploads()
    try {
      localStorage.removeItem(MOMENT_DRAFT_KEY)
    } catch {
      // Ignore unavailable storage.
    }
  }

  async function collectImages() {
    const result = await uploads.start()
    const failed = result.filter((item) => item.status === 'error')
    if (failed.length) throw new Error(`${failed.length} 张配图上传失败，请重试后再保存`)
    return [...images, ...result.flatMap((item) => item.status === 'done' && item.url ? [item.url] : [])]
  }

  async function saveMoment() {
    if (!content.trim() && images.length === 0 && uploads.items.length === 0) {
      setSaveState('error')
      setError('内容和配图不能同时为空')
      return
    }
    setBusy(true)
    setSaveState('saving')
    setError('')
    try {
      const nextImages = await collectImages()
      const endpoint = editingId ? `/api/admin/moments/${editingId}` : '/api/admin/moments'
      await runAdminAction(
        fetch(endpoint, {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, images: nextImages }),
        }),
        { onUnauthorized },
      )
      notify({ kind: 'success', message: editingId ? '闲语已更新' : '闲语已发布' })
      setSaveState('saved')
      resetComposer()
      await load()
    } catch (cause) {
      setSaveState('error')
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function beginEdit(moment: AdminMoment) {
    if (editingId === moment.id) return
    if (!(await confirmDiscardComposer())) return
    clearUploads()
    setEditingId(moment.id)
    setContent(moment.content)
    setImages(moment.images)
    setBaseline({ editingId: moment.id, content: moment.content, images: moment.images })
    setSaveState('idle')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function cancelEdit() {
    if (!(await confirmDiscardComposer())) return
    resetComposer()
    setSaveState('idle')
  }

  async function remove(moment: AdminMoment) {
    const label = moment.content.trim().slice(0, 24) || '仅图片闲语'
    const accepted = await confirm({
      title: `删除“${label}”？`,
      description: '确认后会等待 5 秒再删除，期间可以撤销。',
      confirmLabel: '删除闲语',
    })
    if (!accepted) return

    setMoments((current) => current?.filter((item) => item.id !== moment.id) ?? [])
    const deferred = scheduleDeferredAction(async () => {
      try {
        await runAdminAction(fetch(`/api/admin/moments/${moment.id}`, { method: 'DELETE' }), { onUnauthorized })
      } catch (cause) {
        setMoments((current) => [moment, ...(current ?? [])])
        notify({ kind: 'error', message: cause instanceof Error ? cause.message : '删除失败' })
      }
    }, 5000)
    notify({
      kind: 'info',
      message: `“${label}”将在 5 秒后删除`,
      action: {
        label: '撤销',
        run: () => {
          deferred.cancel()
          setMoments((current) => [moment, ...(current ?? []).filter((item) => item.id !== moment.id)])
          notify({ kind: 'success', message: '已撤销删除' })
        },
      },
    })
  }

  const pageState = listState
  const listBusy = listState === 'refreshing'

  return (
    <section
      className="admin-moments-page"
      role="region"
      aria-label="闲语管理"
      data-page-state={pageState}
    >
      {dialog}
      <AdminPageHead
        index="02"
        eyebrow="QUICK NOTES"
        title="闲语"
        description="短句不必完整，记下当下就好。"
        action={(
          <div className="admin-page-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void load()}
              disabled={listBusy || listState === 'loading'}
            >
              {listBusy ? '刷新中…' : '重新加载闲语'}
            </button>
          </div>
        )}
      />

      <section className="moments-composer" aria-label={editingId ? '编辑闲语' : '发布闲语'}>
        {editingId ? <p className="draft-tag">正在编辑现有闲语</p> : null}
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setSaveState('idle')
          }}
          placeholder="以博主身份发布闲语…"
          aria-label="闲语内容"
        />
        {images.length > 0 ? (
          <div className="moments-images moment-draft-images">
            {images.map((url, index) => (
              <span key={`${url}-${index}`} className="moment-draft-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`配图 ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => {
                    setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))
                    setSaveState('idle')
                  }}
                  aria-label={`移除第 ${index + 1} 张配图`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <UploadQueue controller={uploads} label="选择闲语配图" />

        <div className="moments-actions">
          <span className="moment-draft-note" aria-live="polite">
            {editingId ? '保存前不会覆盖原内容' : content.trim() || images.length || uploads.items.length ? '已自动暂存文字' : '尚未开始书写'}
          </span>
          {editingId ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void cancelEdit()} disabled={busy}>
              取消编辑
            </button>
          ) : null}
          <span className="moment-save-state" data-testid="moment-save-state" data-save-state={saveState} aria-live="polite">
            {saveState === 'saving' ? '正在保存' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败' : ''}
          </span>
          <button className="btn btn-sm" type="button" onClick={() => void saveMoment()} disabled={busy || uploads.busy}>
            {busy ? '保存中…' : editingId ? '保存更改' : '发布闲语'}
          </button>
        </div>
      </section>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      {moments === null ? (
        <>
          <p className="hint" role="status">正在加载闲语…</p>
          <div className="admin-list admin-list-skeleton" aria-hidden="true">
            <div className="admin-row-skeleton" />
            <div className="admin-row-skeleton" />
            <div className="admin-row-skeleton" />
          </div>
        </>
      ) : moments.length === 0 ? (
        <>
          {listBusy ? <p className="hint admin-refresh-status" role="status">正在刷新闲语…</p> : null}
          <div className="empty-state admin-moments-empty-state"><div className="big">空</div><p>还没有闲语。</p></div>
        </>
      ) : (
        <>
          {listBusy ? <p className="hint admin-refresh-status" role="status">正在刷新闲语…</p> : null}
          <div className="admin-list" role="list" aria-label="闲语列表" aria-busy={listBusy}>
          {moments.map((moment, index) => (
            <article key={moment.id} className="admin-item" role="listitem" data-moment-id={moment.id}>
              <span className="admin-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{moment.content || '（仅图片）'}</h3>
                <div className="meta">{formatDate(moment.created_at)} · 配图 {moment.images.length} 张</div>
              </div>
              <div className="ops">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void beginEdit(moment)}>编辑</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(moment)}>删除</button>
              </div>
            </article>
          ))}
          </div>
        </>
      )}
    </section>
  )
}
