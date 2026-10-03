'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { loadGuestbook } from '@/lib/public-resource-loaders.browser'
import { usePublicResource } from '@/lib/use-public-resource'
import { resourceError } from '@/lib/resource-error'
import type { GuestbookSnapshot, ServerSnapshot, PublicResourceState } from '@/lib/public-resource-types'
import type { GuestbookItem } from '@/lib/store-types'

export type GuestbookContextValue = PublicResourceState & {
  guestbook: GuestbookItem[]
  refreshGuestbook: () => Promise<void>
  addGuestbook: (content: string, parentId?: string | null) => Promise<string | null>
  deleteGuestbook: (id: string) => Promise<string | null>
}

export const GuestbookContext = createContext<GuestbookContextValue | null>(null)

const EMPTY_SNAPSHOT: GuestbookSnapshot = { guestbook: [] }
const GUESTBOOK_KEY = 'guestbook' as const

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
  const { cache, data, refresh: refreshGuestbook, ready, hasData, isInitialLoading, isRefreshing, error } = usePublicResource({
    key: GUESTBOOK_KEY,
    loader: loadGuestbook,
    emptySnapshot: EMPTY_SNAPSHOT,
    initialSnapshot,
    initialError,
  })

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
        return resourceError('发表失败', e)
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
        return resourceError('删除失败', e)
      }
    },
    [user, cache],
  )

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
