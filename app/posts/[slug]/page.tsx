import ResourcePrefetchLink from '@/components/ResourcePrefetchLink'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import Comments from '@/components/Comments'
import ScrollFX from '@/components/ScrollFX'
import ArticleNav from '@/components/ArticleNav'
import ReadingCompanion from '@/components/ReadingCompanion'
import { getPostBySlug, formatDate, readingTime, listPublishedPosts, type Post } from '@/lib/posts'
import { SITE_NAME, SITE_VERSE } from '@/lib/site'
import { articleJsonLd, articleMetadata, siteUrl } from '@/lib/seo'
import '../article-detail.css'

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
  if (!post) return { title: '文章未找到', description: '这篇文章暂时无法找到。' }
  return articleMetadata(post)
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

/** 标题在自然停顿处折成两行：前段用行书起笔，后段用楷书收束。 */
function splitTitle(title: string): { brush: string; line: string } | null {
  const match = title.match(/[，,：:｜|]/)
  if (!match || match.index === undefined) return null
  const brush = title.slice(0, match.index + 1).trim()
  const line = title.slice(match.index + 1).trim()
  if (!brush || !line) return null
  if (brush.length > 6 || line.length > 18) return null
  return { brush, line }
}

/** 纸页右下角的竖排批注：取第一节标题当作眉批。 */
function firstSectionTitle(content: string): string {
  const match = content.match(/^#{2,3}\s+(.+)$/m)
  if (!match) return ''
  return match[1]
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~#]/g, '')
    .trim()
    .slice(0, 14)
}

function countWords(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latin = (content.match(/[A-Za-z0-9]+/g) ?? []).length
  return cjk + latin
}

export default async function PostPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  let post = null
  let all: Post[] = []
  try {
    post = await getPostBySlug(slug)
  } catch {
    // 同上
  }
  try {
    all = await listPublishedPosts()
  } catch {
    // 目录与推荐可缺省
  }
  if (!post) notFound()

  const related = pickRelated(all, slug)
  const idx = all.findIndex((p) => p.slug === slug)
  const ordinal = idx < 0 ? 0 : all.length - idx
  const heading = splitTitle(post.title)
  const caption = firstSectionTitle(post.content) || SITE_VERSE
  const words = countWords(post.content)
  const jsonLd = articleJsonLd(post, siteUrl())

  return (
    <div className="wrap article-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ScrollFX />
      <ArticleNav
        current="文章"
        backMode="history"
        backFallback="/posts"
        backLabel="返回文章"
      />

      <article className="art-sheet" id="top">
        <div className="art-sheet-edge" aria-hidden="true" />

        <header className="art-hero">
          <div className="art-hero-copy">
            <p className="art-eyebrow">
              <span>{ordinal > 0 ? `第 ${ordinal} 篇 · 手记` : '手记'}</span>
              <i aria-hidden="true" />
              <small>{ordinal > 0 ? `ARTICLE / ${String(ordinal).padStart(2, '0')}` : 'ARTICLE'}</small>
            </p>
            <h1 className={heading ? 'art-title' : 'art-title art-title-plain'}>
              {heading ? (
                <>
                  <span className="art-title-brush">{heading.brush}</span>
                  <span className="art-title-line">{heading.line}</span>
                </>
              ) : (
                <span className="art-title-line">{post.title}</span>
              )}
            </h1>
            {post.excerpt ? <p className="art-lede">{post.excerpt}</p> : null}
            <div className="art-meta">
              <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
              <b aria-hidden="true" />
              <span>{readingTime(post.content)}阅读</span>
            </div>
          </div>
          <div className="art-hero-art" aria-hidden="true" />
          <span className="art-hero-seal" aria-hidden="true">
            记
          </span>
          <span className="art-caption" aria-hidden="true">
            {caption}
          </span>
        </header>

        <div className="art-hero-foot">
          <span>全文 {words.toLocaleString('zh-CN')} 字</span>
          <span>THE ART OF READING</span>
        </div>

        <div className="art-reading">
          <div className="art-prose">
            <MarkdownView content={post.content} />
            <p className="art-end">
              读到这里
              <i aria-hidden="true">毕</i>
            </p>
          </div>
          <ReadingCompanion />
        </div>

        <div className="art-chapter" aria-hidden="true">
          <span>卷尾</span>
        </div>

        {related.length > 0 ? (
          <section className="art-afterword" aria-labelledby="art-afterword-title">
            <div className="art-afterword-head">
              <h2 id="art-afterword-title">继续读下去</h2>
              <span aria-hidden="true">MORE STORIES</span>
            </div>
            <div className="art-related">
              {related.map((item) => (
                <ResourcePrefetchLink
                  key={item.id}
                  href={`/posts/${item.slug}`}
                  resourceKey={`comments:${item.slug}`}
                  intentPrefetch
                  className="art-related-card"
                >
                  <small>
                    {new Date(item.created_at) > new Date(post.created_at) ? '写在这篇之后' : '写在这篇之前'} ·{' '}
                    {formatDate(item.created_at)}
                  </small>
                  <strong>{item.title}</strong>
                  <span className="art-related-arrow" aria-hidden="true">
                    ↗
                  </span>
                </ResourcePrefetchLink>
              ))}
            </div>
          </section>
        ) : null}

        <Comments slug={post.slug} title="读后留白" />

        <footer className="art-colophon">
          <span>{SITE_NAME} · 一页一景</span>
          <i aria-hidden="true">文</i>
        </footer>
      </article>
    </div>
  )
}
