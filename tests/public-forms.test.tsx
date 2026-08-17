import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addComment: vi.fn(),
  addGuestbook: vi.fn(),
  deleteGuestbook: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  uploadAvatar: vi.fn(),
  router: { back: vi.fn(), push: vi.fn(), refresh: vi.fn(), replace: vi.fn() },
}))

const store = {
  ready: true,
  user: { id: 'user-1', email: 'traveler@example.com' },
  profile: { nickname: '旅人', avatar_url: '', role: 'reader', bio: '' },
  comments: [] as never[],
  guestbook: [] as never[],
  error: '',
  addComment: mocks.addComment,
  addGuestbook: mocks.addGuestbook,
  deleteGuestbook: mocks.deleteGuestbook,
  updateProfile: mocks.updateProfile,
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))
vi.mock('@/lib/app-store', () => ({ useAppStore: () => store }))
vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, updateUser: mocks.updateUser },
    storage: { from: () => ({ upload: mocks.uploadAvatar }) },
  }),
  storagePublicUrl: (_bucket: string, path: string) => `https://assets.example/${path}`,
}))
vi.mock('@/components/ScrollFX', () => ({ default: () => null }))
vi.mock('@/components/PageIntro', () => ({ default: () => null }))

import AccountPage from '@/app/account/page'
import GuestbookPage from '@/app/guestbook/page'
import LoginPage from '@/app/login/page'
import CommentThread, { type ThreadItem } from '@/components/CommentThread'
import Comments from '@/components/Comments'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function openCommentComposer() {
  fireEvent.click(screen.getByRole('button', { name: '✎ 写评论' }))
  return screen.getByLabelText('评论内容')
}

function openGuestbookComposer() {
  fireEvent.click(screen.getByRole('button', { name: '写留言' }))
  return screen.getByLabelText('留言内容')
}

describe('public form feedback', () => {
  beforeEach(() => {
    mocks.addComment.mockReset()
    mocks.addGuestbook.mockReset()
    mocks.deleteGuestbook.mockReset()
    mocks.updateProfile.mockReset()
    mocks.signInWithPassword.mockReset()
    mocks.updateUser.mockReset()
    mocks.uploadAvatar.mockReset()
    Object.values(mocks.router).forEach((method) => method.mockReset())
    Object.assign(store, {
      ready: true,
      user: { id: 'user-1', email: 'traveler@example.com' },
      profile: { nickname: '旅人', avatar_url: '', role: 'reader', bio: '' },
      comments: [],
      guestbook: [],
      error: '',
    })
  })

  afterEach(cleanup)

  it('retains a failed comment, announces the error, and retries safely', async () => {
    const request = deferred<string | null>()
    mocks.addComment.mockImplementation(() => request.promise)
    render(<Comments slug="qianli-jiangshan" />)

    const textarea = openCommentComposer()
    fireEvent.change(textarea, { target: { value: '山水依旧。' } })
    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))

    expect(screen.getByRole('button', { name: '发布中…' })).toBeDisabled()
    expect(textarea).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '收起' })).not.toBeDisabled()

    request.resolve('发布失败，请重试')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('发布失败，请重试'))
    expect(textarea).toHaveValue('山水依旧。')

    mocks.addComment.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: '重试发布评论' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('评论已发布'))
    expect(mocks.addComment).toHaveBeenCalledTimes(2)
  })

  it('ignores an old comment completion after the composer is reopened for a new draft', async () => {
    const request = deferred<string | null>()
    mocks.addComment.mockImplementationOnce(() => request.promise)
    render(<Comments slug="qianli-jiangshan" />)

    fireEvent.change(openCommentComposer(), { target: { value: '旧评论。' } })
    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))
    fireEvent.click(screen.getByRole('button', { name: '收起' }))
    const newDraft = openCommentComposer()
    fireEvent.change(newDraft, { target: { value: '新的评论草稿。' } })

    request.resolve(null)

    await waitFor(() => expect(newDraft).toHaveValue('新的评论草稿。'))
    expect(screen.getByLabelText('评论内容')).toBeInTheDocument()
  })

  it('retains a failed guestbook entry and gives it an error alert', async () => {
    mocks.addGuestbook.mockResolvedValue('暂时无法保存')
    render(<GuestbookPage />)

    const textarea = openGuestbookComposer()
    fireEvent.change(textarea, { target: { value: '此处留一言。' } })
    fireEvent.click(screen.getByRole('button', { name: '留下这句话' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('暂时无法保存'))
    expect(textarea).toHaveValue('此处留一言。')
    expect(screen.getByRole('button', { name: '重试留言' })).toBeEnabled()
  })

  it('ignores an old guestbook completion after the composer is reopened for a new draft', async () => {
    const request = deferred<string | null>()
    mocks.addGuestbook.mockImplementationOnce(() => request.promise)
    render(<GuestbookPage />)

    fireEvent.change(openGuestbookComposer(), { target: { value: '旧留言。' } })
    fireEvent.click(screen.getByRole('button', { name: '留下这句话' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    const newDraft = openGuestbookComposer()
    fireEvent.change(newDraft, { target: { value: '新的留言草稿。' } })

    request.resolve(null)

    await waitFor(() => expect(newDraft).toHaveValue('新的留言草稿。'))
    expect(screen.getByLabelText('留言内容')).toBeInTheDocument()
  })

  it('retains a failed reply and exposes a labelled retry action', async () => {
    const item: ThreadItem = {
      id: 'comment-1',
      user_id: 'user-2',
      content: '先来留个脚印。',
      parent_id: null,
      created_at: '2026-08-18T00:00:00.000Z',
      profiles: { nickname: '访客', avatar_url: '' },
    }
    mocks.addComment.mockResolvedValue('回复失败')
    render(<CommentThread items={[item]} userId="user-1" onReply={mocks.addComment} />)

    fireEvent.click(screen.getByRole('button', { name: '回复' }))
    const textarea = screen.getByLabelText('回复内容')
    fireEvent.change(textarea, { target: { value: '欢迎。' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^回复$/ }).find((button) => button.classList.contains('btn-sm'))!)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('回复失败'))
    expect(textarea).toHaveValue('欢迎。')
    expect(screen.getByRole('button', { name: '重试回复' })).toBeEnabled()
  })

  it('returns a dismissed reply form to its idle state before another reply', async () => {
    const item: ThreadItem = {
      id: 'comment-1',
      user_id: 'user-2',
      content: '先来留个脚印。',
      parent_id: null,
      created_at: '2026-08-18T00:00:00.000Z',
      profiles: { nickname: '访客', avatar_url: '' },
    }
    mocks.addComment.mockResolvedValue('回复失败')
    render(<CommentThread items={[item]} userId="user-1" onReply={mocks.addComment} />)

    fireEvent.click(screen.getByRole('button', { name: '回复' }))
    fireEvent.change(screen.getByLabelText('回复内容'), { target: { value: '欢迎。' } })
    fireEvent.click(screen.getByRole('button', { name: /^回复$/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('回复失败'))

    fireEvent.click(screen.getByRole('button', { name: '取消回复' }))
    fireEvent.click(screen.getByRole('button', { name: '回复' }))

    expect(screen.queryByRole('button', { name: '重试回复' })).not.toBeInTheDocument()
  })

  it('ignores a completed reply after the user retargets a new reply draft', async () => {
    const items: ThreadItem[] = [
      {
        id: 'comment-1', user_id: 'user-2', content: '第一条。', parent_id: null,
        created_at: '2026-08-18T00:00:00.000Z', profiles: { nickname: '甲', avatar_url: '' },
      },
      {
        id: 'comment-2', user_id: 'user-3', content: '第二条。', parent_id: null,
        created_at: '2026-08-18T00:00:01.000Z', profiles: { nickname: '乙', avatar_url: '' },
      },
    ]
    const request = deferred<string | null>()
    mocks.addComment.mockImplementationOnce(() => request.promise)
    render(<CommentThread items={items} userId="user-1" onReply={mocks.addComment} />)

    fireEvent.click(screen.getAllByRole('button', { name: '回复' })[0])
    fireEvent.change(screen.getByLabelText('回复内容'), { target: { value: '旧回复。' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^回复$/ }).find((button) => button.classList.contains('btn-sm'))!)
    fireEvent.click(screen.getByRole('button', { name: '取消回复' }))
    fireEvent.click(screen.getAllByRole('button', { name: '回复' })[1])
    const newDraft = screen.getByLabelText('回复内容')
    fireEvent.change(newDraft, { target: { value: '新的回复草稿。' } })

    request.resolve(null)

    await waitFor(() => expect(newDraft).toHaveValue('新的回复草稿。'))
    expect(screen.getByLabelText('回复内容')).toBeInTheDocument()
  })

  it('announces invalid login credentials', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'mistake' } })
    fireEvent.click(screen.getAllByRole('button', { name: '登录' }).find((button) => (button as HTMLButtonElement).type === 'submit')!)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('邮箱或密码错误'))
    fireEvent.click(screen.getByRole('button', { name: '重试登录' }))
    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(2))
  })

  it('announces a rejected login request and leaves an explicit retry action', async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error('network unavailable'))
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'mistake' } })
    fireEvent.click(screen.getAllByRole('button', { name: '登录' }).find((button) => (button as HTMLButtonElement).type === 'submit')!)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('登录失败，请稍后再试'))
    expect(screen.getByRole('button', { name: '重试登录' })).toBeEnabled()
  })

  it('returns login form state to idle when switching modes after an error', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'mistake' } })
    fireEvent.click(screen.getAllByRole('button', { name: '登录' }).find((button) => (button as HTMLButtonElement).type === 'submit')!)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    expect(document.querySelector('form')).toHaveAttribute('data-form-state', 'idle')
  })

  it('ignores a completed login after the user switches to register mode', async () => {
    const request = deferred<{ error: null }>()
    mocks.signInWithPassword.mockImplementationOnce(() => request.promise)
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'mistake' } })
    fireEvent.click(screen.getAllByRole('button', { name: '登录' }).find((button) => (button as HTMLButtonElement).type === 'submit')!)
    fireEvent.click(screen.getByRole('button', { name: '注册' }))
    request.resolve({ error: null })

    await waitFor(() => expect(document.querySelector('form')).toHaveAttribute('data-form-state', 'idle'))
    expect(mocks.router.push).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: '注册' })).toBeInTheDocument()
  })

  it('announces profile save completion without moving focus', async () => {
    mocks.updateProfile.mockResolvedValue(null)
    render(<AccountPage />)

    const saveButton = screen.getByRole('button', { name: '保存资料' })
    saveButton.focus()
    fireEvent.click(saveButton)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('资料已保存'))
    expect(saveButton).toHaveFocus()
  })

  it('keeps the profile form ready for an explicit retry after a save failure', async () => {
    mocks.updateProfile.mockResolvedValue('保存失败，请重试')
    render(<AccountPage />)

    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('保存失败，请重试'))
    expect(screen.getByRole('button', { name: '重试保存资料' })).toBeEnabled()
  })

  it('retries a failed avatar upload with the selected file before saving the new URL', async () => {
    const file = new File(['avatar'], 'portrait.png', { type: 'image/png' })
    mocks.uploadAvatar
      .mockResolvedValueOnce({ error: { message: '网络中断' } })
      .mockResolvedValueOnce({ error: null })
    mocks.updateProfile.mockResolvedValue(null)
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('更换头像'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('头像上传失败：网络中断'))
    fireEvent.click(screen.getByRole('button', { name: '重试上传头像' }))
    await waitFor(() => expect(mocks.uploadAvatar).toHaveBeenCalledTimes(2))
    expect(mocks.uploadAvatar).toHaveBeenLastCalledWith(expect.any(String), file, expect.any(Object))

    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: expect.stringContaining('/user-1/') })))
  })

  it('keeps the newest selected avatar when an older upload completes later', async () => {
    const first = deferred<{ error: null }>()
    const second = deferred<{ error: null }>()
    mocks.uploadAvatar
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('更换头像'), { target: { files: [new File(['a'], 'first.png', { type: 'image/png' })] } })
    fireEvent.change(screen.getByLabelText('更换头像'), { target: { files: [new File(['b'], 'second.jpg', { type: 'image/jpeg' })] } })
    second.resolve({ error: null })
    await waitFor(() => expect(screen.getByRole('img', { name: '头像' })).toHaveAttribute('src', expect.stringContaining('.jpg')))

    first.resolve({ error: null })
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(screen.getByRole('img', { name: '头像' })).toHaveAttribute('src', expect.stringContaining('.jpg'))
    expect(screen.getByRole('status')).toHaveTextContent('头像已上传')
  })

  it('retries the newest failed avatar instead of a superseded upload', async () => {
    const first = deferred<{ error: { message: string } | null }>()
    const second = deferred<{ error: { message: string } | null }>()
    const firstFile = new File(['a'], 'first.png', { type: 'image/png' })
    const secondFile = new File(['b'], 'second.jpg', { type: 'image/jpeg' })
    mocks.uploadAvatar
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValueOnce({ error: null })
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('更换头像'), { target: { files: [firstFile] } })
    fireEvent.change(screen.getByLabelText('更换头像'), { target: { files: [secondFile] } })
    second.resolve({ error: { message: 'B 上传失败' } })
    await waitFor(() => expect(screen.getByRole('button', { name: '重试上传头像' })).toBeEnabled())
    first.resolve({ error: null })
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fireEvent.click(screen.getByRole('button', { name: '重试上传头像' }))

    await waitFor(() => expect(mocks.uploadAvatar).toHaveBeenCalledTimes(3))
    expect(mocks.uploadAvatar).toHaveBeenLastCalledWith(expect.any(String), secondFile, expect.any(Object))
  })

  it('offers an explicit retry after a password verification failure', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'wrong-pass' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'new-pass' } })
    fireEvent.change(screen.getByLabelText('再次输入新密码'), { target: { value: 'new-pass' } })
    fireEvent.click(screen.getByRole('button', { name: '确认更新密码' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('旧密码不正确'))
    fireEvent.click(screen.getByRole('button', { name: '重试更新密码' }))
    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(2))
  })

  it('announces a rejected password request and restores a retryable state', async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error('network unavailable'))
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'old-pass' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'new-pass' } })
    fireEvent.change(screen.getByLabelText('再次输入新密码'), { target: { value: 'new-pass' } })
    fireEvent.click(screen.getByRole('button', { name: '确认更新密码' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('修改失败，请稍后再试'))
    expect(screen.getByRole('button', { name: '重试更新密码' })).toBeEnabled()
  })

  it('does not update a password after its verification request is invalidated by an edit', async () => {
    const verify = deferred<{ error: null }>()
    mocks.signInWithPassword.mockImplementationOnce(() => verify.promise)
    render(<AccountPage />)

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'old-pass' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'new-pass' } })
    fireEvent.change(screen.getByLabelText('再次输入新密码'), { target: { value: 'new-pass' } })
    fireEvent.click(screen.getByRole('button', { name: '确认更新密码' }))
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'newer-pass' } })
    verify.resolve({ error: null })

    await waitFor(() => expect(screen.getByLabelText('新密码')).toHaveValue('newer-pass'))
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(document.querySelector('.account-pw-grid')).toHaveAttribute('data-form-state', 'idle')
  })
})
