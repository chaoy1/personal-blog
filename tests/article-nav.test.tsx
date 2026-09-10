import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

import ArticleNav from '@/components/ArticleNav'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ArticleNav', () => {
  it('limits the paper treatment to text labels while preserving accessible navigation', () => {
    render(<ArticleNav current="关于" ariaLabel="关于页导航" />)

    const navigation = screen.getByRole('navigation', { name: '关于页导航' })
    const home = within(navigation).getByRole('link', { name: '返回首页' })

    expect(home).toHaveClass('article-nav-home')
    expect(within(home).getByText('返回首页')).toHaveClass('article-nav-label')
    expect(within(navigation).getByText('关于')).toHaveClass('article-nav-label')
    expect(navigation.querySelectorAll('.article-nav-label')).toHaveLength(2)
    expect(navigation.querySelector('.article-nav-paper')).not.toBeInTheDocument()
  })

  it('keeps history navigation for article detail pages', () => {
    window.history.pushState({}, '', '/posts/example')

    render(
      <ArticleNav
        current="文章"
        ariaLabel="文章页导航"
        backMode="history"
        backFallback="/posts"
        backLabel="返回上一页"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '返回上一页' }))

    expect(router.back).toHaveBeenCalledOnce()
    expect(screen.getByText('返回上一页')).toHaveClass('article-nav-label')
  })
})
