'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, type Post } from '@/lib/blog'
import AdminPageHead from '@/components/AdminPageHead'

export default function AdminDashboard() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'posts' | 'trash'>('posts')

  const load = useCallback(async () => {
    try {
      const res = await fetch(view === 'trash' ? '/api/admin/posts?trash=1' : '/api/admin/posts')
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('加载文章失败')
      setPosts(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载文章失败')
    }
  }, [router, view])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    if (!window.confirm('将这篇文章移入回收站？之后仍可恢复。')) return
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('删除失败')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function restore(id: string) {
    setError('')
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'PATCH' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || '恢复失败')
      return
    }
    load()
  }

  async function removePermanently(id: string) {
    if (!window.confirm('确定彻底删除这篇文章？此操作无法恢复。')) return
    setError('')
    const res = await fetch(`/api/admin/posts/${id}?permanent=1`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || '彻底删除失败')
      return
    }
    load()
  }

  return (
    <>
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
                setPosts(null)
                setView((value) => value === 'posts' ? 'trash' : 'posts')
              }}
            >
              {view === 'trash' ? '返回文章' : '回收站'}
            </button>
            {view === 'posts' ? <Link href="/admin/editor" className="btn">写新文章</Link> : null}
          </div>
        )}
      />

      {error ? <p className="error-text">{error}</p> : null}

      {posts === null ? (
        <p className="hint">加载中…</p>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          {view === 'trash' ? '回收站是空的。' : '还没有文章，点「写新文章」开始吧。'}
        </div>
      ) : (
        <div className="admin-list">
          {posts.map((post, index) => (
            <div key={post.id} className="admin-item">
              <span className="admin-item-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>
                  {post.title}
                  {view === 'trash' ? <span className="draft-tag">已删除</span> : !post.published ? <span className="draft-tag">草稿</span> : null}
                </h3>
                <div className="meta">
                  {formatDate(post.created_at)} · /posts/{post.slug.replace(/^trashbin-\d{13}-/, '')}
                </div>
              </div>
              <div className="ops">
                {view === 'trash' ? (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => restore(post.id)}>
                      恢复
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removePermanently(post.id)}>
                      彻底删除
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={post.published ? `/posts/${post.slug}` : '#'}
                      className="btn btn-ghost btn-sm"
                      aria-disabled={!post.published}
                      style={post.published ? undefined : { pointerEvents: 'none', opacity: 0.45 }}
                    >
                      查看
                    </Link>
                    <Link href={`/admin/editor?id=${post.id}`} className="btn btn-ghost btn-sm">
                      编辑
                    </Link>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(post.id)}>
                      移入回收站
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
