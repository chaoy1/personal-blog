import React, { useEffect, useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PublicResourceCacheProvider,
  createPublicResourceStore,
  useResourceEntry,
} from '@/lib/public-resource-cache'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function CacheProbe({ resourceKey }: { resourceKey: 'moments' | 'guestbook' }) {
  const entry = useResourceEntry<string[]>(resourceKey)
  return <output data-testid={resourceKey}>{JSON.stringify(entry)}</output>
}

describe('public resource session cache', () => {
  afterEach(cleanup)

  it('deduplicates concurrent preload calls and keeps the same promise', async () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    let calls = 0
    const request = deferred<string[]>()
    const loader = () => {
      calls += 1
      return request.promise
    }

    const first = store.preload('moments', loader)
    const second = store.preload('moments', loader)

    expect(first).toBe(second)
    expect(calls).toBe(1)
    request.resolve(['first'])
    await expect(first).resolves.toEqual(['first'])
    expect(store.read<string[]>('moments').data).toEqual(['first'])
  })

  it('seeds only a newer server snapshot and preserves stale data after refresh failure', async () => {
    let now = 10_000
    const store = createPublicResourceStore({ now: () => now })
    store.seed('guestbook', { data: ['new'], generatedAt: 9000 })
    store.seed('guestbook', { data: ['old'], generatedAt: 8000 })
    expect(store.read<string[]>('guestbook').data).toEqual(['new'])

    now += 31_000
    await expect(store.revalidate('guestbook', async () => { throw new Error('offline') })).rejects.toThrow('offline')
    expect(store.read<string[]>('guestbook')).toMatchObject({
      data: ['new'],
      status: 'error',
      error: 'offline',
    })
  })

  it('keeps comments isolated by slug and evicts the least recently used slug after twenty entries', () => {
    const store = createPublicResourceStore({ now: () => 1000, maxCommentEntries: 20 })
    for (let i = 0; i < 20; i += 1) store.setData(`comments:post-${i}`, [])

    store.read('comments:post-0')
    store.setData('comments:post-20', [])

    expect(store.read('comments:post-0').data).toEqual([])
    expect(store.read('comments:post-1').data).toBeNull()
    expect(store.read('comments:post-20').data).toEqual([])
  })

  it('keeps the singleton cache across provider unmount and remount', () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    store.setData('moments', ['persisted'])

    const first = render(
      <PublicResourceCacheProvider store={store}>
        <CacheProbe resourceKey="moments" />
      </PublicResourceCacheProvider>,
    )
    expect(screen.getByTestId('moments')).toHaveTextContent('persisted')
    first.unmount()

    render(
      <PublicResourceCacheProvider store={store}>
        <CacheProbe resourceKey="moments" />
      </PublicResourceCacheProvider>,
    )
    expect(screen.getByTestId('moments')).toHaveTextContent('persisted')
  })

  it('notifies a subscribed consumer when setData changes the snapshot', () => {
    const store = createPublicResourceStore({ now: () => 1000 })

    function Writer() {
      const [written, setWritten] = useState(false)
      useEffect(() => {
        if (!written) {
          store.setData('moments', ['updated'])
          setWritten(true)
        }
      }, [written])
      return null
    }

    render(
      <PublicResourceCacheProvider store={store}>
        <CacheProbe resourceKey="moments" />
        <Writer />
      </PublicResourceCacheProvider>,
    )
    expect(screen.getByTestId('moments')).toHaveTextContent('updated')
  })
})
