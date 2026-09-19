import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, type Post } from '@/lib/posts'
import ScrollFX from '@/components/ScrollFX'
import PostList from '@/components/PostList'
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

const EST_YEAR = '2024'

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
        <section className="posts-sheet" aria-labelledby="page-title">
          <div className="top-rule" aria-hidden="true" />

          <header className="posts-hero">
            <div className="posts-hero-copy">
              <div className="hero-overline">
                <span>卷 01</span>
                <small>THE WRITTEN PAGES</small>
              </div>
              <h1 id="page-title">
                <span className="title">文章</span>
                <span className="title-tail">一册手记</span>
              </h1>
              <p className="hero-intro">
                把日子写成文字，<b>慢慢收进纸页。</b>
              </p>
              <div className="hero-index">
                <span>EST. {EST_YEAR}</span>
                <i aria-hidden="true" />
                <span data-post-count={loadError ? '' : posts.length}>
                  {loadError ? '暂不可统计' : `${String(posts.length).padStart(2, '0')} WRITINGS`}
                </span>
              </div>
            </div>
            <div className="posts-hero-art" aria-hidden="true" />
            <span className="posts-hero-stamp" aria-hidden="true">
              文
            </span>
            <span className="posts-hero-aside" aria-hidden="true">
              字字留痕 · 岁月成章
            </span>
          </header>

          {loadError ? (
            <div className="posts-state posts-state-error" data-page-state="error">
              <InlineFeedback tone="error" message="文章暂时未能载入。" />
              <Link className="posts-state-link button-hit-area" href="/">
                返回首页
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <div className="posts-state posts-state-empty" data-page-state="empty">
              <EmptyState
                title="还没有文章。"
                description="等第一篇手记落墨后，它会出现在这里。"
                action={
                  <Link className="posts-state-link button-hit-area" href="/admin">
                    去后台写下第一篇
                  </Link>
                }
              />
            </div>
          ) : (
            <PostList posts={posts} />
          )}
        </section>

        <p className="page-footer">山水有尽 · 文字无涯</p>
      </main>
    </div>
  )
}