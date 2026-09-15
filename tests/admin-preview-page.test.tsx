import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPostById: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

vi.mock('@/lib/posts', () => ({ getPostById: mocks.getPostById }))

import AdminArticlePreviewPage from '@/app/admin/preview/[id]/page'
import AdminArticlePreviewLoading from '@/app/admin/preview/[id]/loading'

const post = {
  id: 'post-1',
  title: '山中一日',
  slug: 'mountain-day',
  excerpt: '山路与晚风。',
  content: '# 正文',
  published: false,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-02T00:00:00.000Z',
}

describe('M07 admin article preview route', () => {
  beforeEach(() => mocks.getPostById.mockReset())

  afterEach(() => cleanup())

  it('renders the saved article through the public-fidelity preview component', async () => {
    mocks.getPostById.mockResolvedValue(post)
    render(await AdminArticlePreviewPage({ params: Promise.resolve({ id: 'post-1' }) }))

    expect(screen.getByRole('region', { name: '文章预览' })).toHaveAttribute('data-preview-state', 'ready')
    expect(screen.getByText('后台预览 · 仅显示已保存版本')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回编辑' })).toHaveAttribute('href', '/admin/editor?id=post-1')
    expect(screen.getByRole('link', { name: '返回文章管理' })).toHaveAttribute('href', '/admin')
  })

  it('does not reveal content when an article is missing or unavailable', async () => {
    mocks.getPostById.mockResolvedValueOnce(null)
    const missing = render(await AdminArticlePreviewPage({ params: Promise.resolve({ id: 'missing' }) }))
    expect(screen.getByRole('region', { name: '文章预览' })).toHaveAttribute('data-preview-state', 'not-found')
    expect(screen.getByRole('heading', { name: '找不到这篇文章' })).toBeInTheDocument()
    expect(screen.queryByText('正文')).not.toBeInTheDocument()
    missing.unmount()

    mocks.getPostById.mockRejectedValueOnce(new Error('数据库不可用'))
    render(await AdminArticlePreviewPage({ params: Promise.resolve({ id: 'post-1' }) }))
    expect(screen.getByRole('region', { name: '文章预览' })).toHaveAttribute('data-preview-state', 'error')
    expect(screen.getByRole('heading', { name: '文章预览暂时无法加载' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '重新加载' })).toHaveAttribute('href', '/admin/preview/post-1')
  })

  it('keeps the preview identity and body skeleton visible while loading', () => {
    render(<AdminArticlePreviewLoading />)

    expect(screen.getByRole('region', { name: '文章预览' })).toHaveAttribute('data-preview-state', 'loading')
    expect(screen.getByRole('status')).toHaveTextContent('正在加载文章预览')
  })
})
