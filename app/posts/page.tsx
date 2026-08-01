import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '文章',
}

const CN_NO = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']
const CN_WM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export default async function PostsPage() {
  let posts: Post[] = []
  try {
    posts = await listPublishedPosts()
  } catch {
    // 数据库未配置等情况
  }

  return (
    <div className="wrap">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/">← 返回首頁</Link>
        <span>{SITE_NAME} · 文章</span>
      </nav>

      <header className="posts-head">
        <p className="eyebrow">ARTICLES</p>
        <h1>
          全部文章
          <span className="article-seal" aria-hidden="true">
            文
          </span>
        </h1>
        <p className="lede">凡 {posts.length} 篇，皆手記。</p>
      </header>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          還沒有文章。
        </div>
      ) : (
        <section className="list">
          {posts.map((post, i) => (
            <Link key={post.id} href={`/posts/${post.slug}`} className="item">
              <span className="no">
                {i < CN_NO.length ? CN_NO[i] : String(i + 1).padStart(2, '0')}
              </span>
              <span className="tag-seal" aria-hidden="true">
                閱
              </span>
              <span className="wm" aria-hidden="true">
                {i < CN_WM.length ? CN_WM[i] : ''}
              </span>
              <h2 className="post-title">{post.title}</h2>
              {post.excerpt ? <span className="ex">{post.excerpt}</span> : null}
              <span className="item-foot">
                <span className="date">{formatDate(post.created_at)}</span>
                <span className="read">閱讀全文</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <footer className="article-footer">
        <Link href="/">← 返回首頁</Link>
        <span>共 {posts.length} 篇</span>
      </footer>
    </div>
  )
}
