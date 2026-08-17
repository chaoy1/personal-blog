import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addComment: vi.fn(),
  addGuestbook: vi.fn(),
  deleteGuestbook: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPassword: vi.fn(),
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
  supabaseBrowser: () => ({ auth: { signInWithPassword: mocks.signInWithPassword } }),
  storagePublicUrl: () => '',
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
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
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
    fireEvent.click(screen.getByRole('button', { name: /^回复$/ }))

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

  it('announces invalid login credentials', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'mistake' } })
    fireEvent.click(screen.getAllByRole('button', { name: '登录' }).find((button) => (button as HTMLButtonElement).type === 'submit')!)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('邮箱或密码错误'))
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
})
