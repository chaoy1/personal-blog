'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, type Post } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { runAdminAction } from '@/lib/admin-action'

type View = 'posts' | 'trash'
type StatusFilter = 'all' | 'published' | 'draft'

export default function AdminDashboard() {
  const router = useRouter()
  const { confirm, dialog } = useAdminConfirm()
  const { notify } = useAdminFeedback()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('posts')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const onUnauthorized = useCallback(() => {
    router.replace(`/admin/login?next=${encodeURIComponent('/admin')}`)
  }, [router])

  const load = useCallback(async () => {
    setError('')
    setPosts(null)
    try {
      const result = await runAdminAction<Post[]>(
        fetch(view === 'trash' ? '/api/admin/posts?trash=1' : '/api/admin/posts'),
        { onUnauthorized },
      )
      setPosts(result)
    } catch (cause) {
      setPosts([])
      setError(cause instanceof Error ? cause.message : '加载文章失败')
    }
  }, [onUnauthorized, view])

  useEffect(() => {
    void load()
  }, [load])

  const filteredPosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-CN')
    return (posts ?? []).filter((post) => {
      const matchesQuery = !needle
        || post.title.toLocaleLowerCase('zh-CN').includes(needle)
        || post.slug.toLocaleLowerCase('zh-CN').includes(needle)
        || post.excerpt.toLocaleLowerCase('zh-CN').includes(needle)
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'published' ? post.published : !post.published)
      return matchesQuery && matchesStatus
    })
  }, [posts, query, statusFilter])

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

  return (
    <>
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
                setStatusFilter('all')
              }}
            >
              {view === 'trash' ? '返回文章' : '回收站'}
            </button>
            {view === 'posts' ? <Link href="/admin/editor" className="btn">写新文章</Link> : null}
          </div>
        )}
      />

      <div className="admin-filter-bar" role="search">
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
      </div>

      {error ? (
        <div className="admin-error-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>重新加载</button>
        </div>
      ) : null}

      {posts === null ? (
        <p className="hint" role="status">正在加载文章…</p>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          {posts.length > 0
            ? '没有符合当前筛选条件的文章。'
            : view === 'trash' ? '回收站是空的。' : '还没有文章，点「写新文章」开始吧。'}
        </div>
      ) : (
        <div className="admin-list">
          {filteredPosts.map((post, index) => (
            <article key={post.id} className="admin-item">
              <span className="admin-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>
                  {post.title}
                  {view === 'trash'
                    ? <span className="draft-tag">已删除</span>
                    : !post.published ? <span className="draft-tag">草稿</span> : null}
                </h3>
                <div className="meta">
                  更新于 {formatDate(post.updated_at)} · /posts/{post.slug.replace(/^trashbin-\d{13}-/, '')}
                </div>
              </div>
              <div className="ops">
                {view === 'trash' ? (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void restore(post)}>
                      恢复
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void removePermanently(post)}>
                      彻底删除
                    </button>
                  </>
                ) : (
                  <>
                    {post.published ? (
                      <Link href={`/posts/${post.slug}`} className="btn btn-ghost btn-sm">查看前台</Link>
                    ) : (
                      <Link href={`/admin/preview/${post.id}`} className="btn btn-ghost btn-sm">预览草稿</Link>
                    )}
                    <Link href={`/admin/editor?id=${post.id}`} className="btn btn-ghost btn-sm">编辑</Link>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void moveToTrash(post)}>
                      移入回收站
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
