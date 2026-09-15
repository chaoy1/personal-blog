import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
  uploads: {
    items: [] as Array<{ id: string; status: string; url?: string }>,
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

vi.mock('@/components/admin/UploadQueue', () => ({
  UploadQueue: ({ label }: { label?: string }) => (
    <section aria-label="上传队列">
      <label>{label ?? '选择文件'}<input type="file" /></label>
    </section>
  ),
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
    expect(screen.getByRole('status')).toHaveTextContent('正在加载闲语')

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
    expect(screen.getByRole('status')).toHaveTextContent('正在刷新闲语')

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
})
