import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, type Post } from '@/lib/posts'
import ScrollFX from '@/components/ScrollFX'
import PostList from '@/components/PostList'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import EmptyState from '@/components/EmptyState'
import InlineFeedback from '@/components/InlineFeedback'
import { publicMetadata } from '@/lib/seo'
import '../posts.css'

export const revalidate = 60

export const metadata: Metadata = publicMetadata({
  path: '/posts',
  title: '文章',
  description: '收录阅读、技术与生活的长篇手记。',
})

export default async function PostsPage() {
  let posts: Post[] = []
  let loadError = false
  try {
    posts = await listPublishedPosts()
  } catch {
    loadError = true
  }

  return (
    <div className="wrap">
      <ScrollFX />
      <ArticleNav current="文章" />

      <main className="posts-page collection-scroll collection-scroll-posts">
        <PageIntro
          index="01"
          eyebrow="ARTICLES"
          title="全部文章"
          seal="文"
          description={loadError ? '文章暂时未能载入，请稍后重试。' : `凡 ${posts.length} 篇，皆手记。`}
        />

        {loadError ? (
          <div className="posts-state posts-state-error" data-page-state="error">
            <InlineFeedback tone="error" message="文章暂时未能载入。" />
            <Link className="posts-state-link button-hit-area" href="/">返回首页</Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="posts-state posts-state-empty" data-page-state="empty">
            <EmptyState
              title="还没有文章。"
              description="等第一篇手记落墨后，它会出现在这里。"
              action={<Link className="posts-state-link button-hit-area" href="/admin">去后台写下第一篇</Link>}
            />
          </div>
        ) : (
          <PostList posts={posts} />
        )}

        <footer className="article-footer">
          <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
          <span>{loadError ? '暂不可统计' : `共 ${posts.length} 篇`}</span>
        </footer>
      </main>
    </div>
  )
}
