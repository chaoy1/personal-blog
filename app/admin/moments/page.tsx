'use client'

import { useCallback, useEffect, useState } from 'react'
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

export default function AdminMoments() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const uploads = useUploadQueue({ bucket: 'moments', concurrency: 2 })
  const [moments, setMoments] = useState<AdminMoment[] | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draftReady, setDraftReady] = useState(false)

  const onUnauthorized = useCallback(() => {
    router.replace('/admin/login?next=%2Fadmin%2Fmoments')
  }, [router])

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await runAdminAction<AdminMoment[]>(fetch('/api/admin/moments'), { onUnauthorized })
      setMoments(data)
    } catch (cause) {
      setMoments([])
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

  function resetComposer() {
    setContent('')
    setImages([])
    setEditingId(null)
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
      setError('内容和配图不能同时为空')
      return
    }
    setBusy(true)
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
      resetComposer()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  function beginEdit(moment: AdminMoment) {
    clearUploads()
    setEditingId(moment.id)
    setContent(moment.content)
    setImages(moment.images)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  return (
    <>
      {dialog}
      <AdminPageHead
        index="02"
        eyebrow="QUICK NOTES"
        title="闲语"
        description="短句不必完整，记下当下就好。"
      />

      <section className="moments-composer" aria-label={editingId ? '编辑闲语' : '发布闲语'}>
        {editingId ? <p className="draft-tag">正在编辑现有闲语</p> : null}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
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
                  onClick={() => setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))}
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetComposer} disabled={busy}>
              取消编辑
            </button>
          ) : null}
          <button className="btn btn-sm" type="button" onClick={() => void saveMoment()} disabled={busy || uploads.busy}>
            {busy ? '保存中…' : editingId ? '保存更改' : '发布'}
          </button>
        </div>
      </section>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      {moments === null ? (
        <p className="hint" role="status">正在加载闲语…</p>
      ) : moments.length === 0 ? (
        <div className="empty-state"><div className="big">空</div>还没有闲语。</div>
      ) : (
        <div className="admin-list">
          {moments.map((moment, index) => (
            <article key={moment.id} className="admin-item">
              <span className="admin-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{moment.content || '（仅图片）'}</h3>
                <div className="meta">{formatDate(moment.created_at)} · 配图 {moment.images.length} 张</div>
              </div>
              <div className="ops">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => beginEdit(moment)}>编辑</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(moment)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
