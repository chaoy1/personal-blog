import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const searchParamsState = vi.hoisted(() => ({ value: new URLSearchParams() }))
const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  notify: vi.fn(),
  draftSync: {
    status: 'idle' as 'idle' | 'local-saved' | 'server-saving' | 'server-saved' | 'error' | 'conflict',
    lastSavedAt: null as string | null,
    flush: vi.fn(),
    discardLocal: vi.fn(),
    restoreLocal: vi.fn(() => null),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => searchParamsState.value,
}))

vi.mock('@/components/admin/AdminFeedback', () => ({
  useAdminFeedback: () => ({ notify: mocks.notify }),
}))

vi.mock('@/components/admin/useArticleDraftSync', () => ({
  useArticleDraftSync: () => mocks.draftSync,
}))

vi.mock('@/components/MarkdownView', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown-preview">{content}</div>,
}))

import EditorPage from '@/app/admin/editor/page'

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('M03 writing workspace', () => {
  beforeEach(() => {
    searchParamsState.value = new URLSearchParams()
    mocks.router.push.mockReset()
    mocks.router.replace.mockReset()
    mocks.notify.mockReset()
    mocks.draftSync.status = 'idle'
    mocks.draftSync.lastSavedAt = null
    mocks.draftSync.flush.mockReset()
    mocks.draftSync.discardLocal.mockReset()
    mocks.draftSync.restoreLocal.mockReset().mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens a new document as a labelled ready writing workspace', () => {
    render(<EditorPage />)

    expect(screen.getByRole('region', { name: '文章编辑器' })).toHaveAttribute('data-page-state', 'ready')
    expect(screen.getByRole('heading', { name: '写新文章' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '文章标题' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Markdown 正文' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存草稿' })).toBeEnabled()
    expect(screen.getByTestId('editor-save-state')).toHaveAttribute('data-save-state', 'idle')
  })

  it('keeps an existing document locked behind the initial fetch', async () => {
    let resolvePost: (value: Response) => void = () => undefined
    const pending = new Promise<Response>((resolve) => { resolvePost = resolve })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))
    searchParamsState.value = new URLSearchParams('id=post-1')

    render(<EditorPage />)

    expect(screen.getByRole('region', { name: '文章编辑器' })).toHaveAttribute('data-page-state', 'loading')
    expect(screen.queryByRole('textbox', { name: '文章标题' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('正在加载文章')

    resolvePost(response({
      id: 'post-1',
      title: '山中一日',
      slug: 'mountain-day',
      excerpt: '山路与晚风。',
      content: '# 正文',
      published: false,
      updated_at: '2026-09-02T00:00:00.000Z',
    }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: '文章标题' })).toHaveValue('山中一日'))
    expect(screen.getByRole('region', { name: '文章编辑器' })).toHaveAttribute('data-page-state', 'ready')
  })

  it('separates draft saving from publishing and exposes the in-flight state', async () => {
    let resolveDraft: (value: { postId: string; updatedAt: string }) => void = () => undefined
    const draftSave = new Promise<{ postId: string; updatedAt: string }>((resolve) => { resolveDraft = resolve })
    let resolvePublish: (value: { postId: string; updatedAt: string }) => void = () => undefined
    const publish = new Promise<{ postId: string; updatedAt: string }>((resolve) => { resolvePublish = resolve })
    mocks.draftSync.flush
      .mockReturnValueOnce(draftSave)
      .mockReturnValueOnce(publish)
    render(<EditorPage />)

    fireEvent.change(screen.getByRole('textbox', { name: '文章标题' }), { target: { value: '新文章' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown 正文' }), { target: { value: '正文' } })
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }))

    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(screen.getByTestId('editor-save-state')).toHaveAttribute('data-save-state', 'saving')

    resolveDraft({ postId: 'post-new', updatedAt: '2026-09-15T09:00:00.000Z' })
    await waitFor(() => expect(screen.getByTestId('editor-save-state')).toHaveAttribute('data-save-state', 'saved'))
    expect(mocks.notify).toHaveBeenCalledWith({ kind: 'success', message: '草稿已保存' })

    fireEvent.click(screen.getByRole('button', { name: '发布文章' }))
    expect(screen.getByRole('button', { name: '发布中…' })).toBeDisabled()
    resolvePublish({ postId: 'post-new', updatedAt: '2026-09-15T09:01:00.000Z' })
    await waitFor(() => expect(screen.getByTestId('editor-publish-state')).toHaveAttribute('data-publish-state', 'published'))
    expect(mocks.notify).toHaveBeenCalledWith({ kind: 'success', message: '文章已发布' })
  })

  it('uses Ctrl/Cmd+S for the existing draft flush instead of the browser save dialog', async () => {
    mocks.draftSync.flush.mockResolvedValue({ postId: 'post-1', updatedAt: '2026-09-15T09:00:00.000Z' })
    render(<EditorPage />)
    fireEvent.change(screen.getByRole('textbox', { name: '文章标题' }), { target: { value: '快捷保存' } })

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })
    document.dispatchEvent(event)

    await waitFor(() => expect(mocks.draftSync.flush).toHaveBeenCalledWith(false))
    expect(event.defaultPrevented).toBe(true)
  })
})
