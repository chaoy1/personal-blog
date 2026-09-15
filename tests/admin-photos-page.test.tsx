import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
  uploads: {
    items: [] as Array<{ id: string; status: string; url?: string; error?: string; file?: File }>,
    busy: false,
    enqueue: vi.fn(),
    remove: vi.fn(),
    retry: vi.fn(),
    start: vi.fn().mockResolvedValue([]),
    clearCompleted: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))

vi.mock('@/components/admin/AdminConfirmDialog', () => ({
  useAdminConfirm: () => ({ confirm: mocks.confirm, dialog: null }),
}))

vi.mock('@/components/admin/AdminFeedback', () => ({
  useAdminFeedback: () => ({ notify: mocks.notify }),
}))

vi.mock('@/components/admin/PhotoStagingGrid', () => ({
  PhotoStagingGrid: ({ controller }: { controller: { items: Array<unknown> } }) => (
    <section aria-label="照片暂存区">
      <p>待上传 {controller.items.length} 项</p>
    </section>
  ),
}))

vi.mock('@/lib/upload-queue', () => ({
  useUploadQueue: () => mocks.uploads,
}))

import AdminPhotos from '@/app/admin/photos/page'

const albums = [
  { id: 'album-1', title: '春山', description: '春日山行', created_at: '2026-09-01T00:00:00Z' },
  { id: 'album-2', title: '河岸', description: '河边手记', created_at: '2026-09-02T00:00:00Z' },
]

const photos = [
  { id: 'photo-1', url: '/mountain.jpg', caption: '山路晨光', album_id: 'album-1', sort_order: 0, created_at: '2026-09-03T00:00:00Z' },
  { id: 'photo-2', url: '/river.jpg', caption: '河岸晚风', album_id: 'album-2', sort_order: 1, created_at: '2026-09-04T00:00:00Z' },
]

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('M05 admin photo workspace', () => {
  beforeEach(() => {
    mocks.router.replace.mockReset()
    mocks.confirm.mockReset().mockResolvedValue(true)
    mocks.notify.mockReset()
    mocks.uploads.items = []
    mocks.uploads.busy = false
    mocks.uploads.start.mockReset().mockResolvedValue([])
    mocks.uploads.remove.mockReset()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(photos))
      .mockResolvedValueOnce(response(albums)))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps the three work sections visible while loading and exposes the ready photo grid', async () => {
    let resolvePhotos: (value: Response) => void = () => undefined
    let resolveAlbums: (value: Response) => void = () => undefined
    const pendingPhotos = new Promise<Response>((resolve) => { resolvePhotos = resolve })
    const pendingAlbums = new Promise<Response>((resolve) => { resolveAlbums = resolve })
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(pendingPhotos)
      .mockReturnValueOnce(pendingAlbums))

    render(<AdminPhotos />)

    expect(screen.getByRole('region', { name: '照片管理' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.getByRole('region', { name: '相册管理' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '上传工作区' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '照片管理区' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '相册标题' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('正在加载照片')

    resolvePhotos(response(photos))
    resolveAlbums(response(albums))
    await waitFor(() => expect(screen.getByRole('grid', { name: '照片列表' })).toBeInTheDocument())
    expect(screen.getByRole('region', { name: '照片管理' })).toHaveAttribute('data-page-state', 'ready')
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'false')
  })

  it('filters and sorts existing photos locally without mixing them with the upload queue', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(photos))
      .mockResolvedValueOnce(response(albums))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminPhotos />)

    const grid = await waitFor(() => screen.getByRole('grid', { name: '照片列表' }))
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(2)
    expect(screen.getByRole('region', { name: '照片暂存区' })).toHaveTextContent('待上传 0 项')

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索照片' }), { target: { value: '山路' } })
    expect(within(screen.getByRole('grid', { name: '照片列表' })).getAllByRole('gridcell')).toHaveLength(1)
    expect(screen.getByRole('gridcell')).toHaveTextContent('山路晨光')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    fireEvent.change(screen.getByRole('combobox', { name: '照片排序' }), { target: { value: 'oldest' } })
    expect(screen.getByRole('gridcell')).toHaveTextContent('山路晨光')
  })

  it('keeps failed upload items after a partial upload result', async () => {
    const failedItem = { id: 'upload-1', status: 'pending', file: new File(['x'], '山路.jpg') }
    mocks.uploads.items = [failedItem]
    mocks.uploads.start.mockResolvedValueOnce([{ ...failedItem, status: 'error', error: '网络错误' }])
    render(<AdminPhotos />)

    await waitFor(() => expect(screen.getByRole('grid', { name: '照片列表' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '确认上传' }))

    await waitFor(() => expect(screen.getByTestId('photo-upload-state')).toHaveAttribute('data-upload-state', 'partial'))
    expect(screen.getByRole('region', { name: '照片暂存区' })).toHaveTextContent('待上传 1 项')
    expect(screen.getByRole('alert')).toHaveTextContent('部分照片未完成')
  })

  it('asks before changing the current album while the upload queue is non-empty', async () => {
    mocks.uploads.items = [{ id: 'upload-1', status: 'pending', file: new File(['x'], '河岸.jpg') }]
    mocks.confirm.mockResolvedValueOnce(false)
    render(<AdminPhotos />)

    await waitFor(() => expect(screen.getByRole('combobox', { name: '当前相册' })).toBeInTheDocument())
    const selector = screen.getByRole('combobox', { name: '当前相册' })
    fireEvent.change(selector, { target: { value: 'album-1' } })

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled())
    expect(selector).toHaveValue('')
  })
})
