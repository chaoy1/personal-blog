import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import { getPostBySlug, formatDate, readingTime } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'

export const dynamic = 'force-dynamic'

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
  try {
    post = await getPostBySlug(slug)
  } catch {
    // 同上
  }
  if (!post) notFound()

  return (
    <div className="shell">
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>{SITE_NAME}</span>
      </nav>

      <article className="article">
        <p className="eyebrow">{formatDate(post.created_at)}</p>
        <h1>{post.title}</h1>
        <div className="article-meta">
          <span>{readingTime(post.content)}</span>
          {post.excerpt ? <span>{post.excerpt}</span> : null}
        </div>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>
        <MarkdownView content={post.content} />
      </article>

      <footer className="site-footer">
        <Link href="/">← 返回首页</Link>
        <span>写于 {formatDate(post.created_at)}</span>
      </footer>
    </div>
  )
}
