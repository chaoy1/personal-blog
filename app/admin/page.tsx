'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, type Post } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'
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
  const postsRef = useRef<Post[] | null>(null)
  const snapshotViewRef = useRef<View | null>(null)

  const onUnauthorized = useCallback(() => {
    router.replace(`/admin/login?next=${encodeURIComponent('/admin')}`)
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
    const nextUrl = params.toString() ? `/admin?${params.toString()}` : '/admin'
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
    })
  }, [appliedQuery, posts, statusFilter])

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

  return (
    <section
      className="admin-dashboard-page"
      role="region"
      aria-label="文章管理"
      data-page-state={pageState}
    >
      {dialog}
      <AdminPageHead
        index="01"
        eyebrow="ARTICLE ARCHIVE"
        title={view === 'trash' ? '回收站' : '文章'}
        description={view === 'trash' ? '误删的文字可以从这里恢复。' : '整理旧稿，也为下一篇文字留出位置。'}
        action={(
          <div className="admin-page-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setView((value) => value === 'posts' ? 'trash' : 'posts')
                setQuery('')
                setAppliedQuery('')
                setStatusFilter('all')
              }}
            >
              {view === 'trash' ? '返回文章' : '回收站'}
            </button>
            {view === 'posts' ? <Link href="/admin/editor" className="btn">写新文章</Link> : null}
          </div>
        )}
      />

      <div className="admin-filter-bar" role="search" aria-label="文章筛选">
        <label>
          <span className="sr-only">搜索文章</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、摘要或 slug"
          />
        </label>
        {view === 'posts' ? (
          <label>
            <span className="sr-only">发布状态</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="all">全部状态</option>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </label>
        ) : null}
        {posts ? <span className="hint">显示 {filteredPosts.length} / {posts.length}</span> : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm admin-refresh-button"
          onClick={() => void load()}
          disabled={loading || refreshing}
        >
          {refreshing ? '刷新中…' : '重新加载'}
        </button>
      </div>

      {error ? (
        <div className="admin-error-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>重新加载</button>
        </div>
      ) : null}

      {refreshing ? <p className="hint admin-refresh-status" role="status">正在刷新文章…</p> : null}

      {posts === null ? (
        <>
          <p className="hint" role="status">正在加载文章…</p>
          <div className="admin-list admin-list-skeleton" aria-hidden="true">
            <div className="admin-row-skeleton" data-testid="admin-row-skeleton" />
            <div className="admin-row-skeleton" />
            <div className="admin-row-skeleton" />
          </div>
        </>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state admin-empty-state">
          <div className="big">空</div>
          <p>
            {posts.length > 0
              ? '没有符合当前筛选条件的文章。'
              : view === 'trash' ? '回收站是空的。' : '还没有文章，点「写新文章」开始吧。'}
          </p>
          {posts.length > 0 && (query || statusFilter !== 'all') ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQuery('')
                setAppliedQuery('')
                setStatusFilter('all')
              }}
            >
              清除筛选
            </button>
          ) : null}
        </div>
      ) : (
        <div className="admin-list" role="list" aria-label="文章列表" aria-busy={refreshing}>
          {filteredPosts.map((post, index) => (
            <article key={post.id} className="admin-item" role="listitem" data-post-id={post.id}>
              <span className="admin-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>
                  <Link href={`/admin/editor?id=${post.id}`} className="admin-item-title">
                    {post.title}
                  </Link>
                  <span
                    className={`status-tag status-tag-${view === 'trash' ? 'trashed' : post.published ? 'published' : 'draft'}`}
                    data-status={view === 'trash' ? 'trashed' : post.published ? 'published' : 'draft'}
                  >
                    {view === 'trash' ? '已删除' : post.published ? '已发布' : '草稿'}
                  </span>
                </h3>
                <div className="meta">
                  更新于 {formatDate(post.updated_at)} · /posts/{post.slug.replace(/^trashbin-\d{13}-/, '')}
                </div>
              </div>
              <div className="ops">
                {view === 'trash' ? (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm admin-primary-action" onClick={() => void restore(post)}>
                      恢复
                    </button>
                    <details className="admin-more-menu">
                      <summary>更多操作</summary>
                      <div className="admin-more-menu-panel">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => void removePermanently(post)}>
                          彻底删除
                        </button>
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    {post.published ? (
                      <Link href={`/posts/${post.slug}`} className="btn btn-ghost btn-sm admin-primary-action">查看前台</Link>
                    ) : (
                      <Link href={`/admin/preview/${post.id}`} className="btn btn-ghost btn-sm admin-primary-action">预览草稿</Link>
                    )}
                    <Link href={`/admin/editor?id=${post.id}`} className="btn btn-ghost btn-sm admin-primary-action">编辑</Link>
                    <details className="admin-more-menu">
                      <summary>更多操作</summary>
                      <div className="admin-more-menu-panel">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => void moveToTrash(post)}>
                          移入回收站
                        </button>
                      </div>
                    </details>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
