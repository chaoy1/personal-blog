import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  post: {
    id: 'post-1',
    title: '山中一日',
    slug: 'a-day-in-the-mountains',
    excerpt: '沿着溪声走进一页春山。',
    content: '正文',
    published: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  album: {
    id: 'album-1',
    title: '山行手记',
    description: '',
    cover_url: '/photo.jpg',
    created_at: '2026-09-02T08:00:00Z',
    photoCount: 1,
    photos: [{ id: 'photo-1', url: '/photo.jpg', caption: '桥边晚照' }],
  },
  guestbookEntry: {
    id: 'guestbook-1',
    user_id: 'visitor-1',
    content: '从山水间路过，留下问候。',
    parent_id: null,
    created_at: '2026-09-03T08:00:00Z',
    profiles: { nickname: '旅人', avatar_url: '' },
  },
}))

vi.mock('@/lib/posts', () => ({
  listPublishedPosts: vi.fn().mockResolvedValue([fixtures.post]),
  countPosts: vi.fn().mockResolvedValue(9),
  formatDate: (value: string) => value.slice(0, 10),
}))

vi.mock('@/lib/timeline', () => ({
  listAllMoments: vi.fn().mockRejectedValue(new Error('offline')),
  countMoments: vi.fn().mockResolvedValue(0),
  listRecentAlbumPreviews: vi.fn().mockResolvedValue([fixtures.album]),
  countPhotos: vi.fn().mockResolvedValue(5),
}))

vi.mock('@/lib/guestbook', () => ({
  listRecentGuestbook: vi.fn().mockResolvedValue([fixtures.guestbookEntry]),
}))

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}))

import HomePage from '@/app/page'
import { countPosts, listPublishedPosts } from '@/lib/posts'
import { countMoments, countPhotos, listAllMoments, listRecentAlbumPreviews } from '@/lib/timeline'
import { listRecentGuestbook } from '@/lib/guestbook'

describe('P01 home page route', () => {
  afterEach(cleanup)

  it('uses the P01 composition and keeps a failed resource local to its preview section', async () => {
    render(await HomePage())

    expect(screen.getByRole('main')).toHaveClass('home-page')
    expect(screen.getByRole('navigation', { name: '站点内容概览' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      '文章更多 →',
      '闲语更多 →',
      '光影更多 →',
      '留言更多 →',
    ])

    const feedback = screen.getByRole('alert')
    expect(feedback).toHaveTextContent('闲语暂时未能载入。')
    expect(feedback.closest('[data-home-section]')).toHaveAttribute('data-home-section', 'moments')
    expect(screen.getByRole('link', { name: /山中一日/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /山行手记/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /从山水间路过/ })).toBeInTheDocument()

    expect(listPublishedPosts).toHaveBeenCalledWith(3)
    expect(countPosts).toHaveBeenCalledWith()
    expect(listAllMoments).toHaveBeenCalledWith(3)
    expect(countMoments).toHaveBeenCalledWith()
    expect(listRecentAlbumPreviews).toHaveBeenCalledWith(3)
    expect(countPhotos).toHaveBeenCalledWith()
    expect(listRecentGuestbook).toHaveBeenCalledWith(3)
  })
})
