import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, type Post } from '@/lib/posts'
import { listAllPhotos, listAllMoments, type TimelinePhoto, type TimelineMoment } from '@/lib/timeline'
import ScrollFX from '@/components/ScrollFX'
import TimelineReveal, { type TimelineEntry } from '@/components/TimelineReveal'
import PageIntro from '@/components/PageIntro'

export const revalidate = 60

export const metadata: Metadata = {
  title: '时间轴',
  description: '按时间串起文章、闲语与光影的记录。',
}

export default async function TimelinePage() {
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

  return (
    <div className="wrap timeline-page">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>时间轴</span>
      </nav>

      <PageIntro
        index="04"
        eyebrow="TIMELINE"
        title="时间轴"
        seal="岁"
        description={`凡 ${entries.length} 事，按时而录。`}
      />

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          还没有任何记录。
        </div>
      ) : (
        <TimelineReveal entries={entries} />
      )}
    </div>
  )
}
