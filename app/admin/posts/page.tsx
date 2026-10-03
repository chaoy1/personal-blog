'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import { formatDate, type Post } from '@/lib/blog'
import '../articles-paper.css'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { runAdminAction } from '@/lib/admin-action'

type View = 'posts' | 'trash'
type StatusFilter = 'all' | 'published' | 'draft'

function initialView(): View {
  if (typeof window === 'undefined') return 'posts'
  return new URLSearchParams(window.location.search).get('view') === 'trash' ? 'trash' : 'posts'
}

function initialQuery(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('q') ?? ''
}

function initialStatus(): StatusFilter {
  if (typeof window === 'undefined') return 'all'
  const value = new URLSearchParams(window.location.search).get('status')
  return value === 'published' || value === 'draft' ? value : 'all'
}

export default function AdminDashboard() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<View>(initialView)
  const [query, setQuery] = useState(initialQuery)
  const [appliedQuery, setAppliedQuery] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'title'>('recent')
  const postsRef = useRef<Post[] | null>(null)
  const snapshotViewRef = useRef<View | null>(null)

  const onUnauthorized = useCallback(() => {
    router.replace(`/admin/login?next=${encodeURIComponent('/admin/posts')}`)
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query), 160)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const params = new URLSearchParams()
    if (view === 'trash') params.set('view', 'trash')
    if (query) params.set('q', query)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const nextUrl = params.toString() ? `/admin/posts?${params.toString()}` : '/admin/posts'
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (currentUrl !== nextUrl) window.history.replaceState(null, '', nextUrl)
  }, [query, statusFilter, view])

  const load = useCallback(async () => {
    const hasSnapshot = snapshotViewRef.current === view && postsRef.current !== null
    setError('')
    if (hasSnapshot) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setPosts(null)
    }
    try {
      const result = await runAdminAction<Post[]>(
        fetch(view === 'trash' ? '/api/admin/posts?trash=1' : '/api/admin/posts'),
        { onUnauthorized },
      )
      postsRef.current = result
      snapshotViewRef.current = view
      setPosts(result)
    } catch (cause) {
      if (!hasSnapshot) {
        postsRef.current = []
        snapshotViewRef.current = view
        setPosts([])
      }
      setError(cause instanceof Error ? cause.message : '加载文章失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onUnauthorized, view])

  useEffect(() => {
    void load()
  }, [load])

  const filteredPosts = useMemo(() => {
    const needle = appliedQuery.trim().toLocaleLowerCase('zh-CN')
    return (posts ?? []).filter((post) => {
      const matchesQuery = !needle
        || post.title.toLocaleLowerCase('zh-CN').includes(needle)
        || post.slug.toLocaleLowerCase('zh-CN').includes(needle)
        || post.excerpt.toLocaleLowerCase('zh-CN').includes(needle)
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'published' ? post.published : !post.published)
      return matchesQuery && matchesStatus
    }).sort((a, b) => sortOrder === 'title'
      ? a.title.localeCompare(b.title, 'zh-CN')
      : sortOrder === 'oldest'
        ? a.updated_at.localeCompare(b.updated_at)
        : b.updated_at.localeCompare(a.updated_at))
  }, [appliedQuery, posts, statusFilter, sortOrder])

  async function moveToTrash(post: Post) {
    const accepted = await confirm({
      title: `移入回收站：“${post.title}”？`,
      description: '文章会立即从前台撤下，但之后仍可从回收站恢复。',
      confirmLabel: '移入回收站',
    })
    if (!accepted) return

    try {
      await runAdminAction(fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' }), { onUnauthorized })
      notify({ kind: 'success', message: `“${post.title}”已移入回收站` })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '移入回收站失败')
    }
  }

  async function restore(post: Post) {
    try {
      await runAdminAction(fetch(`/api/admin/posts/${post.id}`, { method: 'PATCH' }), { onUnauthorized })
      notify({ kind: 'success', message: `“${post.title}”已恢复为草稿` })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '恢复失败')
    }
  }

  async function removePermanently(post: Post) {
    const accepted = await confirm({
      title: `彻底删除：“${post.title}”？`,
      description: '此操作无法撤销，文章正文也无法恢复。',
      confirmLabel: '彻底删除',
    })
    if (!accepted) return

    try {
      await runAdminAction(
        fetch(`/api/admin/posts/${post.id}?permanent=1`, { method: 'DELETE' }),
        { onUnauthorized },
      )
      notify({ kind: 'success', message: `“${post.title}”已彻底删除` })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '彻底删除失败')
    }
  }

  const pageState = loading && posts === null
    ? 'loading'
    : refreshing
      ? 'refreshing'
      : error
        ? 'error'
        : 'ready'

  const draft = view === 'posts' ? posts?.find((post) => !post.published) : null
  const publishedCount = posts?.filter((post) => post.published).length ?? 0

  return (
    <section className="ap-posts-page" role="region" aria-label="文章管理" data-page-state={pageState}>
      {dialog}
      <header className="ap-page-head">
        <div>
          <p className="ap-eyebrow">01 / MANUSCRIPT ARCHIVE</p>
          <h1>{view === 'trash' ? '旧稿，仍可拾回。' : '文章，收在这里。'}</h1>
          <p>{view === 'trash' ? '误删的文字可以从这里恢复。' : '整理旧稿，也为下一篇文字留出位置。'}</p>
        </div>
        {view === 'posts' ? <Link href="/admin/editor" className="ap-button ap-primary">＋ 写新文章</Link> : null}
      </header>
      <div className="ap-posts-layout">
        <section className="ap-sheet ap-posts-archive" aria-labelledby="posts-list-title">
          <header className="ap-sheet-head">
            <div><p className="ap-eyebrow">篇目册 / ARTICLE INDEX</p><h2 id="posts-list-title">{view === 'trash' ? '回收站' : '成篇与待续'}</h2></div>
            <button type="button" className="ap-quiet" onClick={() => {
              setView((value) => value === 'posts' ? 'trash' : 'posts')
              setQuery(''); setAppliedQuery(''); setStatusFilter('all')
            }}>{view === 'trash' ? '返回文章' : '回收站'}</button>
          </header>
          <div className="ap-posts-filters" role="search" aria-label="文章筛选">
            <label className="ap-control ap-posts-search"><span>找一篇旧稿</span>
              <input type="search" aria-label="搜索文章" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、摘要或 slug" />
            </label>
            {view === 'posts' ? <label className="ap-control"><span>发布状态</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option>
              </select>
            </label> : null}
            <label className="ap-control"><span>排列</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
              <option value="recent">最近整理</option><option value="oldest">最早整理</option><option value="title">篇名顺序</option>
            </select></label>
          </div>
          {error ? <div className="ap-article-error" role="alert"><p>{error}</p><button type="button" className="ap-quiet" onClick={() => void load()}>重新加载</button></div> : null}
          {refreshing ? <p className="ap-article-hint" role="status">正在刷新文章…</p> : null}
          <div className="ap-posts-table-head" aria-hidden="true"><span>篇目 / 小序</span><span>整理日期</span><span>手边操作</span></div>
          {posts === null ? <>
            <p className="ap-article-hint" role="status">正在加载文章…</p>
            <div className="ap-posts-list" aria-hidden="true"><div className="ap-article-skeleton" data-testid="admin-row-skeleton" /><div className="ap-article-skeleton" /><div className="ap-article-skeleton" /></div>
          </> : filteredPosts.length === 0 ? <div className="ap-empty">
            <p>{posts.length > 0 ? '没有符合当前筛选条件的文章。' : view === 'trash' ? '回收站是空的。' : '还没有文章，点「写新文章」开始吧。'}</p>
            {posts.length > 0 && (query || statusFilter !== 'all') ? <button type="button" className="ap-button" onClick={() => { setQuery(''); setAppliedQuery(''); setStatusFilter('all') }}>清除筛选</button> : null}
          </div> : <div className="ap-posts-list" role="list" aria-label="文章列表" aria-busy={refreshing}>
            {filteredPosts.map((post, index) => <article key={post.id} className="ap-item ap-posts-row" role="listitem" data-post-id={post.id}>
              <span className="ap-posts-row-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="ap-posts-row-copy">
                <h3><Link href={`/admin/editor?id=${post.id}`}>{post.title}</Link></h3>
                {post.excerpt ? <div className="ap-posts-row-excerpt"><MarkdownView content={post.excerpt} /></div> : null}
                <div className="ap-posts-row-meta">
                  <span className="ap-chip" data-status={view === 'trash' ? 'trashed' : post.published ? 'published' : 'draft'}>{view === 'trash' ? '已删除' : post.published ? '已发布' : '草稿'}</span>
                  <span>/posts/{post.slug.replace(/^trashbin-\d{13}-/, '')}</span>
                </div>
              </div>
              <time dateTime={post.updated_at}>{formatDate(post.updated_at)}<small>更新于</small></time>
              <div className="ap-posts-row-ops">
                {view === 'trash' ? <button type="button" onClick={() => void restore(post)}>恢复</button> : <>
                  {post.published ? <Link href={`/posts/${post.slug}`}>查看前台</Link> : <Link href={`/admin/preview/${post.id}`}>预览草稿</Link>}
                  <Link href={`/admin/editor?id=${post.id}`}>编辑</Link>
                </>}
                <details><summary aria-label={`${post.title}：更多操作`}>···</summary><div>
                  <button type="button" onClick={() => void (view === 'trash' ? removePermanently(post) : moveToTrash(post))}>{view === 'trash' ? '彻底删除' : '移入回收站'}</button>
                </div></details>
              </div>
            </article>)}
          </div>}
          <footer className="ap-posts-list-foot"><span>{posts ? `显示 ${filteredPosts.length} / ${posts.length} 篇` : '篇目正在整理'}</span>
            <button type="button" className="ap-quiet" onClick={() => void load()} disabled={loading || refreshing}>{refreshing ? '刷新中…' : '重新加载'}</button>
          </footer>
        </section>
        <aside className="ap-posts-margin" aria-label="篇目概览">
          <section className="ap-sheet ap-posts-directory"><p className="ap-eyebrow">一册文字 / IN THIS NOTEBOOK</p><h2>{view === 'trash' ? <>旧时的，<br />仍可拾回。</> : <>写过的，<br />还想写的。</>}</h2>
            <dl><div><dt>{view === 'trash' ? '回收站篇目' : '全部篇目'}</dt><dd>{posts === null ? '—' : String(posts.length).padStart(2, '0')}<span>篇</span></dd></div>
              {view === 'posts' ? <><div><dt>已经成篇</dt><dd>{posts === null ? '—' : String(publishedCount).padStart(2, '0')}<span>篇</span></dd></div><div><dt>留待续写</dt><dd>{posts === null ? '—' : String(posts.length - publishedCount).padStart(2, '0')}<span>篇</span></dd></div></> : null}
            </dl><p className="ap-posts-directory-note">文字不急着成篇。<br />旧稿有归处，新意有来时。</p><i className="ap-article-small-seal" aria-hidden="true">藏</i>
          </section>
          {draft ? <Link href={`/admin/editor?id=${draft.id}`} className="ap-item ap-posts-resume"><small>手稿 / 待续</small><h3>留一页，<br />接着写。</h3><p>上次整理于 {formatDate(draft.updated_at)}</p><span>接着写 <b>↗</b></span></Link> : null}
        </aside>
      </div>
      <footer className="ap-article-footer">篇目有次，文字有时。<span>山窗案头 · 篇目册</span></footer>
    </section>
  )
}
