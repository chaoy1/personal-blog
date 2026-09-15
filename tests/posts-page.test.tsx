import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  listPublishedPosts: vi.fn(),
  posts: [
    {
      id: 'post-1',
      title: '山中一日',
      slug: 'a-day-in-the-mountains',
      excerpt: '沿着溪声走进一页春山。',
      content: '正文',
      published: true,
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T08:00:00Z',
    },
    {
      id: 'post-2',
      title: '桥边晚照',
      slug: 'evening-by-the-bridge',
      excerpt: '天色收拢，灯影刚好。',
      content: '正文',
      published: true,
      created_at: '2026-08-21T08:00:00Z',
      updated_at: '2026-08-21T08:00:00Z',
    },
  ],
}))

vi.mock('@/lib/posts', () => ({
  listPublishedPosts: fixtures.listPublishedPosts,
  formatDate: (value: string) => value.slice(0, 10),
}))

import PostsPage from '@/app/posts/page'
import PostList from '@/components/PostList'

describe('P02 posts page', () => {
  beforeEach(() => {
    fixtures.listPublishedPosts.mockResolvedValue(fixtures.posts)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('presents the open collection as an ordered book list and keeps the query contract', async () => {
    const { container } = render(await PostsPage())

    expect(screen.getByRole('main')).toHaveClass('posts-page', 'collection-scroll', 'collection-scroll-posts')
    expect(screen.getByRole('heading', { level: 1, name: '全部文章' })).toBeInTheDocument()
    expect(screen.getByText('凡 2 篇，皆手记。')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '文章目录' })).toBeInTheDocument()
    expect(container.querySelectorAll('.posts-list-item')).toHaveLength(2)
    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 2, name: '山中一日' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '桥边晚照' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /山中一日/ })).toHaveAttribute('href', '/posts/a-day-in-the-mountains')
    expect(fixtures.listPublishedPosts).toHaveBeenCalledWith()
  })

  it('shows a resource error instead of mislabelling a failed request as empty', async () => {
    fixtures.listPublishedPosts.mockRejectedValueOnce(new Error('offline'))

    const { container } = render(await PostsPage())

    expect(container.querySelector('[data-page-state="error"]')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('文章暂时未能载入。')
    expect(within(container.querySelector('[data-page-state="error"]')!).getByRole('link', { name: '返回首页' }))
      .toHaveAttribute('href', '/')
    expect(container.querySelector('.empty-state')).not.toBeInTheDocument()
    expect(screen.getByText('暂不可统计')).toBeInTheDocument()
  })

  it('uses one clear empty state after a successful empty response', async () => {
    fixtures.listPublishedPosts.mockResolvedValueOnce([])

    const { container } = render(await PostsPage())

    expect(container.querySelector('[data-page-state="empty"]')).toBeInTheDocument()
    expect(screen.getByText('还没有文章。')).toBeInTheDocument()
    expect(container.querySelector('.posts-list')).not.toBeInTheDocument()
  })

  it('keeps the existing ten-item pagination without changing the row contract', () => {
    const posts = Array.from({ length: 11 }, (_, index) => ({
      ...fixtures.posts[0],
      id: `post-${index + 1}`,
      slug: `post-${index + 1}`,
      title: `文章 ${index + 1}`,
    }))

    const { container } = render(<PostList posts={posts} />)

    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(10)
    expect(screen.getByRole('navigation', { name: '分页' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下一页 →' }))
    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: '文章 11' })).toBeInTheDocument()
  })
})
