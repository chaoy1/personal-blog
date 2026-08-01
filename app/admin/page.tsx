'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, type Post } from '@/lib/blog'

export default function AdminDashboard() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/posts')
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('加载文章失败')
      setPosts(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载文章失败')
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    if (!window.confirm('确定删除这篇文章？删除后不可恢复。')) return
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

  return (
    <>
      <div className="admin-toolbar">
        <h1>文章管理</h1>
        <Link href="/admin/editor" className="btn">
          ＋ 写新文章
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {posts === null ? (
        <p className="hint">加载中…</p>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          还没有文章，点「写新文章」开始吧。
        </div>
      ) : (
        <div className="admin-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-item">
              <div>
                <h3>
                  {post.title}
                  {!post.published ? <span className="draft-tag">草稿</span> : null}
                </h3>
                <div className="meta">
                  {formatDate(post.created_at)} · /posts/{post.slug}
                </div>
              </div>
              <div className="ops">
                <Link href={`/admin/editor?id=${post.id}`} className="btn btn-ghost btn-sm">
                  编辑
                </Link>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => remove(post.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
