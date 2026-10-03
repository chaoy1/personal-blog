'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/blog'
import MarkdownView from '@/components/MarkdownView'
import { getAboutSections } from '@/lib/about-content'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { UploadQueue } from '@/components/admin/UploadQueue'
import { runAdminAction } from '@/lib/admin-action'
import { scheduleDeferredAction } from '@/lib/deferred-action'
import { useUploadQueue } from '@/lib/upload-queue'
import './moments-paper.css'

const MOMENT_DRAFT_KEY = 'admin-moment-draft-v1'
const MOMENTS_PER_PAGE = 4

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
  const [preview, setPreview] = useState(false)
  const [page, setPage] = useState(1)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [focusEditor, setFocusEditor] = useState(0)
  const [selectedPreviews, setSelectedPreviews] = useState<Array<{ id: string; url: string; name: string }>>([])

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const previews = uploads.items.filter((item) => item.file.type.startsWith('image/')).map((item) => ({
      id: item.id, url: URL.createObjectURL(item.file), name: item.file.name,
    }))
    setSelectedPreviews(previews)
    return () => previews.forEach((item) => URL.revokeObjectURL(item.url))
  }, [uploads.items])

  useEffect(() => {
    if (focusEditor && !preview) contentRef.current?.focus()
  }, [focusEditor, preview])

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
      // An unavailable browser store must not prevent editing.
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
    setPreview(false)
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
    if (busy || uploads.busy) return
    if (!content.trim() && images.length === 0 && uploads.items.length === 0) {
      setSaveState('error')
      setError('内容和配图不能同时为空')
      setPreview(false)
      setFocusEditor((value) => value + 1)
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
      setPage(1)
      await load()
    } catch (cause) {
      setSaveState('error')
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function beginEdit(moment: AdminMoment) {
    if (busy || uploads.busy) return
    if (editingId === moment.id) return
    if (!(await confirmDiscardComposer())) return
    clearUploads()
    setEditingId(moment.id)
    setContent(moment.content)
    setImages(moment.images)
    setBaseline({ editingId: moment.id, content: moment.content, images: moment.images })
    setSaveState('idle')
    setError('')
    setPreview(false)
    setFocusEditor((value) => value + 1)
    window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
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
  const pageCount = Math.max(1, Math.ceil((moments?.length ?? 0) / MOMENTS_PER_PAGE))
  const visiblePage = Math.min(page, pageCount)
  const pageStart = (visiblePage - 1) * MOMENTS_PER_PAGE
  const visibleMoments = moments?.slice(pageStart, pageStart + MOMENTS_PER_PAGE) ?? []
  const composerBusy = busy || uploads.busy
  const composerStatus = editingId ? '保存前不会覆盖原内容'
    : content.trim() || images.length || uploads.items.length ? '文字已在本机暂存，配图随发布上传' : '尚未开始书写'

  function tiltCard(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const card = event.currentTarget
    const bounds = card.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    card.style.setProperty('--rx', `${(0.5 - y) * 2.3}deg`)
    card.style.setProperty('--ry', `${(x - 0.5) * 3.2}deg`)
    card.style.setProperty('--shade-x', `${(x - 0.5) * 12}px`)
    card.style.setProperty('--curl', String((x + y) / 2))
  }

  function resetTilt(event: PointerEvent<HTMLElement>) {
    for (const property of ['--rx', '--ry', '--shade-x', '--curl']) event.currentTarget.style.removeProperty(property)
  }

  return (
    <section
      className="ap-moments-page"
      role="region"
      aria-label="闲语管理"
      data-page-state={pageState}
    >
      {dialog}
      <header className="ap-page-head ap-moment-page-head">
        <div><p className="ap-eyebrow">QUICK NOTES / 日常的只言片语</p><h1>不必成篇，也值得留下。</h1><p className="description">一点心绪，一帧光景。把眼前的日子，收进一张短笺。</p></div>
        <a className="ap-quiet" href="#moment-composer" onClick={() => { setPreview(false); setFocusEditor((value) => value + 1) }}>记下一刻 <span aria-hidden="true">↓</span></a>
      </header>

      <section className="ap-sheet ap-moment-composer" id="moment-composer" aria-label={editingId ? '编辑闲语' : '发布闲语'} aria-busy={composerBusy}>
        <header className="ap-sheet-head ap-moment-composer-head"><div><p className="ap-eyebrow">A NOTE FOR TODAY / 此刻落笔</p><h2>{editingId ? '编辑这一则闲语' : '写一则闲语'}</h2></div><span className="ap-moment-composer-tag">{editingId ? '正在编辑现有闲语' : '新笺'}</span></header>
        <form onSubmit={(event) => { event.preventDefault(); void saveMoment() }}>
          <fieldset className="ap-moment-compose-grid" disabled={composerBusy}>
            <div className="ap-moment-writing">
              <div className="ap-moment-editor-head"><label className="ap-moment-content-control" htmlFor="moment-content"><span>正文 <small>支持 Markdown，短句也可以。</small></span></label><div className="ap-moment-editor-modes" aria-label="正文显示方式"><button type="button" className="ap-quiet" aria-pressed={!preview} aria-label="编辑正文" onClick={() => { setPreview(false); setFocusEditor((value) => value + 1) }}>落笔</button><button type="button" className="ap-quiet" aria-pressed={preview} aria-label="预览正文" onClick={() => setPreview(true)}>预览</button></div></div>
              {preview ? <div className="ap-moment-preview" role="region" aria-label="闲语正文预览">{content.trim() ? <MarkdownView content={content} preserveParagraphs={getAboutSections(content).preserveParagraphs} /> : <p className="ap-moment-preview-empty">写下一句话，预览会在这里展开。</p>}</div> : <textarea id="moment-content" ref={contentRef} value={content} onChange={(event) => { setContent(event.target.value); setSaveState('idle') }} rows={5} placeholder="今天，想留下些什么……" aria-label="闲语内容" aria-describedby="moment-count moment-markdown-help" />}
              <div className="ap-moment-writing-foot"><span>以博主的身份落笔</span><output id="moment-count" aria-live="polite">已写 {Array.from(content).length} 字</output></div>
              <p className="ap-moment-local-note" id="moment-markdown-help"># 标题 · **粗体** · - 列表 · [链接](地址)，切换预览查看排版。</p>
            </div>
            <section className="ap-moment-attachments" aria-labelledby="moment-attachments-title">
              <div className="ap-moment-attachment-head"><h3 id="moment-attachments-title">随笺配图</h3><span>{images.length + uploads.items.length} 张</span></div>
              <UploadQueue controller={uploads} label="选择闲语配图" showStart={false} />
              {selectedPreviews.length > 0 ? <div className="ap-moment-image-tray" aria-label="待发布配图">{selectedPreviews.map((item) => <span key={item.id} className="ap-moment-selected-image"><img src={item.url} alt={`待发布配图：${item.name}`} /><span>{item.name}</span></span>)}</div> : null}
              {images.length > 0 ? <div className="ap-moment-image-tray" aria-label="已保存配图">{images.map((url, index) => <span key={`${url}-${index}`} className="ap-moment-selected-image"><img src={url} alt={`配图 ${index + 1}`} /><button type="button" onClick={() => { setImages((items) => items.filter((_, itemIndex) => itemIndex !== index)); setSaveState('idle') }} aria-label={`移除第 ${index + 1} 张配图`}>×</button></span>)}</div> : null}
              <p className="ap-moment-local-note">支持多选，只有图片也可以发布；发布时上传所选配图。</p>
            </section>
          </fieldset>
          <footer className="ap-moment-publish"><div><p aria-live="polite">{composerStatus}</p><small>正文或配图至少留下一项。</small><span className="ap-moment-save-state" data-testid="moment-save-state" data-save-state={saveState} aria-live="polite">{saveState === 'saving' ? '正在保存' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败' : ''}</span></div><div className="ap-moment-publish-actions">{editingId ? <button type="button" className="ap-quiet" onClick={() => void cancelEdit()} disabled={composerBusy}>取消编辑</button> : null}<button className="ap-button ap-primary" type="submit" disabled={composerBusy}>{busy ? '保存中…' : editingId ? '保存更改' : '发布闲语'} <span aria-hidden="true">↗</span></button></div></footer>
        </form>
      </section>

      {error ? <p className="ap-moment-error" role="alert">{error}</p> : null}
      <section className="ap-moment-archive" aria-labelledby="moment-archive-title">
        <header className="ap-moment-archive-head"><div><p className="ap-eyebrow">LOOSE LEAVES / 散页札记</p><h2 id="moment-archive-title">留下的片刻</h2></div><div className="ap-moment-archive-actions"><div className="ap-moment-archive-total"><strong>{String(moments?.length ?? 0).padStart(2, '0')}</strong><span>则闲语</span></div><button type="button" className="ap-quiet" onClick={() => void load()} disabled={listBusy || listState === 'loading'}>{listBusy ? '刷新中…' : '重新加载闲语'}</button></div></header>
        {moments === null ? <><p className="ap-moment-list-status" role="status">正在加载闲语…</p><div className="ap-moment-list" aria-hidden="true">{[0, 1, 2, 3].map((item) => <div className="ap-moment-card ap-moment-skeleton" key={item}><span /><span /><span /></div>)}</div></> : <>
          {listBusy ? <p className="ap-moment-list-status" role="status">正在刷新闲语…</p> : null}
          {moments.length === 0 ? <div className="ap-moment-empty"><span aria-hidden="true">白</span><h3>{listState === 'error' ? '闲语尚未载入' : '纸上还留着余白'}</h3><p>{listState === 'error' ? '重新加载，找回留下的片刻。' : '写一句话，或收一帧光影。'}</p>{listState !== 'error' ? <a href="#moment-composer" className="ap-quiet">开始落笔 ↗</a> : null}</div> : <div className="ap-moment-list" role="list" aria-label="闲语列表" aria-busy={listBusy}>{visibleMoments.map((moment, index) => <article key={moment.id} className="ap-item ap-moment-card" role="listitem" data-moment-id={moment.id} data-tone={['sage', 'ochre', 'clay', 'ink'][(pageStart + index) % 4]} onPointerMove={tiltCard} onPointerLeave={resetTilt}>
            <header className="ap-moment-card-header"><time dateTime={moment.created_at}>{formatDate(moment.created_at)}</time><span className="ap-moment-card-number">NOTE / {String(pageStart + index + 1).padStart(2, '0')}</span></header>
            <div className="ap-moment-card-content">{moment.content.trim() ? <MarkdownView content={moment.content} preserveParagraphs={getAboutSections(moment.content).preserveParagraphs} /> : <p className="ap-moment-image-only">（这一则，只有光影。）</p>}</div>
            {moment.images.length > 0 ? <div className="ap-moment-card-images">{moment.images.slice(0, 3).map((url, imageIndex) => <img key={`${url}-${imageIndex}`} src={url} alt={`闲语配图 ${imageIndex + 1}`} loading="lazy" />)}{moment.images.length > 3 ? <span>另有 {moment.images.length - 3} 张</span> : null}</div> : null}
            <footer className="ap-moment-card-foot"><span>{moment.profiles?.nickname || '博主'} · 配图 {moment.images.length} 张</span><div className="ap-moment-card-ops"><button type="button" onClick={() => void beginEdit(moment)} disabled={composerBusy}>编辑<span aria-hidden="true"> ↗</span></button><button type="button" data-action="delete" onClick={() => void remove(moment)} disabled={composerBusy}>删除</button></div></footer><i className="ap-moment-fold" aria-hidden="true" />
          </article>)}</div>}
          {moments.length > 0 ? <footer className="ap-moment-pagination"><span>共 {moments.length} 则 · 第 {pageStart + 1}—{Math.min(pageStart + MOMENTS_PER_PAGE, moments.length)} 则</span><nav aria-label="闲语列表分页"><button className="ap-quiet" type="button" aria-label="上一页闲语" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>← 上一页</button><span aria-hidden="true">{visiblePage} / {pageCount}</span><button className="ap-quiet" type="button" aria-label="下一页闲语" disabled={visiblePage === pageCount} onClick={() => setPage(visiblePage + 1)}>下一页 →</button></nav></footer> : null}
        </>}
      </section>
      <footer className="ap-moment-footer"><span>山窗案头 · 随时落笔，慢慢收藏。</span><span>最新载入最多 100 则闲语</span></footer>
    </section>
  )
}
