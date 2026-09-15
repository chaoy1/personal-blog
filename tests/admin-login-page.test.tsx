import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), refresh: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))

import AdminLoginPage from '@/app/admin/login/page'

describe('admin login page', () => {
  beforeEach(() => {
    mocks.router.replace.mockReset()
    mocks.router.refresh.mockReset()
    window.history.replaceState({}, '', '/admin/login')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('clearly separates the writing studio from visitor login', () => {
    render(<AdminLoginPage />)

    expect(screen.getByRole('region', { name: '后台登录' })).toHaveAttribute('data-page-state', 'ready')
    expect(screen.getByRole('heading', { name: '后台登录' })).toBeInTheDocument()
    expect(screen.getByText('写作后台')).toBeInTheDocument()
    expect(screen.getByLabelText('管理密码')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('form', { name: '后台登录表单' })).toHaveAttribute('data-form-state', 'idle')
    expect(screen.getByRole('link', { name: '返回博客首页' })).toHaveAttribute('href', '/')
  })

  it('announces a rejected request and exposes a retry without leaking backend details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket details')))
    render(<AdminLoginPage />)

    fireEvent.change(screen.getByLabelText('管理密码'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByRole('form', { name: '后台登录表单' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('后台登录失败，请稍后再试'))
    expect(screen.getByRole('alert')).not.toHaveTextContent('socket details')
    expect(screen.getByRole('button', { name: '重试登录' })).toBeEnabled()
  })

  it('uses only the safe admin next path after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    window.history.replaceState({}, '', '/admin/login?next=%2Fadmin%2Fphotos%3Falbum%3D1')
    render(<AdminLoginPage />)

    fireEvent.change(screen.getByLabelText('管理密码'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByRole('form', { name: '后台登录表单' }))

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/admin/photos?album=1'))
  })
})
