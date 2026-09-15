import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  listPublishedPosts: vi.fn(),
  listAllPhotos: vi.fn(),
  listAllMoments: vi.fn(),
}))

vi.mock('@/lib/posts', () => ({ listPublishedPosts: fixtures.listPublishedPosts }))
vi.mock('@/lib/timeline', () => ({
  listAllPhotos: fixtures.listAllPhotos,
  listAllMoments: fixtures.listAllMoments,
}))
vi.mock('@/components/ScrollFX', () => ({ default: () => null }))
vi.mock('@/components/ArticleNav', () => ({ default: () => <nav aria-label="时间轴页导航" /> }))
vi.mock('@/components/PageIntro', () => ({
  default: ({ description }: { description: string }) => <header className="page-intro"><h1>时间轴</h1><p>{description}</p></header>,
}))
vi.mock('@/components/TimelineReveal', () => ({
  default: ({ entries }: { entries: Array<{ key: string; title: string }> }) => (
    <section>
      {entries.map((entry) => <article key={entry.key} data-entry-key={entry.key}>{entry.title}</article>)}
    </section>
  ),
}))

import TimelinePage from '@/app/timeline/page'

const post = {
  id: 'post-1',
  title: '桥边晚照',
  slug: 'bridge-evening',
  excerpt: '天色收拢，灯影刚好。',
  content: '正文',
  published: true,
  created_at: '2026-09-03T08:00:00Z',
  updated_at: '2026-09-03T08:00:00Z',
}

const photo = {
  id: 'photo-1',
  url: '/path.jpg',
  caption: '山路',
  created_at: '2024-06-01T08:00:00Z',
}

const moment = {
  id: 'moment-1',
  content: '沿着溪声走进一页春山。',
  images: ['/mountain.jpg'],
  created_at: '2025-07-02T08:00:00Z',
}

describe('P06 timeline page', () => {
  beforeEach(() => {
    fixtures.listPublishedPosts.mockResolvedValue([post])
    fixtures.listAllPhotos.mockResolvedValue([photo])
    fixtures.listAllMoments.mockResolvedValue([moment])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders one chronological mixed stream without changing the three source contracts', async () => {
    render(await TimelinePage())

    expect(screen.getByRole('main')).toHaveClass('timeline-page', 'timeline-page-body')
    expect(screen.getByRole('region', { name: '时间轴记录' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'ready')
    expect([...document.querySelectorAll<HTMLElement>('[data-entry-key]')].map((node) => node.dataset.entryKey)).toEqual([
      'post-post-1',
      'moment-moment-1',
      'photo-photo-1',
    ])
  })

  it('separates a load failure from an empty timeline and offers retry', async () => {
    fixtures.listPublishedPosts.mockRejectedValueOnce(new Error('offline'))
    render(await TimelinePage())

    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'error')
    expect(screen.getByRole('alert')).toHaveTextContent('时间轴暂时未能载入。')
    expect(screen.getByRole('link', { name: '重试时间轴' })).toHaveAttribute('href', '/timeline')
    expect(screen.queryByRole('region', { name: '时间轴记录' })).not.toBeInTheDocument()
  })

  it('uses one restrained empty state after all three sources return empty', async () => {
    fixtures.listPublishedPosts.mockResolvedValueOnce([])
    fixtures.listAllPhotos.mockResolvedValueOnce([])
    fixtures.listAllMoments.mockResolvedValueOnce([])
    const { container } = render(await TimelinePage())

    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'empty')
    expect(container.querySelector('.empty-state')).toHaveTextContent('还没有任何记录。')
  })
})
