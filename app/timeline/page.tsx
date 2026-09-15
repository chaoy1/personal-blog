import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublishedPosts, type Post } from '@/lib/posts'
import { listAllPhotos, listAllMoments, type TimelinePhoto, type TimelineMoment } from '@/lib/timeline'
import ScrollFX from '@/components/ScrollFX'
import TimelineReveal, { type TimelineEntry } from '@/components/TimelineReveal'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import { publicMetadata } from '@/lib/seo'
import '../timeline.css'

export const revalidate = 60

export const metadata: Metadata = publicMetadata({
  path: '/timeline',
  title: '时间轴',
  description: '按时间串起文章、闲语与光影的记录。',
})

export default async function TimelinePage() {
  let posts: Post[] = []
  let photos: TimelinePhoto[] = []
  let moments: TimelineMoment[] = []
  let loadError = ''
  try {
    ;[posts, photos, moments] = await Promise.all([
      listPublishedPosts(),
      listAllPhotos(),
      listAllMoments(),
    ])
  } catch {
    loadError = '时间轴暂时未能载入。'
  }

  const entries: TimelineEntry[] = [
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
      title: ph.caption || '一张照片',
      excerpt: '',
      image: ph.url,
      href: '/album',
      created_at: ph.created_at,
    })),
    ...moments.map((m) => ({
      key: `moment-${m.id}`,
      type: 'moment' as const,
      title: '闲语',
      excerpt: m.content,
      image: m.images[0],
      href: '/moments',
      created_at: m.created_at,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const pageState = loadError ? 'error' : entries.length > 0 ? 'ready' : 'empty'

  return (
    <main
      className="wrap timeline-page timeline-page-body"
      aria-label="时间轴"
      data-page-state={pageState}
      data-entry-count={entries.length}
    >
      <ScrollFX />
      <ArticleNav current="时间轴" />

      <PageIntro
        index="04"
        eyebrow="TIMELINE"
        title="时间轴"
        seal="岁"
        description={`凡 ${entries.length} 事，按时而录。`}
      />

      {loadError ? (
        <div className="timeline-state timeline-state-error" role="alert">
          <p>{loadError}</p>
          <Link className="timeline-state-link" href="/timeline" aria-label="重试时间轴">重试时间轴</Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state timeline-empty">
          <div className="big" aria-hidden="true">空</div>
          还没有任何记录。
        </div>
      ) : (
        <section aria-label="时间轴记录">
          <TimelineReveal entries={entries} />
        </section>
      )}
    </main>
  )
}
