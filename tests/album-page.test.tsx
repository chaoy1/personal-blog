import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  useAlbums: vi.fn(),
}))

vi.mock('@/lib/albums-context', () => ({ useAlbums: fixtures.useAlbums }))
vi.mock('@/lib/blog', () => ({ formatDate: (value: string) => value.slice(0, 10) }))
vi.mock('@/components/ArticleNav', () => ({ default: () => <nav aria-label="光影页导航" /> }))
vi.mock('@/components/PageIntro', () => ({
  default: ({ title }: { title: string }) => <header className="page-intro"><h1>{title}</h1></header>,
}))

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
})
