import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))

vi.mock('@/components/admin/AdminConfirmDialog', () => ({
  useAdminConfirm: () => ({ confirm: mocks.confirm, dialog: null }),
}))

vi.mock('@/components/admin/AdminFeedback', () => ({
  useAdminFeedback: () => ({ notify: mocks.notify }),
}))

import AdminDashboard from '@/app/admin/page'

type TestPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

const posts: TestPost[] = [
  {
    id: 'post-1',
    title: '山中一日',
    slug: 'mountain-day',
    excerpt: '山路与晚风。',
    content: '正文',
    published: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-02T00:00:00.000Z',
  },
  {
    id: 'post-2',
    title: '河岸手记',
    slug: 'river-notes',
    excerpt: '一封未寄出的信。',
    content: '正文',
    published: false,
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-04T00:00:00.000Z',
  },
]

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('M02 admin dashboard', () => {
  beforeEach(() => {
    mocks.router.replace.mockReset()
    mocks.confirm.mockReset().mockResolvedValue(true)
    mocks.notify.mockReset()
    window.history.replaceState({}, '', '/admin')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps the filter surface and stable rows visible during loading and refresh', async () => {
    let resolveRefresh: (value: Response) => void = () => undefined
    const refresh = new Promise<Response>((resolve) => { resolveRefresh = resolve })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(posts))
      .mockReturnValueOnce(refresh)
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminDashboard />)

    expect(screen.getByRole('region', { name: '文章管理' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.getByRole('searchbox', { name: '搜索文章' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '发布状态' })).toBeInTheDocument()
    expect(screen.getByTestId('admin-row-skeleton')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('山中一日')).toBeInTheDocument())
    expect(screen.getByRole('region', { name: '文章管理' })).toHaveAttribute('data-page-state', 'ready')

    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))

    expect(screen.getByRole('region', { name: '文章管理' })).toHaveAttribute('data-page-state', 'refreshing')
    expect(screen.getByText('山中一日')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('正在刷新文章')

    resolveRefresh(response([{ ...posts[0], title: '山中一日·修订' }]))
    await waitFor(() => expect(screen.getByText('山中一日·修订')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('exposes article status as text and filters locally without refetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(posts))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminDashboard />)

    await waitFor(() => expect(screen.getByRole('list', { name: '文章列表' })).toBeInTheDocument())
    const list = screen.getByRole('list', { name: '文章列表' })
    expect(within(list).getByText('已发布')).toBeInTheDocument()
    expect(within(list).getByText('草稿')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: '山中一日' })).toHaveAttribute('href', '/admin/editor?id=post-1')

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索文章' }), { target: { value: '河岸' } })
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    expect(screen.getByRole('link', { name: '河岸手记' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '山中一日' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
