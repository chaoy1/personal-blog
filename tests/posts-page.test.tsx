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

describe('P02 posts index page', () => {
  beforeEach(() => {
    fixtures.listPublishedPosts.mockResolvedValue(fixtures.posts)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('presents the collection as one xuan-paper scroll with a volume opening', async () => {
    const { container } = render(await PostsPage())

    expect(screen.getByRole('main')).toHaveClass('posts-page', 'collection-scroll', 'collection-scroll-posts')
    expect(container.querySelector('.posts-sheet')).toBeInTheDocument()
    expect(container.querySelector('.top-rule')).toBeInTheDocument()
    expect(container.querySelector('.posts-hero-stamp')).toHaveTextContent('文')

    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('文章')
    expect(title).toHaveTextContent('一册手记')
    // 卷首右下角标出真实篇数
    const writings = container.querySelector('[data-post-count]')
    expect(writings).toHaveAttribute('data-post-count', '2')
    expect(writings).toHaveTextContent('02 WRITINGS')
  })

  it('lists every entry with its ordinal, date and reading link', async () => {
    const { container } = render(await PostsPage())

    expect(screen.getByRole('heading', { level: 2, name: '篇目' })).toBeInTheDocument()
    expect(screen.getByText(/共收录/)).toHaveTextContent('02')
    expect(screen.getByRole('list', { name: '文章目录' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(2)
    // 单一年份时条目是二级标题（年份题头不出现）
    expect(screen.getByRole('heading', { level: 2, name: '山中一日' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '桥边晚照' })).toBeInTheDocument()
    expect(screen.getByText('山中一日').closest('a')).toHaveAttribute(
      'href',
      '/posts/a-day-in-the-mountains',
    )
    // 正式汉字序数 + 日期 + 读此篇
    expect(screen.getByText('第壹篇')).toBeInTheDocument()
    expect(screen.getByText('第贰篇')).toBeInTheDocument()
    expect(screen.getByText('2026.09.01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '读此篇：山中一日' })).toHaveAttribute(
      'href',
      '/posts/a-day-in-the-mountains',
    )
    expect(fixtures.listPublishedPosts).toHaveBeenCalledWith()
  })

  it('marks the first entry that carries an excerpt as the featured leaf', async () => {
    const { container } = render(await PostsPage())

    const featured = container.querySelectorAll('.entry.featured')
    expect(featured).toHaveLength(1)
    expect(featured[0]).toHaveTextContent('山中一日')
  })

  it('groups entries by year with a ganzhi heading when the list spans years', () => {
    const posts = [
      { ...fixtures.posts[0], id: 'a', slug: 'a', title: '今年一篇', created_at: '2026-09-01T08:00:00Z' },
      { ...fixtures.posts[1], id: 'b', slug: 'b', title: '去年一篇', created_at: '2025-07-23T08:00:00Z' },
    ]

    const { container } = render(<PostList posts={posts} />)

    expect(container.querySelectorAll('.year-group')).toHaveLength(2)
    // 2026 是丙午年，2025 是乙巳年；每个年份题头写明这一年收了几篇
    expect(screen.getByText('丙午 · 一篇')).toBeInTheDocument()
    expect(screen.getByText('乙巳 · 一篇')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '2026 年' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '2025 年' })).toBeInTheDocument()
    // 跨年份时条目降为三级标题，让年份题头统领
    expect(screen.getByRole('heading', { level: 3, name: '今年一篇' })).toBeInTheDocument()
  })

  it('falls back to a flat list inside one year instead of a lone year heading', () => {
    const { container } = render(<PostList posts={fixtures.posts} />)

    expect(container.querySelectorAll('.year-group')).toHaveLength(0)
    expect(screen.getByRole('list', { name: '文章目录' })).toBeInTheDocument()
  })

  it('shows a resource error instead of mislabelling a failed request as empty', async () => {
    fixtures.listPublishedPosts.mockRejectedValueOnce(new Error('offline'))

    const { container } = render(await PostsPage())

    expect(container.querySelector('[data-page-state="error"]')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('文章暂时未能载入。')
    expect(within(container.querySelector('[data-page-state="error"]')!).getByRole('link', { name: '返回首页' }))
      .toHaveAttribute('href', '/')
    expect(container.querySelector('.empty-state')).not.toBeInTheDocument()
    // 读取失败时不谎报篇数
    expect(container.querySelector('[data-post-count]')).toHaveAttribute('data-post-count', '')
    expect(screen.getByText('暂不可统计')).toBeInTheDocument()
  })

  it('uses one clear empty state after a successful empty response', async () => {
    fixtures.listPublishedPosts.mockResolvedValueOnce([])

    const { container } = render(await PostsPage())

    expect(container.querySelector('[data-page-state="empty"]')).toBeInTheDocument()
    expect(screen.getByText('还没有文章。')).toBeInTheDocument()
    expect(container.querySelector('.entries')).not.toBeInTheDocument()
  })

  it('keeps the existing ten-item pagination while grouping the visible page', () => {
    const posts = Array.from({ length: 11 }, (_, index) => ({
      ...fixtures.posts[0],
      id: `post-${index + 1}`,
      slug: `post-${index + 1}`,
      title: `文章 ${index + 1}`,
      created_at: `2026-0${(index % 9) + 1}-01T08:00:00Z`,
    }))

    const { container } = render(<PostList posts={posts} />)

    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(10)
    expect(screen.getByRole('navigation', { name: '分页' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下一页 →' }))

    expect(container.querySelectorAll('[data-post-row]')).toHaveLength(1)
    expect(container.querySelectorAll('.entry')).toHaveLength(1)
    expect(screen.getByText('文章 11')).toBeInTheDocument()
  })
})
