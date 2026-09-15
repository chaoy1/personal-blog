import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import HomeHero from '@/components/home/HomeHero'
import HomePreviews from '@/components/home/HomePreviews'

const post = {
  id: 'post-1',
  title: '山中一日',
  slug: 'a-day-in-the-mountains',
  excerpt: '沿着溪声走进一页春山。',
  content: '正文',
  published: true,
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-01T08:00:00Z',
}

const photo = {
  id: 'photo-1',
  url: '/photo.jpg',
  caption: '桥边晚照',
  created_at: '2026-09-02T08:00:00Z',
}

const guestbookEntry = {
  id: 'guestbook-1',
  user_id: 'visitor-1',
  content: '从山水间路过，留下问候。',
  parent_id: null,
  created_at: '2026-09-03T08:00:00Z',
  profiles: { nickname: '旅人', avatar_url: '' },
}

describe('P01 home page composition', () => {
  afterEach(cleanup)

  it('keeps one primary title and exposes the three content statistics as a labelled navigation', () => {
    const { container } = render(<HomeHero postCount={12} momentCount={4} photoCount={8} />)

    expect(screen.getByRole('heading', { level: 1, name: '似 水 流 年' })).toBeInTheDocument()
    expect(container.querySelector('.branch svg')).toBeInTheDocument()
    expect(container.querySelector('.stroke')).toBeInTheDocument()
    expect(container.querySelector('.seal')).toHaveTextContent('记')
    expect(container.querySelector('.verse')).toBeInTheDocument()
    expect(container.querySelector('.sigil')).toBeInTheDocument()

    const overview = screen.getByRole('navigation', { name: '站点内容概览' })
    expect(within(overview).getByRole('link', { name: /12\s*文章/ })).toHaveAttribute('href', '/posts')
    expect(within(overview).getByRole('link', { name: /4\s*闲语/ })).toHaveAttribute('href', '/moments')
    expect(within(overview).getByRole('link', { name: /8\s*光影/ })).toHaveAttribute('href', '/album')
    for (const link of within(overview).getAllByRole('link')) {
      expect(link).toHaveClass('home-stat-link', 'button-hit-area')
    }

    expect(screen.getByRole('button', { name: '向下浏览首页内容' })).toBeInTheDocument()
  })

  it('keeps successful previews visible and binds a failed resource to its own section', () => {
    render(
      <HomePreviews
        posts={[post]}
        moments={[]}
        photos={[photo]}
        guestbook={[guestbookEntry]}
        errors={{ moments: '闲语暂时未能载入。' }}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      '文章更多 →',
      '闲语更多 →',
      '光影更多 →',
      '留言更多 →',
    ])
    expect(screen.getByRole('link', { name: /山中一日/ })).toHaveAttribute(
      'href',
      '/posts/a-day-in-the-mountains',
    )
    expect(screen.getByRole('link', { name: /桥边晚照/ })).toHaveAttribute('href', '/album')
    expect(screen.getByRole('link', { name: /从山水间路过/ })).toHaveAttribute('href', '/guestbook')

    const feedback = screen.getByRole('alert')
    expect(feedback).toHaveTextContent('闲语暂时未能载入。')
    expect(feedback.closest('[data-home-section]')).toHaveAttribute('data-home-section', 'moments')
  })

  it('renders one shared empty state when every homepage resource is empty', () => {
    render(
      <HomePreviews
        posts={[]}
        moments={[]}
        photos={[]}
        guestbook={[]}
        errors={{ posts: undefined, moments: undefined, photos: undefined, guestbook: undefined }}
      />,
    )

    expect(screen.getByText('长卷尚待落墨')).toBeInTheDocument()
    expect(screen.getAllByText('空')).toHaveLength(1)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
