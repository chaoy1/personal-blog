'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePublicResourceCache, useResourceEntry } from '@/lib/public-resource-cache'
import type { PublicResourceKey, ServerSnapshot } from '@/lib/public-resource-types'

type Options<T> = {
  key: PublicResourceKey
  loader: () => Promise<T>
  emptySnapshot: T
  initialSnapshot?: ServerSnapshot<T> | null
  initialError?: string
}

/** Shared resource lifecycle; writes and optimistic updates stay in each provider. */
export function usePublicResource<T>({
  key,
  loader,
  emptySnapshot,
  initialSnapshot,
  initialError = '',
}: Options<T>) {
  const cache = usePublicResourceCache()
  const seededRef = useRef<ServerSnapshot<T> | null>(null)

  if (initialSnapshot && seededRef.current !== initialSnapshot) {
    cache.seed(key, initialSnapshot)
    seededRef.current = initialSnapshot
  }

  const entry = useResourceEntry<T>(key)

  const refresh = useCallback(async () => {
    await cache.revalidate(key, loader).catch(() => undefined)
  }, [cache, key, loader])

  useEffect(() => {
    const preloadWhenVisible = () => {
      if (document.visibilityState === 'hidden') return
      void cache.preload(key, loader).catch(() => undefined)
    }
    preloadWhenVisible()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') preloadWhenVisible()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [cache, key, loader])

  const data = entry.data ?? emptySnapshot
  const hasData = entry.data !== null
  const isInitialLoading = !hasData && (entry.status === 'idle' || entry.status === 'loading')
  const isRefreshing = hasData && entry.status === 'loading'
  const error = entry.error || (!hasData ? initialError : '')
  const ready = hasData || (!isInitialLoading && !error)

  return { cache, data, refresh, ready, hasData, isInitialLoading, isRefreshing, error }
}
