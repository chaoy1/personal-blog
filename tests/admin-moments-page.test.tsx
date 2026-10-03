import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UploadItem } from '@/lib/upload-queue'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
  uploads: {
    items: [] as UploadItem[],
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

import AdminMoments from '@/app/admin/moments/page'

const moments = [
  {
    id: 'moment-1',
    content: '沿着溪声走进一页春山。',
    images: ['/mountain.jpg'],
    created_at: '2026-09-01T08:00:00Z',
    profiles: { nickname: '旅人', avatar_url: '' },
  },
]

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('M04 admin moments workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.router.replace.mockReset()
    mocks.confirm.mockReset().mockResolvedValue(true)
    mocks.notify.mockReset()
    mocks.uploads.items = []
    mocks.uploads.busy = false
    mocks.uploads.start.mockReset().mockResolvedValue([])
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(moments)))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps the composer available while the list is loading and exposes a ready list', async () => {
    let resolveList: (value: Response) => void = () => undefined
    const pending = new Promise<Response>((resolve) => { resolveList = resolve })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    render(<AdminMoments />)

    expect(screen.getByRole('region', { name: '闲语管理' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.getByRole('textbox', { name: '闲语内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发布闲语' })).toBeInTheDocument()
    expect(screen.getByText('正在加载闲语…')).toBeInTheDocument()

    resolveList(response(moments))
    await waitFor(() => expect(screen.getByRole('list', { name: '闲语列表' })).toBeInTheDocument())
    expect(screen.getByRole('region', { name: '闲语管理' })).toHaveAttribute('data-page-state', 'ready')
    expect(screen.getByRole('listitem')).toHaveTextContent('沿着溪声走进一页春山。')
  })

  it('preserves typed content while refreshing the list', async () => {
    let resolveRefresh: (value: Response) => void = () => undefined
    const refresh = new Promise<Response>((resolve) => { resolveRefresh = resolve })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(moments))
      .mockReturnValueOnce(refresh)
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminMoments />)

    await waitFor(() => expect(screen.getByRole('list', { name: '闲语列表' })).toBeInTheDocument())
    const content = screen.getByRole('textbox', { name: '闲语内容' })
    fireEvent.change(content, { target: { value: '还没有发出的新闲语。' } })
    fireEvent.click(screen.getByRole('button', { name: '重新加载闲语' }))

    expect(screen.getByRole('region', { name: '闲语管理' })).toHaveAttribute('data-page-state', 'refreshing')
    expect(content).toHaveValue('还没有发出的新闲语。')
    expect(screen.getByText('正在刷新闲语…')).toBeInTheDocument()

    resolveRefresh(response([{ ...moments[0], content: '更新后的闲语。' }]))
    await waitFor(() => expect(screen.getByText('更新后的闲语。')).toBeInTheDocument())
    expect(content).toHaveValue('还没有发出的新闲语。')
  })

  it('shows save failure without clearing the composer content', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(moments))
      .mockResolvedValueOnce(response({ error: '服务暂不可用' }, 500)))
    render(<AdminMoments />)

    await waitFor(() => expect(screen.getByRole('list', { name: '闲语列表' })).toBeInTheDocument())
    const content = screen.getByRole('textbox', { name: '闲语内容' })
    fireEvent.change(content, { target: { value: '这条闲语暂时发布失败。' } })
    fireEvent.click(screen.getByRole('button', { name: '发布闲语' }))

    await waitFor(() => expect(screen.getByTestId('moment-save-state')).toHaveAttribute('data-save-state', 'error'))
    expect(content).toHaveValue('这条闲语暂时发布失败。')
    expect(screen.getByRole('alert')).toHaveTextContent('服务暂不可用')
  })

  it('asks before replacing unsaved composer content with another moment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(moments)))
    mocks.confirm.mockResolvedValueOnce(false)
    render(<AdminMoments />)

    await waitFor(() => expect(screen.getByRole('list', { name: '闲语列表' })).toBeInTheDocument())
    const content = screen.getByRole('textbox', { name: '闲语内容' })
    fireEvent.change(content, { target: { value: '尚未保存的内容。' } })
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled())
    expect(content).toHaveValue('尚未保存的内容。')
    expect(screen.queryByText('正在编辑现有闲语')).not.toBeInTheDocument()
  })

  it('renders structured Markdown in saved cards instead of showing source markers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...moments[0], content: '## 山窗\n\n**今日**\n\n- 一页山水\n- 一盏茶\n\n```js\nconst day = 1\n```' }])))
    render(<AdminMoments />)

    const list = await screen.findByRole('list', { name: '闲语列表' })
    const card = within(list).getAllByRole('listitem')[0]
    expect(within(card).getByRole('heading', { name: '山窗' })).toBeInTheDocument()
    expect(within(card).getByText('今日').tagName).toBe('STRONG')
    expect(within(card).getByRole('list')).toHaveTextContent('一页山水')
    expect(within(card).getByText('const day = 1').tagName).toBe('CODE')
  })

  it('previews Markdown while keeping the exact source for publishing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(moments))
      .mockResolvedValueOnce(response({ id: 'moment-new' }, 201))
      .mockResolvedValueOnce(response(moments))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    const source = '## 一刻\n\n**茶香**\n\n- 晚风'
    fireEvent.change(screen.getByRole('textbox', { name: '闲语内容' }), { target: { value: source } })
    fireEvent.click(screen.getByRole('button', { name: '预览正文' }))
    const preview = screen.getByRole('region', { name: '闲语正文预览' })
    expect(within(preview).getByRole('heading', { name: '一刻' })).toBeInTheDocument()
    expect(within(preview).getByText('茶香').tagName).toBe('STRONG')
    fireEvent.click(screen.getByRole('button', { name: '发布闲语' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/moments', expect.objectContaining({ method: 'POST', body: JSON.stringify({ content: source, images: [] }) })))
    await waitFor(() => expect(screen.getByRole('textbox', { name: '闲语内容' })).toHaveValue(''))
  })

  it('preserves plain prose line breaks in saved cards and composer previews like the public page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...moments[0], content: '一盏茶\n一页书' }])))
    const { container } = render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    expect(container.querySelectorAll('.ap-moment-card-content .md-body p')).toHaveLength(2)
    fireEvent.change(screen.getByRole('textbox', { name: '闲语内容' }), { target: { value: '一盏茶\n一页书' } })
    fireEvent.click(screen.getByRole('button', { name: '预览正文' }))
    expect(container.querySelectorAll('.ap-moment-preview .md-body p')).toHaveLength(2)
  })

  it('focuses the source editor when editing a saved moment from preview mode', async () => {
    render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    fireEvent.click(screen.getByRole('button', { name: '预览正文' }))
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '闲语内容' })).toHaveFocus())
    expect(screen.getByRole('textbox', { name: '闲语内容' })).toHaveValue('沿着溪声走进一页春山。')
  })

  it('paginates loaded moments without losing composer source', async () => {
    const loaded = Array.from({ length: 6 }, (_, index) => ({ ...moments[0], id: `moment-${index}`, content: `第${index + 1}则闲语` }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(loaded)))
    render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    fireEvent.change(screen.getByRole('textbox', { name: '闲语内容' }), { target: { value: '**未发布**' } })
    fireEvent.click(screen.getByRole('button', { name: '下一页闲语' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('第5则闲语')).toBeInTheDocument()
    expect(screen.queryByText('第1则闲语')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '闲语内容' })).toHaveValue('**未发布**')
    expect(screen.getByRole('button', { name: '下一页闲语' })).toBeDisabled()
  })

  it('keeps source and queued images after an upload fails without posting incomplete content', async () => {
    const item: UploadItem = { id: 'upload-1', file: new File(['image'], '山窗.png', { type: 'image/png' }), status: 'error', progress: 0, error: '网络暂不可用' }
    mocks.uploads.items = [item]
    mocks.uploads.start.mockResolvedValue([item])
    const fetchMock = vi.fn().mockResolvedValue(response(moments))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    fireEvent.change(screen.getByRole('textbox', { name: '闲语内容' }), { target: { value: '**雨后**' } })
    fireEvent.click(screen.getByRole('button', { name: '发布闲语' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('1 张配图上传失败'))
    expect(screen.getByRole('textbox', { name: '闲语内容' })).toHaveValue('**雨后**')
    expect(screen.getByRole('button', { name: '重试 山窗.png' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('publishes an image-only note after uploading the queued image', async () => {
    const item: UploadItem = { id: 'upload-1', file: new File(['image'], '山窗.png', { type: 'image/png' }), status: 'pending', progress: 0 }
    mocks.uploads.items = [item]
    mocks.uploads.start.mockResolvedValue([{ ...item, status: 'done', progress: 100, url: '/rain.jpg' }])
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(moments))
      .mockResolvedValueOnce(response({ id: 'moment-new' }, 201))
      .mockResolvedValueOnce(response(moments))
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminMoments />)
    await screen.findByRole('list', { name: '闲语列表' })
    fireEvent.click(screen.getByRole('button', { name: '发布闲语' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/moments', expect.objectContaining({ method: 'POST', body: JSON.stringify({ content: '', images: ['/rain.jpg'] }) })))
  })

  it('previews a selected image before uploading and releases its local URL on leaving', async () => {
    const revoke = vi.fn()
    const BrowserURL = URL
    vi.stubGlobal('URL', class extends BrowserURL {
      static createObjectURL() { return 'blob:queued-moment' }
      static revokeObjectURL = revoke
    })
    mocks.uploads.items = [{ id: 'upload-1', file: new File(['image'], '山窗.png', { type: 'image/png' }), status: 'pending', progress: 0 }]
    const workspace = render(<AdminMoments />)

    expect(await screen.findByRole('img', { name: '待发布配图：山窗.png' })).toHaveAttribute('src', 'blob:queued-moment')
    workspace.unmount()
    expect(revoke).toHaveBeenCalledWith('blob:queued-moment')
  })
})
