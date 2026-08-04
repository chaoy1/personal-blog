import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import Comments from '@/components/Comments'
import ScrollFX from '@/components/ScrollFX'
import { getPostBySlug, formatDate, readingTime, listPublishedPosts, type Post } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'

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
    related = (await listPublishedPosts(6)).filter((p) => p.slug !== slug).slice(0, 3)
  } catch {
    // 相关文章可缺省
  }
  if (!post) notFound()

  return (
    <div className="wrap">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>{SITE_NAME}</span>
      </nav>

      <article className="article">
        <p className="eyebrow">{formatDate(post.created_at)}</p>
        <h1>
          {post.title}
          <span className="article-seal" aria-hidden="true">
            记
          </span>
        </h1>
        <div className="article-meta">
          <span>{readingTime(post.content)}</span>
          {post.excerpt ? <span>{post.excerpt}</span> : null}
        </div>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>
        <MarkdownView content={post.content} />
        <Comments slug={post.slug} />

        {related.length > 0 ? (
          <section className="related-posts">
            <h2>更多篇章</h2>
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

      <footer className="article-footer">
        <Link href="/">← 返回首页</Link>
        <span>写于 {formatDate(post.created_at)}</span>
      </footer>
    </div>
  )
}
