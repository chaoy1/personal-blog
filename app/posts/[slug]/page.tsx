import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import Comments from '@/components/Comments'
import ScrollFX from '@/components/ScrollFX'
import BackLink from '@/components/BackLink'
import ReadingCompanion from '@/components/ReadingCompanion'
import { getPostBySlug, formatDate, listPublishedPosts, type Post } from '@/lib/posts'

export const revalidate = 60

export async function generateStaticParams() {
  let posts: { slug: string }[] = []
  try {
    posts = await listPublishedPosts()
  } catch {
    // 数据库未配置等
  }
  return posts.map((p) => ({ slug: p.slug }))
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  let post = null
  try {
    post = await getPostBySlug(slug)
  } catch {
    // 环境变量未配置等情况，交给页面兜底
  }
  if (!post) return { title: '文章未找到' }
  return { title: post.title, description: post.excerpt || undefined }
}

/**
 * 推荐逻辑：以当前文章在时间轴上的位置为中心，
 * 依次取时间上相邻的文章（先旧后新交替），比固定取最新三篇更贴合上下文。
 */
function pickRelated(all: Post[], slug: string): Post[] {
  const idx = all.findIndex((p) => p.slug === slug)
  if (idx < 0) return all.slice(0, 3)
  const related: Post[] = []
  let older = idx + 1
  let newer = idx - 1
  while (related.length < 3 && (older < all.length || newer >= 0)) {
    if (older < all.length) related.push(all[older++])
    if (related.length < 3 && newer >= 0) related.push(all[newer--])
  }
  return related
}

export default async function PostPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  let post = null
  let related: Post[] = []
  try {
    post = await getPostBySlug(slug)
  } catch {
    // 同上
  }
  try {
    related = pickRelated(await listPublishedPosts(), slug)
  } catch {
    // 相关文章可缺省
  }
  if (!post) notFound()

  return (
    <div className="wrap article-wrap">
      <ScrollFX />
      <nav className="article-nav">
        <BackLink fallback="/posts" />
        <span>文章</span>
      </nav>

      <div className="article-reading-shell">
        <article className="article">
          <header className="article-header">
            <div className="article-kicker">
              <span>ARTICLE · 手记</span>
              <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            </div>
            <h1>
              {post.title}
              <span className="article-seal" aria-hidden="true">
                记
              </span>
            </h1>
            {post.excerpt ? <p className="article-excerpt">{post.excerpt}</p> : null}
          </header>
          <MarkdownView content={post.content} />
          <Comments slug={post.slug} />

          {related.length > 0 ? (
            <section className="related-posts">
              <h2>更多文章</h2>
              <ul>
                {related.map((p) => (
                  <li key={p.id}>
                    <Link href={`/posts/${p.slug}`}>{p.title}</Link>
                    <span className="related-date">{formatDate(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
        <ReadingCompanion />
      </div>
    </div>
  )
}
