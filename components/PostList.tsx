'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, type Post } from '@/lib/blog'
import { currentLang } from '@/lib/lang'

const CN_NO_HANS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']
const CN_NO_HANT = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾']
const CN_WM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const PAGE_SIZE = 10

export default function PostList({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(1)
  const [lang, setLang] = useState<'zh-Hans' | 'zh-Hant'>('zh-Hans')

  useEffect(() => {
    const sync = () => setLang(currentLang())
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] })
    return () => mo.disconnect()
  }, [])

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagePosts = useMemo(
    () => posts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [posts, safePage]
  )
  const CN_NO = lang === 'zh-Hant' ? CN_NO_HANT : CN_NO_HANS

  return (
    <>
      <section className="list">
        {pagePosts.map((post, i) => {
          const idx = (safePage - 1) * PAGE_SIZE + i
          return (
            <Link key={post.id} href={`/posts/${post.slug}`} className="item">
              <span className="no">{idx < CN_NO.length ? CN_NO[idx] : String(idx + 1).padStart(2, '0')}</span>
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
