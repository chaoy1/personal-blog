import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useArticleDraftSync } from '@/components/admin/useArticleDraftSync'
import { readDraft, type ArticleDraftSnapshot } from '@/lib/article-draft'

function makeSnapshot(overrides: Partial<ArticleDraftSnapshot> = {}): ArticleDraftSnapshot {
  return {
    version: 2,
    clientId: 'writer',
    postId: null,
    title: '山中一日',
    slug: 'mountain-day',
    excerpt: '',
    content: '第一稿',
    published: false,
    updatedAt: '2026-08-24T01:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useArticleDraftSync', () => {
  it('backs up immediately, waits 1500ms, then POSTs once and PUTs later changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'post-1', updated_at: '2026-08-24T01:01:00.000Z' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'post-1', updated_at: '2026-08-24T01:02:00.000Z' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onPostId = vi.fn()
    const onUnauthorized = vi.fn()
    const initial = makeSnapshot()
    const { rerender } = renderHook(
      ({ snapshot }) => useArticleDraftSync({ snapshot, onPostId, onUnauthorized }),
      { initialProps: { snapshot: initial } },
    )

    expect(readDraft(null, 'writer')).toEqual(initial)
    await act(async () => { await vi.advanceTimersByTimeAsync(1499) })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/posts')
    expect(onPostId).toHaveBeenCalledWith('post-1')

    rerender({ snapshot: makeSnapshot({ postId: 'post-1', content: '第二稿', updatedAt: '2026-08-24T01:03:00.000Z' }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/posts/post-1')
  })

  it('flushes immediately and reports the save timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'post-2', updated_at: '2026-08-24T02:00:00.000Z' }), { status: 201 }),
    ))
    const { result } = renderHook(() => useArticleDraftSync({
      snapshot: makeSnapshot(),
      onPostId: vi.fn(),
      onUnauthorized: vi.fn(),
    }))

    let saved: { postId: string; updatedAt: string } | undefined
    await act(async () => {
      saved = await result.current.flush(false)
    })

    expect(saved).toEqual({ postId: 'post-2', updatedAt: '2026-08-24T02:00:00.000Z' })
    expect(result.current.status).toBe('server-saved')
    expect(result.current.lastSavedAt).toBe('2026-08-24T02:00:00.000Z')
  })

  it('keeps the local backup and invokes the unauthorized callback on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: '登录已过期' }), { status: 401 }),
    ))
    const onUnauthorized = vi.fn()
    const current = makeSnapshot()
    const { result } = renderHook(() => useArticleDraftSync({
      snapshot: current,
      onPostId: vi.fn(),
      onUnauthorized,
    }))

    await act(async () => {
      await expect(result.current.flush()).rejects.toThrow('登录已过期')
    })

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(readDraft(null, 'writer')).toEqual(current)
    expect(result.current.status).toBe('error')
  })

  it('serializes an in-flight save and sends the newest queued snapshot afterward', async () => {
    let resolveFirst!: (response: Response) => void
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve
    })
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'post-3',
        updated_at: '2026-08-24T03:02:00.000Z',
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const initial = makeSnapshot({ postId: 'post-3', content: '第一稿' })
    const { rerender } = renderHook(
      ({ snapshot }) => useArticleDraftSync({
        snapshot,
        onPostId: vi.fn(),
        onUnauthorized: vi.fn(),
      }),
      { initialProps: { snapshot: initial } },
    )

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    rerender({ snapshot: makeSnapshot({
      postId: 'post-3',
      content: '保存期间写下的最新稿',
      updatedAt: '2026-08-24T03:01:00.000Z',
    }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst(new Response(JSON.stringify({
        id: 'post-3',
        updated_at: '2026-08-24T03:00:00.000Z',
      }), { status: 200 }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(body.content).toBe('保存期间写下的最新稿')
  })

  it('maps a 409 response to conflict while preserving the local draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: '文章已在其他位置更新' }), { status: 409 }),
    ))
    const current = makeSnapshot({ postId: 'post-conflict' })
    const { result } = renderHook(() => useArticleDraftSync({
      snapshot: current,
      onPostId: vi.fn(),
      onUnauthorized: vi.fn(),
    }))

    await act(async () => {
      await expect(result.current.flush()).rejects.toThrow('文章已在其他位置更新')
    })

    expect(result.current.status).toBe('conflict')
    expect(readDraft('post-conflict', 'writer')).toEqual(current)
  })
})
