'use client'

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type {
  PublicResourceKey,
  ResourceEntry,
  ServerSnapshot,
} from '@/lib/public-resource-types'

export type { PublicResourceKey, ResourceEntry, ResourceStatus, ServerSnapshot } from '@/lib/public-resource-types'

const DEFAULT_MAX_COMMENT_ENTRIES = 20

const TTL_MS: Record<'moments' | 'albums' | 'guestbook', number> = {
  moments: 60_000,
  albums: 300_000,
  guestbook: 30_000,
}

type StoreOptions = {
  now?: () => number
  maxCommentEntries?: number
}

export type PublicResourceStore = {
  read: <T>(key: PublicResourceKey) => ResourceEntry<T>
  subscribe: (key: PublicResourceKey, listener: () => void) => () => void
  seed: <T>(key: PublicResourceKey, snapshot: ServerSnapshot<T>) => void
  preload: <T>(key: PublicResourceKey, loader: () => Promise<T>) => Promise<T>
  revalidate: <T>(key: PublicResourceKey, loader: () => Promise<T>) => Promise<T>
  setData: <T>(key: PublicResourceKey, updater: T | ((current: T) => T)) => void
  invalidate: (key: PublicResourceKey) => void
}

type MutableEntry = ResourceEntry<unknown>

function isCommentKey(key: PublicResourceKey): key is `comments:${string}` {
  return key.startsWith('comments:')
}

function ttlFor(key: PublicResourceKey): number {
  if (isCommentKey(key)) return 30_000
  return TTL_MS[key]
}

function errorText(reason: unknown): string {
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message)
  }
  return String(reason || '请求失败')
}

export function createPublicResourceStore(options: StoreOptions = {}): PublicResourceStore {
  const now = options.now ?? (() => Date.now())
  const maxCommentEntries = options.maxCommentEntries ?? DEFAULT_MAX_COMMENT_ENTRIES
  const entries = new Map<PublicResourceKey, MutableEntry>()
  const listeners = new Map<PublicResourceKey, Set<() => void>>()

  function emptyEntry(): MutableEntry {
    return { data: null, status: 'idle', error: '', updatedAt: 0, promise: null }
  }

  function notify(key: PublicResourceKey) {
    listeners.get(key)?.forEach((listener) => listener())
  }

  function touch(key: PublicResourceKey) {
    if (!isCommentKey(key) || !entries.has(key)) return
    const entry = entries.get(key)!
    entries.delete(key)
    entries.set(key, entry)
  }

  function enforceCommentLimit() {
    const commentKeys = Array.from(entries.keys()).filter(isCommentKey)
    while (commentKeys.length > maxCommentEntries) {
      const candidate = commentKeys.shift()!
      const entry = entries.get(candidate)
      if (entry?.promise) {
        commentKeys.push(candidate)
        if (commentKeys.every((key) => entries.get(key)?.promise)) break
        continue
      }
      entries.delete(candidate)
      listeners.delete(candidate)
    }
  }

  function ensure(key: PublicResourceKey): MutableEntry {
    let entry = entries.get(key)
    if (!entry) {
      entry = emptyEntry()
      entries.set(key, entry)
      enforceCommentLimit()
    }
    touch(key)
    return entry
  }

  function replace(key: PublicResourceKey, entry: MutableEntry) {
    entries.set(key, entry)
    touch(key)
    enforceCommentLimit()
    notify(key)
  }

  function startRequest<T>(key: PublicResourceKey, loader: () => Promise<T>): Promise<T> {
    const current = ensure(key)
    if (current.promise) return current.promise as Promise<T>

    const loading: MutableEntry = {
      ...current,
      status: 'loading',
      error: '',
      promise: null,
    }
    replace(key, loading)

    let resolveLoader!: (data: T) => void
    let rejectLoader!: (reason?: unknown) => void
    const promise = new Promise<T>((resolve, reject) => {
      resolveLoader = resolve
      rejectLoader = reject
    })
    entries.set(key, { ...loading, promise })
    touch(key)
    enforceCommentLimit()
    notify(key)

    try {
      Promise.resolve(loader()).then(resolveLoader, rejectLoader)
    } catch (reason) {
      rejectLoader(reason)
    }

    promise.then(
      (data) => {
        const latest = entries.get(key)
        if (!latest || latest.promise !== promise) return
        replace(key, {
          data,
          status: 'ready',
          error: '',
          updatedAt: now(),
          promise: null,
        })
      },
      (reason) => {
        const latest = entries.get(key)
        if (!latest || latest.promise !== promise) return
        replace(key, {
          ...latest,
          status: 'error',
          error: errorText(reason),
          promise: null,
        })
      },
    )
    return promise
  }

  const store: PublicResourceStore = {
    read<T>(key: PublicResourceKey): ResourceEntry<T> {
      return ensure(key) as ResourceEntry<T>
    },

    subscribe(key: PublicResourceKey, listener: () => void): () => void {
      const bucket = listeners.get(key) ?? new Set<() => void>()
      bucket.add(listener)
      listeners.set(key, bucket)
      ensure(key)
      return () => {
        bucket.delete(listener)
        if (bucket.size === 0) listeners.delete(key)
      }
    },

    seed<T>(key: PublicResourceKey, snapshot: ServerSnapshot<T>): void {
      const current = ensure(key)
      const shouldSeed = current.data === null || snapshot.generatedAt > current.updatedAt
      if (!shouldSeed) return
      replace(key, {
        data: snapshot.data,
        status: snapshot.error ? 'error' : 'ready',
        error: snapshot.error ?? '',
        updatedAt: snapshot.generatedAt,
        promise: current.promise,
      })
    },

    preload<T>(key: PublicResourceKey, loader: () => Promise<T>): Promise<T> {
      const current = ensure(key) as ResourceEntry<T>
      if (current.promise) return current.promise
      const fresh = current.data !== null && now() - current.updatedAt < ttlFor(key)
      if (fresh) return Promise.resolve(current.data as T)
      return startRequest(key, loader)
    },

    revalidate<T>(key: PublicResourceKey, loader: () => Promise<T>): Promise<T> {
      const current = ensure(key) as ResourceEntry<T>
      if (current.promise) return current.promise
      return startRequest(key, loader)
    },

    setData<T>(key: PublicResourceKey, updater: T | ((current: T) => T)): void {
      const current = ensure(key) as ResourceEntry<T>
      const data = typeof updater === 'function'
        ? (updater as (value: T) => T)(current.data as T)
        : updater
      replace(key, { data, status: 'ready', error: '', updatedAt: now(), promise: current.promise })
    },

    invalidate(key: PublicResourceKey): void {
      const current = ensure(key)
      replace(key, {
        data: null,
        status: current.promise ? 'loading' : 'idle',
        error: '',
        updatedAt: 0,
        promise: current.promise,
      })
    },
  }

  return store
}

export const publicResourceCache = createPublicResourceStore()

const PublicResourceCacheContext = createContext<PublicResourceStore>(publicResourceCache)

export function PublicResourceCacheProvider({
  children,
  store = publicResourceCache,
}: {
  children: ReactNode
  store?: PublicResourceStore
}) {
  return (
    <PublicResourceCacheContext.Provider value={store}>
      {children}
    </PublicResourceCacheContext.Provider>
  )
}

export function usePublicResourceCache(): PublicResourceStore {
  return useContext(PublicResourceCacheContext)
}

export function useResourceEntry<T>(key: PublicResourceKey): ResourceEntry<T> {
  const store = usePublicResourceCache()
  return useSyncExternalStore(
    (listener) => store.subscribe(key, listener),
    () => store.read<T>(key),
    () => store.read<T>(key),
  )
}
