import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PublicResourceCacheProvider, createPublicResourceStore } from '@/lib/public-resource-cache'
import { usePublicResource } from '@/lib/use-public-resource'

afterEach(cleanup)

function setup() {
  const store = createPublicResourceStore({ now: () => 1000 })
  const wrapper = ({ children }: { children: ReactNode }) =>
    <PublicResourceCacheProvider store={store}>{children}</PublicResourceCacheProvider>
  return { store, wrapper }
}

describe('public resource lifecycle', () => {
  it('retains visible data after a failed refresh and permits retry', async () => {
    const { wrapper } = setup()
    const loader = vi.fn<() => Promise<string[]>>().mockRejectedValue(new Error('离线'))
    const initialSnapshot = { data: ['已有留言'], generatedAt: 900 }
    const { result } = renderHook(() => usePublicResource({
      key: 'guestbook', loader, emptySnapshot: [] as string[], initialSnapshot,
    }), { wrapper })
    expect(loader).not.toHaveBeenCalled()
    await act(() => result.current.refresh())
    expect(result.current).toMatchObject({ data: ['已有留言'], hasData: true, ready: true, error: '离线', isInitialLoading: false })
    loader.mockResolvedValue(['已有留言', '新留言'])
    await act(() => result.current.refresh())
    expect(result.current).toMatchObject({ data: ['已有留言', '新留言'], error: '', isRefreshing: false })
  })

  it('keeps a pending refresh distinct from initial loading', async () => {
    const { wrapper } = setup()
    let resolve!: (data: string[]) => void
    const loader = () => new Promise<string[]>(done => { resolve = done })
    const initialSnapshot = { data: ['相册'], generatedAt: 900 }
    const { result } = renderHook(() => usePublicResource({
      key: 'albums', loader, emptySnapshot: [] as string[], initialSnapshot,
    }), { wrapper })
    let pending!: Promise<void>
    act(() => { pending = result.current.refresh() })
    expect(result.current).toMatchObject({ data: ['相册'], isRefreshing: true, isInitialLoading: false })
    await act(async () => { resolve(['新相册']); await pending })
    expect(result.current.data).toEqual(['新相册'])
  })

  it('switches comment keys without mixing articles or reloading fresh cache entries', async () => {
    const { store, wrapper } = setup()
    store.setData('comments:first', ['第一篇'])
    store.setData('comments:second', ['第二篇'])
    const loader = vi.fn<() => Promise<string[]>>().mockResolvedValue([])
    const { result, rerender } = renderHook(({ slug }) => usePublicResource({
      key: `comments:${slug}`, loader, emptySnapshot: [] as string[],
    }), { wrapper, initialProps: { slug: 'first' } })
    expect(result.current.data).toEqual(['第一篇'])
    rerender({ slug: 'second' })
    expect(result.current.data).toEqual(['第二篇'])
    expect(loader).not.toHaveBeenCalled()
  })

  it('removes visibility listeners on unmount', async () => {
    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    try {
      const { wrapper } = setup()
      const loader = vi.fn<() => Promise<string[]>>().mockResolvedValue(['闲语'])
      const { result, unmount } = renderHook(() => usePublicResource({
        key: 'moments', loader, emptySnapshot: [] as string[],
      }), { wrapper })
      expect(loader).not.toHaveBeenCalled()
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      await waitFor(() => expect(result.current.ready).toBe(true))
      expect(loader).toHaveBeenCalledTimes(1)
      unmount()
      document.dispatchEvent(new Event('visibilitychange'))
      expect(loader).toHaveBeenCalledTimes(1)
    } finally {
      if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility)
      else Reflect.deleteProperty(document, 'visibilityState')
    }
  })
})
