import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, type Post } from '@/lib/posts'
import ScrollFX from '@/components/ScrollFX'
import PostList from '@/components/PostList'
import PageIntro from '@/components/PageIntro'

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
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>文章</span>
      </nav>

      <PageIntro
        index="01"
        eyebrow="ARTICLES"
        title="全部文章"
        seal="文"
        description={`凡 ${posts.length} 篇，皆手记。`}
      />

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          还没有文章。
        </div>
      ) : (
        <PostList posts={posts} />
      )}

      <footer className="article-footer">
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>共 {posts.length} 篇</span>
      </footer>
    </div>
  )
}
