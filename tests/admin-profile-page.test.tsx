import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  notify: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))

vi.mock('@/components/admin/AdminFeedback', () => ({
  useAdminFeedback: () => ({ notify: mocks.notify }),
}))

import AdminProfile from '@/app/admin/profile/page'

const profile = {
  id: 'owner-1',
  nickname: '旅人',
  bio: '在山河之间写字。',
  avatar_url: '/avatar.jpg',
}

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('M06 admin profile workspace', () => {
  beforeEach(() => {
    mocks.router.replace.mockReset()
    mocks.notify.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(profile)))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps the form locked behind a labelled loading state', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => undefined)))
    render(<AdminProfile />)

    expect(screen.getByRole('region', { name: '博主资料管理' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.getByRole('status')).toHaveTextContent('正在加载博主资料')
    expect(screen.queryByRole('textbox', { name: '昵称' })).not.toBeInTheDocument()
  })

  it('exposes identity, long-form bio, dirty state and a safe about-page link', async () => {
    render(<AdminProfile />)

    await waitFor(() => expect(screen.getByRole('region', { name: '博主资料管理' })).toHaveAttribute('data-page-state', 'ready'))
    expect(screen.getByRole('textbox', { name: '昵称' })).toHaveValue('旅人')
    expect(screen.getByRole('textbox', { name: '个人简介' })).toHaveValue('在山河之间写字。')
    expect(screen.getByRole('link', { name: /查看关于页/ })).toHaveAttribute('target', '_blank')
    expect(screen.getByTestId('profile-save-state')).toHaveAttribute('data-save-state', 'saved')

    fireEvent.change(screen.getByRole('textbox', { name: '昵称' }), { target: { value: '新旅人' } })
    expect(screen.getByTestId('profile-save-state')).toHaveAttribute('data-save-state', 'dirty')
    expect(screen.getByRole('button', { name: '保存资料' })).toBeEnabled()
  })

  it('keeps edits after a failed save and exposes the error state', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(profile))
      .mockResolvedValueOnce(response({ error: '保存服务不可用' }, 500)))
    render(<AdminProfile />)

    await waitFor(() => expect(screen.getByRole('textbox', { name: '昵称' })).toBeInTheDocument())
    const nickname = screen.getByRole('textbox', { name: '昵称' })
    fireEvent.change(nickname, { target: { value: '未保存旅人' } })
    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))

    await waitFor(() => expect(screen.getByTestId('profile-save-state')).toHaveAttribute('data-save-state', 'error'))
    expect(nickname).toHaveValue('未保存旅人')
    expect(screen.getByRole('alert')).toHaveTextContent('保存服务不可用')
  })

  it('keeps the old avatar when upload fails and saves through Ctrl/Cmd+S', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(profile))
      .mockResolvedValueOnce(response({ error: '图片格式不支持' }, 400))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response(profile)))
    render(<AdminProfile />)

    await waitFor(() => expect(screen.getByRole('img', { name: '当前头像' })).toHaveAttribute('src', '/avatar.jpg'))
    const fileInput = screen.getByLabelText('上传头像')
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'avatar.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('图片格式不支持'))
    expect(screen.getByRole('img', { name: '当前头像' })).toHaveAttribute('src', '/avatar.jpg')

    fireEvent.change(screen.getByRole('textbox', { name: '个人简介' }), { target: { value: '快捷保存的介绍。' } })
    const event = new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    await waitFor(() => expect(screen.getByTestId('profile-save-state')).toHaveAttribute('data-save-state', 'saved'))
    expect(event.defaultPrevented).toBe(true)
  })
})
