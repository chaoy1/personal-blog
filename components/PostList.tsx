'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, type Post } from '@/lib/blog'
import CnNum from '@/components/CnNum'

const CN_WM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const PAGE_SIZE = 10

export default function PostList({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagePosts = useMemo(
    () => posts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [posts, safePage]
  )

  return (
    <>
      <section className="list">
        {pagePosts.map((post, i) => {
          const idx = (safePage - 1) * PAGE_SIZE + i
          return (
            <Link key={post.id} href={`/posts/${post.slug}`} className="item">
              <span className="no">
                <CnNum i={idx} />
              </span>
              <span className="tag-seal" aria-hidden="true">
                阅
              </span>
              <span className="wm" aria-hidden="true">
                {idx < CN_WM.length ? CN_WM[idx] : ''}
              </span>
              <h2 className="post-title">{post.title}</h2>
              {post.excerpt ? <span className="ex">{post.excerpt}</span> : null}
              <span className="item-foot">
                <span className="date">{formatDate(post.created_at)}</span>
                <span className="read">阅读全文</span>
              </span>
            </Link>
          )
        })}
      </section>

      {totalPages > 1 ? (
        <div className="pager">
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
            ← 上一页
          </button>
          <span className="pager-info">
            第 {safePage} / {totalPages} 页 · 共 {posts.length} 篇
          </span>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
            下一页 →
          </button>
        </div>
      ) : null}
    </>
  )
}
