import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useMoments: vi.fn(),
}))

vi.mock('@/lib/auth-context', () => ({ useAuth: fixtures.useAuth }))
vi.mock('@/lib/moments-context', () => ({ useMoments: fixtures.useMoments }))
vi.mock('@/components/ScrollFX', () => ({ default: () => null }))
vi.mock('@/components/ArticleNav', () => ({ default: () => <nav aria-label="闲语页导航" /> }))
vi.mock('@/components/Avatar', () => ({
  default: ({ className = '' }: { className?: string }) => <span className={className}>旅</span>,
}))
vi.mock('@/components/CommentThread', () => ({ default: () => null }))
vi.mock('@/components/ConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn(), dialog: null }),
}))

import MomentsPage from '@/app/moments/page'

const moments = [
  {
    id: 'moment-1',
    user_id: 'owner-1',
    content: '沿着溪声走进一页春山。',
    images: ['/mountain.jpg'],
    created_at: '2026-09-01T08:00:00Z',
    profiles: { nickname: '旅人', avatar_url: '' },
  },
]

function context(overrides: Record<string, unknown> = {}) {
  return {
    isOwner: false,
    moments,
    momentComments: [],
    momentLikes: [],
    error: '',
    ready: true,
    hasData: true,
    isInitialLoading: false,
    isRefreshing: false,
    refreshMoments: vi.fn(),
    deleteMoment: vi.fn().mockResolvedValue(null),
    addMomentComment: vi.fn().mockResolvedValue(null),
    toggleMomentLike: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('P04 moments page', () => {
  beforeEach(() => {
    fixtures.useAuth.mockReturnValue({ user: null })
    fixtures.useMoments.mockReturnValue(context())
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps ready moments readable and shows the login hint only to visitors', () => {
    render(<MomentsPage />)

    expect(screen.getByRole('main')).toHaveClass('moments-page')
    expect(screen.getByRole('region', { name: '闲语列表' })).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('沿着溪声走进一页春山。')
    expect(screen.getByRole('img', { name: '闲语配图' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '登录' })).toHaveAttribute('href', '/login')
  })

  it('does not submit a comment while IME composition is active', async () => {
    const addMomentComment = vi.fn().mockResolvedValue(null)
    fixtures.useAuth.mockReturnValue({ user: { id: 'reader-1' } })
    fixtures.useMoments.mockReturnValue(context({ addMomentComment }))
    render(<MomentsPage />)

    fireEvent.click(screen.getByRole('button', { name: /回应 · 0/ }))
    const input = screen.getByRole('textbox', { name: '评论' })
    fireEvent.change(input, { target: { value: '中文评论' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(addMomentComment).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(addMomentComment).toHaveBeenCalledWith('moment-1', '中文评论'))
  })

  it('renders the volume opening and a dated rail for each note', () => {
    render(<MomentsPage />)

    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('闲语')
    expect(screen.getByRole('heading', { level: 2, name: /近来所记/ })).toBeInTheDocument()
    expect(screen.getByLabelText('2026年9月1日')).toBeInTheDocument()
    expect(screen.getByText('SEP')).toBeInTheDocument()
  })

  it('collapses and reopens a note comment panel from its action row', () => {
    render(<MomentsPage />)

    const toggle = screen.getByRole('button', { name: /回应 · 0/ })
    const panel = document.getElementById('moment-comments-moment-1')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('hidden')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('hidden')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('hidden')
  })
  it('locates years without removing notes and folds only the month directory', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    fixtures.useMoments.mockReturnValue(context({ moments: [moments[0], { ...moments[0], id: 'older', created_at: '2025-08-12T08:00:00Z' }] }))
    render(<MomentsPage />)
    const year = screen.getByRole('button', { name: /2025.*01/ })
    fireEvent.click(year)
    expect(scrollIntoView).toHaveBeenCalled()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(year).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(year)
    expect(year).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('months-2025')).toHaveAttribute('hidden')
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows three stacked previews while keeping every photo available to the gallery', () => {
    fixtures.useMoments.mockReturnValue(context({ moments: [{ ...moments[0], images: ['/a.jpg','/b.jpg','/c.jpg','/d.jpg','/e.jpg'] }] }))
    render(<MomentsPage />)
    expect(screen.getAllByRole('img', { name: '闲语配图' })).toHaveLength(3)
    expect(document.querySelectorAll('.moment-images img')).toHaveLength(5)
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(document.querySelectorAll('.moment-images figcaption')).toHaveLength(0)
  })

  it.each([0,1,2,3])('adapts a note with %i photos without captions or missing content', count => {
    fixtures.useMoments.mockReturnValue(context({moments:[{...moments[0],images:Array.from({length:count},(_,i)=>`/image-${i}.jpg`)}]}))
    render(<MomentsPage />)
    expect(screen.queryAllByRole('img', {name:'闲语配图'})).toHaveLength(count)
    expect(screen.getByRole('article')).toHaveTextContent(moments[0].content)
    expect(document.querySelectorAll('figcaption')).toHaveLength(0)
  })

})
