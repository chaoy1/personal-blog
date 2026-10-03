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

  it('opens the contact sheet while loading and lets keyboard users move among the work tabs', async () => {
    let resolvePhotos: (value: Response) => void = () => undefined
    let resolveAlbums: (value: Response) => void = () => undefined
    const pendingPhotos = new Promise<Response>((resolve) => { resolvePhotos = resolve })
    const pendingAlbums = new Promise<Response>((resolve) => { resolveAlbums = resolve })
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(pendingPhotos)
      .mockReturnValueOnce(pendingAlbums))

    render(<AdminPhotos />)

    expect(screen.getByRole('region', { name: '照片管理' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.getByRole('tab', { name: /照片库/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(screen.getByRole('tab', { name: /照片库/ }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /相册管理/ })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: /相册管理/ })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('tab', { name: /相册管理/ }), { key: 'Home' })
    expect(screen.getByRole('tabpanel', { name: /照片库/ })).toBeInTheDocument()
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
    expect(screen.getByTestId('photo-staging')).toHaveTextContent('桌面还空着')

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
    fireEvent.click(screen.getByRole('tab', { name: /上传暂存/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认上传' }))

    await waitFor(() => expect(screen.getByTestId('photo-upload-state')).toHaveAttribute('data-upload-state', 'partial'))
    expect(screen.getByRole('region', { name: '照片暂存区' })).toHaveTextContent('山路.jpg')
    expect(screen.getByText('部分照片未完成，已保留在暂存区，可修正后重试。')).toHaveAttribute('role', 'alert')
  })

  it('asks before changing the current album while the upload queue is non-empty', async () => {
    mocks.uploads.items = [{ id: 'upload-1', status: 'pending', file: new File(['x'], '河岸.jpg') }]
    mocks.confirm.mockResolvedValueOnce(false)
    render(<AdminPhotos />)

    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: /上传暂存/ }))
    const selector = screen.getByRole('combobox', { name: '当前相册' })
    fireEvent.change(selector, { target: { value: 'album-1' } })

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled())
    expect(selector).toHaveValue('')
  })

  it('opens album contents and disables manual movement when sorted by date', async () => {
    render(<AdminPhotos />)
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: /相册管理/ }))
    const card = screen.getByText('春日山行').closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: /翻看/ }))
    expect(screen.getByRole('combobox', { name: '相册筛选' })).toHaveValue('album-1')
    expect(screen.getAllByRole('gridcell')).toHaveLength(1)
    fireEvent.change(screen.getByRole('combobox', { name: '照片排序' }), { target: { value: 'newest' } })
    expect(screen.getByRole('button', { name: '向后移动' })).toBeDisabled()
  })

  it('keeps photo edits after a save failure and requires a deliberate discard', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(photos)).mockResolvedValueOnce(response(albums))
      .mockResolvedValueOnce(response({ error: '保存失败' }, 500))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminPhotos />)
    const grid = await waitFor(() => screen.getByRole('grid'))
    const opener = within(grid).getAllByRole('button', { name: '编辑小记' })[0]
    opener.focus()
    fireEvent.click(opener)
    const editor = screen.getByRole('dialog', { name: '为它留一句话' })
    const caption = within(editor).getByRole('textbox', { name: '照片说明' })
    expect(caption).toHaveFocus()
    fireEvent.change(caption, { target: { value: '改后的说明' } })
    fireEvent.click(within(editor).getByRole('button', { name: /保存小记/ }))
    await waitFor(() => expect(within(editor).getByRole('alert')).toHaveTextContent('保存失败'))
    expect(caption).toHaveValue('改后的说明')
    fireEvent.click(within(editor).getByRole('button', { name: '取消' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(within(editor).getByRole('button', { name: '放弃修改' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })


  it('saves the staged caption and selected album with the uploaded URL before removing the item', async () => {
    const file = new File(['x'], '晨光.jpg', { type: 'image/jpeg' })
    const pending = { id: 'upload-1', status: 'pending', progress: 0, file }
    mocks.uploads.items = [pending]
    mocks.uploads.start.mockResolvedValueOnce([{ ...pending, status: 'done', url: '/uploaded.jpg' }])
    const fetchMock = vi.fn().mockResolvedValueOnce(response(photos)).mockResolvedValueOnce(response(albums))
      .mockResolvedValueOnce(response({ id: 'photo-3' })).mockResolvedValueOnce(response(photos)).mockResolvedValueOnce(response(albums))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminPhotos />)
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: /上传暂存/ }))
    fireEvent.change(screen.getByRole('combobox', { name: '当前相册' }), { target: { value: 'album-2' } })
    await waitFor(() => expect(screen.getByRole('combobox', { name: '存入相册' })).toHaveValue('album-2'))
    fireEvent.change(screen.getByRole('textbox', { name: '照片说明' }), { target: { value: '河畔的一束光' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: '确认上传' }))
    await waitFor(() => expect(mocks.uploads.remove).toHaveBeenCalledWith('upload-1'))
    const post = fetchMock.mock.calls.find(([path, options]) => path === '/api/admin/photos' && options?.method === 'POST')
    expect(JSON.parse(post![1].body)).toEqual({ url: '/uploaded.jpg', caption: '河畔的一束光', album_id: 'album-2' })
  })

})
