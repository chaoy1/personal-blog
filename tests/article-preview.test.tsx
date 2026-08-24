import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

import { ArticlePreview } from '@/components/admin/ArticlePreview'

afterEach(cleanup)

describe('ArticlePreview', () => {
  it('renders a draft banner, article content, and return link', () => {
    render(<ArticlePreview post={{
      id: 'post-1',
      title: '未完的山路',
      slug: 'unfinished-road',
      excerpt: '一段尚未公开的摘要',
      content: '## 第二节\n\n正文',
      published: false,
      created_at: '2026-08-24T00:00:00.000Z',
      updated_at: '2026-08-24T01:00:00.000Z',
    }} />)

    expect(screen.getByText('草稿预览')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '未完的山路' })).toBeInTheDocument()
    expect(screen.getByText('一段尚未公开的摘要')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '第二节' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回编辑' })).toHaveAttribute(
      'href',
      '/admin/editor?id=post-1',
    )
  })
})
