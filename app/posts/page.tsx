import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'
import PostList from '@/components/PostList'

export const revalidate = 60

export const metadata: Metadata = {
  title: '文章',
}

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
        <Link href="/">← 返回首页</Link>
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
        <p className="lede">凡 {posts.length} 篇，皆手记。</p>
      </header>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          还没有文章。
        </div>
      ) : (
        <PostList posts={posts} />
      )}

      <footer className="article-footer">
        <Link href="/">← 返回首页</Link>
        <span>共 {posts.length} 篇</span>
      </footer>
    </div>
  )
}
