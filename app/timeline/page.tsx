import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { listAllPhotos, listAllMoments, type TimelinePhoto, type TimelineMoment } from '@/lib/timeline'
import ScrollFX from '@/components/ScrollFX'

export const revalidate = 60

export const metadata: Metadata = {
  title: '時間軸',
}

const PAGE_SIZE = 20

type Entry = {
  key: string
  type: 'post' | 'photo' | 'moment'
  title: string
  excerpt: string
  image?: string
  href: string
  created_at: string
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  let posts: Post[] = []
  let photos: TimelinePhoto[] = []
  let moments: TimelineMoment[] = []
  try {
    ;[posts, photos, moments] = await Promise.all([
      listPublishedPosts(),
      listAllPhotos(),
      listAllMoments(),
    ])
  } catch {
    // 数据库未配置等情况，页面仍可渲染
  }

  const entries: Entry[] = [
    ...posts.map((p) => ({
      key: `post-${p.id}`,
      type: 'post' as const,
      title: p.title,
      excerpt: p.excerpt,
      href: `/posts/${p.slug}`,
      created_at: p.created_at,
    })),
    ...photos.map((ph) => ({
      key: `photo-${ph.id}`,
      type: 'photo' as const,
      title: ph.caption || '一張照片',
      excerpt: '',
      image: ph.url,
      href: '/album',
      created_at: ph.created_at,
    })),
    ...moments.map((m) => ({
      key: `moment-${m.id}`,
      type: 'moment' as const,
      title: '說說',
      excerpt: m.content,
      image: m.images[0],
      href: '/moments',
      created_at: m.created_at,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageEntries = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="wrap">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/">← 返回首頁</Link>
        <span>時間軸</span>
      </nav>

      <header className="posts-head">
        <p className="eyebrow">TIMELINE</p>
        <h1>
          時間軸
          <span className="article-seal" aria-hidden="true">
            歲
          </span>
        </h1>
        <p className="lede">凡 {entries.length} 事，按時而錄。</p>
      </header>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          還沒有任何記錄。
        </div>
      ) : (
        <>
          <section className="timeline">
            {pageEntries.map((e) => (
              <article className={`tl-item tl-${e.type}`} key={e.key}>
                <span className="tl-dot" aria-hidden="true" />
                <div className="tl-date">{formatDate(e.created_at)}</div>
                <div className="tl-card">
                  <span className={`tl-tag tl-tag-${e.type}`} aria-hidden="true">
                    {e.type === 'post' ? '文' : e.type === 'photo' ? '影' : '言'}
                  </span>
                  <div className="tl-body">
                    {e.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="tl-thumb" src={e.image} alt={e.title} loading="lazy" />
                    ) : null}
                    <div className="tl-text">
                      {e.type === 'post' ? (
                        <Link className="tl-title" href={e.href}>
                          {e.title}
                        </Link>
                      ) : (
                        <span className="tl-title">{e.title}</span>
                      )}
                      {e.excerpt ? <p className="tl-excerpt">{e.excerpt}</p> : null}
                      <Link className="tl-more" href={e.href}>
                        {e.type === 'post' ? '閱讀全文 →' : '查看全部 →'}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <div className="pager">
            {safePage > 1 ? (
              <Link href={`/timeline?page=${safePage - 1}`}>← 上一頁</Link>
            ) : (
              <span className="pager-disabled">← 上一頁</span>
            )}
            <span className="pager-info">
              第 {safePage} / {totalPages} 頁 · 共 {entries.length} 條
            </span>
            {safePage < totalPages ? (
              <Link href={`/timeline?page=${safePage + 1}`}>下一頁 →</Link>
            ) : (
              <span className="pager-disabled">下一頁 →</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
