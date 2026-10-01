import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  useAlbums: vi.fn(),
}))

vi.mock('@/lib/albums-context', () => ({ useAlbums: fixtures.useAlbums }))
vi.mock('@/lib/blog', () => ({ formatDate: (value: string) => value.slice(0, 10) }))
vi.mock('@/components/ArticleNav', () => ({ default: () => <nav aria-label="光影页导航" /> }))
import AlbumPage from '@/app/album/page'

const albums = [
  {
    id: 'album-1',
    user_id: 'owner-1',
    title: '春山册',
    description: '沿溪收存的几帧春色。',
    cover_url: '/spring-cover.jpg',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'album-2',
    user_id: 'owner-1',
    title: '夜航册',
    description: '',
    cover_url: '',
    created_at: '2026-08-21T08:00:00Z',
  },
]

const photos = [
  {
    id: 'photo-1',
    user_id: 'owner-1',
    url: '/spring-bridge.jpg',
    caption: '桥边晚照',
    album_id: 'album-1',
    created_at: '2026-09-02T08:00:00Z',
  },
  {
    id: 'photo-2',
    user_id: 'owner-1',
    url: '/spring-path.jpg',
    caption: '',
    album_id: 'album-1',
    created_at: '2026-09-03T08:00:00Z',
  },
  {
    id: 'photo-orphan',
    user_id: 'owner-1',
    url: '/orphan.jpg',
    caption: '未题之景',
    album_id: null,
    created_at: '2026-08-01T08:00:00Z',
  },
]

function context(overrides: Record<string, unknown> = {}) {
  return {
    albums,
    photos,
    error: '',
    ready: true,
    hasData: true,
    isInitialLoading: false,
    isRefreshing: false,
    refreshAlbums: vi.fn(),
    createAlbum: vi.fn(),
    updateAlbum: vi.fn(),
    deleteAlbum: vi.fn(),
    deletePhoto: vi.fn(),
    ...overrides,
  }
}

describe('P05 album page', () => {
  beforeEach(() => {
    fixtures.useAlbums.mockReturnValue(context())
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('moves from the album shelf into a detail view without a new data request', () => {
    render(<AlbumPage />)

    expect(screen.getByRole('main')).toHaveClass('album-page')
    expect(screen.getByRole('region', { name: '相册索引' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开相册：春山册' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开相册：全部照片' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开相册：春山册' }))

    expect(screen.getByRole('region', { name: '相册详情' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '春山册' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回相册列表' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '桥边晚照' })).toHaveAttribute('data-lightbox-caption', '桥边晚照')

    fireEvent.click(screen.getByRole('button', { name: '返回相册列表' }))
    expect(screen.getByRole('region', { name: '相册索引' })).toBeInTheDocument()
  })

  it('keeps a stable placeholder when a photo fails to load', () => {
    const { container } = render(<AlbumPage />)
    fireEvent.click(screen.getByRole('button', { name: '打开相册：春山册' }))

    fireEvent.error(screen.getByRole('img', { name: '桥边晚照' }))

    expect(container.querySelector('[data-photo-placeholder="photo-1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-photo-placeholder="photo-1"]')).toHaveTextContent('影')
  })

  it('distinguishes cached content errors from an initial empty state', () => {
    fixtures.useAlbums.mockReturnValue(context({ error: '相册暂时未能载入。', hasData: false, albums: [], photos: [] }))
    const { container } = render(<AlbumPage />)

    expect(container.querySelector('[data-page-state="error"]')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('相册暂时未能载入。')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('shows distinct cover frames without repeating one photo to fill the stack', () => {
    fixtures.useAlbums.mockReturnValue(context({ albums: [{ ...albums[0], cover_url: photos[0].url }, albums[1]] }))
    render(<AlbumPage />)
    const card = screen.getByRole('button', { name: '打开相册：春山册' })
    expect(Array.from(card.querySelectorAll('img'), image => image.getAttribute('src')))
      .toEqual(['/spring-bridge.jpg', '/spring-path.jpg'])
    const orphan = screen.getByRole('button', { name: '打开相册：全部照片' })
    expect(orphan.querySelectorAll('img')).toHaveLength(1)
    fireEvent.click(orphan)
    expect(screen.getByRole('img', { name: '未题之景' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '桥边晚照' })).not.toBeInTheDocument()
  })

  it('keeps the remaining cover frames when one image fails', () => {
    render(<AlbumPage />)
    const card = screen.getByRole('button', { name: '打开相册：春山册' })
    fireEvent.error(card.querySelector('img')!)
    expect(card.querySelectorAll('img')).toHaveLength(2)
    expect(card.querySelector('[data-cover-placeholder]')).toBeInTheDocument()
  })

  it('reports collection totals only after a snapshot is available', () => {
    fixtures.useAlbums.mockReturnValue(context({ hasData: false, isInitialLoading: true, albums: [], photos: [] }))
    const { rerender } = render(<AlbumPage />)
    expect(screen.queryByLabelText('共 0 册，0 帧')).not.toBeInTheDocument()
    fixtures.useAlbums.mockReturnValue(context())
    rerender(<AlbumPage />)
    expect(screen.getByLabelText('共 3 册，3 帧')).toBeInTheDocument()
  })

  it('returns keyboard focus to the opened card after visiting its details', async () => {
    render(<AlbumPage />)
    screen.getByRole('button', { name: '打开相册：全部照片' }).focus()
    fireEvent.click(screen.getByRole('button', { name: '打开相册：全部照片' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '全部照片' })).toHaveFocus())
    fireEvent.click(screen.getByRole('button', { name: '返回相册列表' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '打开相册：全部照片' })).toHaveFocus())
  })

  it('retains the current album when a cached snapshot refreshes', () => {
    const { rerender } = render(<AlbumPage />)
    fireEvent.click(screen.getByRole('button', { name: '打开相册：春山册' }))
    fixtures.useAlbums.mockReturnValue(context({ albums: [{ ...albums[0], title: '春山新册' }], error: '同步暂不可用' }))
    rerender(<AlbumPage />)
    expect(screen.getByRole('heading', { level: 2, name: '春山新册' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('同步暂不可用')
    expect(screen.getByRole('img', { name: '桥边晚照' })).toBeInTheDocument()
  })
})
