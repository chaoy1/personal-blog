'use client'

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import AdminHeader from '@/components/AdminHeader'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { useDeskPaperMotion } from '@/components/admin/useDeskPaperMotion'
import { runAdminAction } from '@/lib/admin-action'
import type { AdminOverviewData, DeskPost } from '@/lib/admin-overview-types'

const nav = [['/admin', '案', '管理总览'], ['/admin/posts', '文', '文章'], ['/admin/moments', '语', '闲语'], ['/admin/photos', '影', '光影'], ['/admin/profile', '署', '博主资料']] as const
const digits = '〇一二三四五六七八九'
const number = (value: number | null | undefined) => value == null ? '—' : String(value).padStart(2, '0')
const chinese = (value: number): string => value < 10 ? digits[value] : value < 20 ? `十${value === 10 ? '' : digits[value % 10]}` : value < 30 ? `廿${value === 20 ? '' : digits[value % 10]}` : `三十${value === 30 ? '' : digits[value % 10]}`
function dateParts(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return { year: '—', day: '尚未记时' }
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(value))
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? ''
  return { year: get('year').split('').map(n => digits[Number(n)]).join(''), day: `${chinese(Number(get('month')))}月${chinese(Number(get('day')))}日` }
}
const editor = (post: DeskPost) => `/admin/editor?id=${encodeURIComponent(post.id)}`

export default function AdminOverview() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const [data, setData] = useState<AdminOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const mutationBusy = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  useDeskPaperMotion(root)
  const unauthorized = useCallback(() => router.replace('/admin/login?next=%2Fadmin'), [router])
  const load = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true); setError('')
    try {
      const result = await runAdminAction<AdminOverviewData>(fetch('/api/admin/overview', { cache: 'no-store', signal: request.signal }), { onUnauthorized: unauthorized })
      if (!request.signal.aborted) setData(result)
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : '总览暂时无法读取。')
    } finally { if (!request.signal.aborted) setLoading(false) }
  }, [unauthorized])
  useEffect(() => { void load(); return () => controller.current?.abort() }, [load])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !target.closest('input,textarea,[contenteditable="true"],[role="dialog"]')) { event.preventDefault(); search.current?.focus() }
      if (event.key === 'Escape') root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(item => { item.open = false; item.querySelector('summary')?.focus() })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const recent = data?.articles?.recent ?? []
  const visible = useMemo(() => recent.filter(post => (filter === 'all' || post.published === (filter === 'published')) && `${post.title} ${post.excerpt} ${post.slug}`.toLocaleLowerCase('zh-CN').includes(query.trim().toLocaleLowerCase('zh-CN'))), [recent, filter, query])
  async function moveToTrash(post: DeskPost) {
    if (mutationBusy.current) return
    mutationBusy.current = true; setPendingId(post.id)
    try {
      if (!await confirm({ title: `移入回收站：“${post.title}”？`, description: '文章会从前台撤下，之后仍可从回收站恢复。', confirmLabel: '移入回收站' })) return
      const endpoint = `/api/admin/posts/${encodeURIComponent(post.id)}`
      await runAdminAction(fetch(endpoint, { method: 'DELETE' }), { onUnauthorized: unauthorized })
      notify({ kind: 'success', message: `“${post.title}”已移入回收站。`, action: { label: '撤销', run: async () => {
        try { await runAdminAction(fetch(endpoint, { method: 'PATCH' }), { onUnauthorized: unauthorized }); await load() }
        catch (cause) { notify({ kind: 'error', message: cause instanceof Error ? cause.message : '恢复失败，请在回收站重试。' }) }
      } } })
      await load()
    } catch (cause) { notify({ kind: 'error', message: cause instanceof Error ? cause.message : '移入回收站失败。' }) }
    finally { mutationBusy.current = false; setPendingId(null) }
  }
  const articles = data?.articles
  const day = dateParts(data?.generatedAt)
  const partial = data && Object.keys(data.errors).length > 0
  const unavailable = loading && !data ? '正在读取' : '暂未读取'
  return <div className="desk-scene" ref={root}>
    <section className="desk-studio" aria-label="管理总览" data-page-state={loading && !data ? 'loading' : error || partial ? 'error' : 'ready'}>
      <aside className="desk-sidebar" aria-label="后台导航">
        <Link href="/admin" className="desk-brand"><i className="desk-seal" aria-hidden="true">写</i><span>似水流年<small>WRITING STUDIO</small></span></Link>
        <p className="desk-sidebar-caption">小屋内务</p>
        <nav aria-label="管理功能">{nav.map(([href, mark, label]) => <Link key={href} href={href} aria-current={href === '/admin' ? 'page' : undefined} aria-label={label}><i aria-hidden="true">{mark}</i><span>{label}</span><b aria-hidden="true">↗</b></Link>)}</nav>
        <div className="desk-sidebar-foot"><Link href="/">去前台看看 <span aria-hidden="true">↗</span></Link><div className="desk-owner"><span className="desk-owner-seal" aria-hidden="true">署</span><span><b>{data?.profile?.nickname || (data?.errors.profile ? '资料暂未读取' : '小屋主人')}</b><small>山窗常开 · 文字常新</small></span></div></div>
      </aside>
      <main id="overview">
        <header className="desk-topline"><span>案头 / <b>管理总览</b></span><div className="desk-tools"><span className="desk-date">{data ? `${day.year}年 · ${day.day}` : '山窗案头'}</span><ThemeToggle /><AdminHeader /></div></header>
        <section className="desk-welcome" aria-labelledby="page-title"><div><p className="desk-eyebrow">THE WRITING DESK / 案头小记</p><h1 id="page-title">把日子，<span className="desk-welcome-title-tail">慢慢写成篇。<i className="desk-seal" aria-hidden="true">记</i></span></h1><p>旧稿有归处，新意有来时。今天，也留下一点什么。</p></div><Link className="desk-primary" href="/admin/editor"><span aria-hidden="true">＋</span>写新文章 <b aria-hidden="true">↗</b></Link><div className="desk-welcome-wash" aria-hidden="true" /></section>
        {(error || partial) && <div className="desk-alert" role="alert"><span>{error || '部分内容暂未读取，已读取的内容仍可查看。'}</span><button type="button" onClick={() => void load()} disabled={loading}>重试</button></div>}
        <section className="desk-metrics" aria-label="内容概览">
          <Link href="/admin/posts" className="desk-metric" style={{ '--accent': '#a44231' } as CSSProperties}><span className="desk-metric-tab" aria-hidden="true">文</span><div><span className="desk-metric-name">文章</span><span className="desk-metric-number">{number(articles?.total)}<small>篇</small></span><p>{articles ? `已刊 ${number(articles.published)} · 待续 ${number(articles.draft)}` : unavailable}</p></div></Link>
          <Link href="/admin/moments" className="desk-metric" style={{ '--accent': '#667052' } as CSSProperties}><span className="desk-metric-tab" aria-hidden="true">语</span><div><span className="desk-metric-name">闲语</span><span className="desk-metric-number">{number(data?.moments)}<small>则</small></span><p>{data?.moments != null ? '收下一刻的心绪' : unavailable}</p></div></Link>
          <Link href="/admin/photos" className="desk-metric" style={{ '--accent': '#867044' } as CSSProperties}><span className="desk-metric-tab" aria-hidden="true">影</span><div><span className="desk-metric-name">光影</span><span className="desk-metric-number">{number(data?.photos)}<small>帧</small></span><p>{data?.photos != null ? `沿途所见 / ${number(data.albums)} 册` : unavailable}</p></div></Link>
          <Link href="/admin/profile" className="desk-metric" style={{ '--accent': '#776349' } as CSSProperties}><span className="desk-metric-tab" aria-hidden="true">署</span><div><span className="desk-metric-name">小屋资料</span><span className="desk-profile-status">{!data ? '静候落款' : data.errors.profile ? '暂未读取' : data.profile?.bio?.trim() ? '自序已成' : '自序待写'}</span><p>头像、落款与关于页</p></div></Link>
        </section>
        <div className="desk-work-area">
          <section className="desk-archive" id="archive" aria-labelledby="archive-title">
            <span className="desk-book-binding" aria-hidden="true">{[0, 1, 2, 3].map(n => <i key={n} />)}</span>
            <header className="desk-section-head"><div><span className="desk-chapter-number" aria-hidden="true">壹</span><p className="desk-eyebrow">MANUSCRIPT INDEX / 篇目册</p><h2 id="archive-title">最近整理</h2></div><Link href="/admin/posts?view=trash" className="desk-text-button">回收站 <span>{number(articles?.trash)}</span></Link></header>
            <div className="desk-filter-line"><div className="desk-filters" role="group" aria-label="最近文章发布状态">{([['all', '全部'], ['published', '已发布'], ['draft', '草稿']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}>{label} <span>{articles ? number(recent.filter(post => key === 'all' || post.published === (key === 'published')).length) : '—'}</span></button>)}</div><label className="desk-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5" /><path d="m12 12 5 5" /></svg><input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索最近文章" aria-label="搜索最近文章" /><kbd aria-hidden="true">/</kbd></label></div>
            <div className="desk-list-caption" aria-hidden="true"><span>篇目 / 状态</span><span>最后整理</span><span>操作</span></div>
            <div className="desk-post-list" role="list" aria-label="最近文章">{visible.map((post, index) => {
              const date = dateParts(post.updated_at)
              return <article key={post.id} className="desk-post" role="listitem"><span className="desk-post-index" aria-hidden="true">{number(index + 1)}</span><div className="desk-post-copy"><Link href={editor(post)} className="desk-post-title">{post.title || '未题名'}</Link><p>{post.excerpt || '这一篇，仍有话可写。'}</p><div><span className={`desk-status ${post.published ? 'desk-published' : 'desk-draft'}`}>{post.published ? '已发布' : '草稿'}</span></div></div><time dateTime={post.updated_at}>{date.day}<small>{date.year}</small></time><div className="desk-post-ops"><Link href={editor(post)} className="desk-edit-post" aria-label={`${post.published ? '编辑' : '续写'}：${post.title}`}>{post.published ? '编辑' : '续写'}</Link><details><summary aria-label={`${post.title}：更多操作`}>···</summary><div><button type="button" aria-label={`移入回收站：${post.title}`} disabled={pendingId !== null} onClick={() => void moveToTrash(post)}>{pendingId === post.id ? '正在处理…' : '移入回收站'}</button></div></details></div><i className="desk-paper-corner" aria-hidden="true" /></article>
            })}</div>
            {visible.length === 0 && <div className="desk-empty"><i aria-hidden="true">{loading && !data ? '候' : '页'}</i><p>{!articles ? loading ? '正在翻阅篇目册…' : '篇目册暂未读取，请重试。' : recent.length === 0 ? '篇目册还是空白，写下第一篇吧。' : '没有符合条件的最近篇目。'}</p>{articles && (recent.length ? <button type="button" onClick={() => { setFilter('all'); setQuery('') }}>清除筛选</button> : <Link href="/admin/editor" className="desk-text-button">写第一篇 ↗</Link>)}</div>}
            <footer className="desk-list-foot"><span role="status">{articles ? `显示 ${visible.length} / ${recent.length} 篇最近文章` : '篇目统计待读取'} · 按最后整理排列</span><Link href="/admin/posts" className="desk-text-button">所有文章 <span aria-hidden="true">↗</span></Link></footer>
          </section>
          <aside className="desk-margin" aria-label="待续与常用入口"><section className="desk-drafts"><header className="desk-section-head"><div><p className="desk-eyebrow">TO BE CONTINUED / 待续</p><h2>还没写完的话</h2></div></header><div id="draft-cards">{articles?.unfinished.map((post, index) => <Link key={post.id} href={editor(post)} className="desk-draft-note"><small>手稿 / {index === 0 ? '壹' : '贰'}</small><h3>{post.title || '未题名'}</h3><p>{post.excerpt || '文字不必着急，慢慢成篇。'}</p><span className="desk-note-action">接着写 <b aria-hidden="true">↗</b></span><i className="desk-note-fold" aria-hidden="true" /></Link>)}</div>{!articles?.unfinished.length && <div className="desk-draft-empty"><p>{!articles ? '手稿正在候读。' : '手边的篇目，都已成篇。'}</p><Link href="/admin/editor" className="desk-text-button">另起一页 ↗</Link></div>}</section><section className="desk-quick-notes" aria-label="常用操作"><Link href="/admin/moments"><i aria-hidden="true">语</i><span>记一句闲语<small>不必成篇，也值得留下。</small></span><b aria-hidden="true">＋</b></Link><Link href="/admin/photos"><i aria-hidden="true">影</i><span>收几帧光影<small>把沿途所见归入相册。</small></span><b aria-hidden="true">＋</b></Link></section></aside>
        </div>
        <footer className="desk-footer"><span>山窗案头 <i>·</i> 一处写作，一处收藏。</span><button type="button" className="desk-text-button" aria-label="重新读取总览" disabled={loading} onClick={() => void load()}>{loading ? '正在读取…' : '重新读取 ↻'}</button></footer>
      </main>
    </section>
    {dialog}
  </div>
}
