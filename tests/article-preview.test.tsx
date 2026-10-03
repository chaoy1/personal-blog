import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

import { ArticlePreview } from '@/components/admin/ArticlePreview'

afterEach(cleanup)

describe('ArticlePreview', () => {
  it('builds the outline from rendered Markdown headings and keeps fenced code out of it', () => {
    render(<ArticlePreview post={{
      id: 'post-outline', title: '一册手记', slug: 'notebook', excerpt: '**一行小序**',
      content: '## 山窗\n\n正文\n\n```md\n## 代码里的标题\n```\n\n## 山窗\n\n[链接](https://example.com)',
      published: false, created_at: '2026-10-02T00:00:00.000Z', updated_at: '2026-10-02T01:00:00.000Z',
    }} />)

    const outline = within(screen.getByRole('navigation', { name: '文章目录' }))
    const links = outline.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', `#${encodeURIComponent('山窗')}`)
    expect(links[1]).toHaveAttribute('href', `#${encodeURIComponent('山窗-2')}`)
    expect(screen.getByText('一行小序').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: '链接' })).toHaveAttribute('href', 'https://example.com')
  })

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

    expect(screen.getByRole('region', { name: '文章预览' })).toHaveAttribute('data-preview-state', 'ready')
    expect(screen.getByText('草稿预览')).toBeInTheDocument()
    expect(screen.getByText('后台预览 · 仅显示已保存版本')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '未完的山路' })).toBeInTheDocument()
    expect(screen.getByText('一段尚未公开的摘要')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '第二节' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回编辑' })).toHaveAttribute(
      'href',
      '/admin/editor?id=post-1',
    )
    expect(screen.getByRole('link', { name: '跳到预览正文' })).toHaveAttribute('href', '#admin-preview-content')
  })
})
