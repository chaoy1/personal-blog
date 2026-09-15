'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { loadGuestbook } from '@/lib/public-resource-loaders.browser'
import { usePublicResourceCache, useResourceEntry } from '@/lib/public-resource-cache'
import type { GuestbookSnapshot, ServerSnapshot } from '@/lib/public-resource-types'
import type { GuestbookItem } from '@/lib/store-types'

export type GuestbookContextValue = {
  ready: boolean
  hasData: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  error: string
  guestbook: GuestbookItem[]
  refreshGuestbook: () => Promise<void>
  addGuestbook: (content: string, parentId?: string | null) => Promise<string | null>
  deleteGuestbook: (id: string) => Promise<string | null>
}

export const GuestbookContext = createContext<GuestbookContextValue | null>(null)

const EMPTY_SNAPSHOT: GuestbookSnapshot = { guestbook: [] }
const GUESTBOOK_KEY = 'guestbook' as const

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function GuestbookProvider({
  children,
  initialSnapshot,
  initialError = '',
}: {
  children: ReactNode
  initialSnapshot?: ServerSnapshot<GuestbookSnapshot> | null
  initialError?: string
}) {
  const { user } = useAuth()
  const cache = usePublicResourceCache()
  const seededRef = useRef<ServerSnapshot<GuestbookSnapshot> | null>(null)

  if (initialSnapshot && seededRef.current !== initialSnapshot) {
    cache.seed(GUESTBOOK_KEY, initialSnapshot)
    seededRef.current = initialSnapshot
  }

  const entry = useResourceEntry<GuestbookSnapshot>(GUESTBOOK_KEY)

  const refreshGuestbook = useCallback(async () => {
    await cache.revalidate(GUESTBOOK_KEY, loadGuestbook).catch(() => undefined)
  }, [cache])

  useEffect(() => {
    const preloadWhenVisible = () => {
      if (document.visibilityState === 'hidden') return
      void cache.preload(GUESTBOOK_KEY, loadGuestbook).catch(() => undefined)
    }
    preloadWhenVisible()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') preloadWhenVisible()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [cache])

  const addGuestbook = useCallback(
    async (content: string, parentId?: string | null) => {
      if (!user) return '未登录'
      const text = content.trim()
      if (!text) return '内容不能为空'
      try {
        const { error: err } = await supabaseBrowser()
          .from('guestbook')
          .insert({ user_id: user.id, content: text, parent_id: parentId ?? null })
        if (err) return err.message
        await refreshGuestbook()
        return null
      } catch (e) {
        return errMsg('发表失败', e)
      }
    },
    [user, refreshGuestbook],
  )

  const deleteGuestbook = useCallback(
    async (id: string) => {
      if (!user) return '未登录'
      try {
        const { error: err } = await supabaseBrowser().from('guestbook').delete().eq('id', id)
        if (err) return err.message
        cache.setData<GuestbookSnapshot>(GUESTBOOK_KEY, (current) => ({
          guestbook: current.guestbook.filter((item) => item.id !== id),
        }))
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [user, cache],
  )

  const data = entry.data ?? EMPTY_SNAPSHOT
  const hasData = entry.data !== null
  const isInitialLoading = !hasData && (entry.status === 'idle' || entry.status === 'loading')
  const isRefreshing = hasData && entry.status === 'loading'
  const error = entry.error || (!hasData ? initialError : '')
  const ready = hasData || (!isInitialLoading && !error)

  const value = useMemo<GuestbookContextValue>(
    () => ({
      ready,
      hasData,
      isInitialLoading,
      isRefreshing,
      error,
      guestbook: data.guestbook,
      refreshGuestbook,
      addGuestbook,
      deleteGuestbook,
    }),
    [ready, hasData, isInitialLoading, isRefreshing, error, data, refreshGuestbook, addGuestbook, deleteGuestbook],
  )

  return <GuestbookContext.Provider value={value}>{children}</GuestbookContext.Provider>
}

export function useGuestbook(): GuestbookContextValue {
  const value = useContext(GuestbookContext)
  if (!value) throw new Error('useGuestbook 必须在 GuestbookProvider 内使用')
  return value
}
