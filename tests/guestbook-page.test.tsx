import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null },
  guestbook: {
    guestbook: [] as Array<{
      id: string
      user_id: string
      content: string
      parent_id: string | null
      created_at: string
      profiles: { nickname: string; avatar_url: string } | null
    }>,
    ready: true,
    hasData: true,
    isInitialLoading: false,
    isRefreshing: false,
    error: '',
    refreshGuestbook: vi.fn(),
    addGuestbook: vi.fn().mockResolvedValue(null),
    deleteGuestbook: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: fixtures.auth.user }),
}))
vi.mock('@/lib/guestbook-context', () => ({
  useGuestbook: () => fixtures.guestbook,
}))
vi.mock('@/components/ScrollFX', () => ({ default: () => null }))
vi.mock('@/components/ArticleNav', () => ({ default: () => <nav aria-label="留言页导航" /> }))
vi.mock('@/components/PageIntro', () => ({
  default: () => <header className="page-intro"><h1>留言</h1></header>,
}))
vi.mock('@/components/CommentThread', () => ({
  default: ({ items, emptyText }: { items: Array<{ id: string; content: string }>; emptyText?: string }) => (
    <>{items.map((item) => <article key={item.id}>{item.content}</article>)}{items.length === 0 && emptyText ? <p className="comment-empty">{emptyText}</p> : null}</>
  ),
}))
vi.mock('@/components/Pagination', () => ({ default: () => null }))
vi.mock('@/components/ConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn(), dialog: null }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

import GuestbookPage from '@/app/guestbook/page'

const entry = {
  id: 'note-1',
  user_id: 'visitor-1',
  content: '沿着山路来访。',
  parent_id: null,
  created_at: '2026-09-15T08:00:00Z',
  profiles: { nickname: '旅人', avatar_url: '' },
}

describe('P07 guestbook page', () => {
  beforeEach(() => {
    fixtures.auth.user = null
    Object.assign(fixtures.guestbook, {
      guestbook: [entry],
      ready: true,
      hasData: true,
      isInitialLoading: false,
      isRefreshing: false,
      error: '',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('exposes a stable ready state while keeping the message region semantic', () => {
    render(<GuestbookPage />)

    expect(screen.getByRole('main', { name: '留言' })).toHaveAttribute('data-page-state', 'ready')
    expect(screen.getByRole('main')).toHaveAttribute('data-entry-count', '1')
    expect(screen.getByRole('region', { name: '已收留言' })).toHaveTextContent('沿着山路来访。')
  })

  it('distinguishes empty and error states without showing a false empty invitation', () => {
    Object.assign(fixtures.guestbook, { guestbook: [] })
    const { rerender } = render(<GuestbookPage />)

    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'empty')
    expect(screen.getByText('还没有人留言，来写第一句吧。')).toBeInTheDocument()

    Object.assign(fixtures.guestbook, {
      hasData: false,
      ready: false,
      isInitialLoading: false,
      error: '留言读取失败',
    })
    rerender(<GuestbookPage />)

    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'error')
    expect(screen.getByRole('alert')).toHaveTextContent('留言读取失败')
    expect(screen.queryByText('还没有人留言，来写第一句吧。')).not.toBeInTheDocument()
  })

  it('marks a background refresh without clearing the cached message list', () => {
    Object.assign(fixtures.guestbook, { isRefreshing: true })
    render(<GuestbookPage />)

    expect(screen.getByRole('main')).toHaveAttribute('data-page-state', 'refreshing')
    expect(screen.getByRole('status')).toHaveTextContent('正在同步留言')
    expect(screen.getByRole('region', { name: '已收留言' })).toHaveTextContent('沿着山路来访。')
  })

  it('moves focus into the writing panel and returns it to the trigger on Escape', async () => {
    fixtures.auth.user = { id: 'visitor-1' }
    render(<GuestbookPage />)

    const trigger = screen.getByRole('button', { name: '写留言' })
    fireEvent.click(trigger)

    const textarea = await screen.findByRole('textbox', { name: '留言内容' })
    await waitFor(() => expect(document.activeElement).toBe(textarea))

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
