'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { GuestbookItem } from '@/lib/store-types'

export type GuestbookContextValue = {
  ready: boolean
  error: string
  guestbook: GuestbookItem[]
  refreshGuestbook: () => Promise<void>
  addGuestbook: (content: string, parentId?: string | null) => Promise<string | null>
  deleteGuestbook: (id: string) => Promise<string | null>
}

export const GuestbookContext = createContext<GuestbookContextValue | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function GuestbookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [guestbook, setGuestbook] = useState<GuestbookItem[]>([])

  const refreshGuestbook = useCallback(async () => {
    try {
      const { data } = await supabaseBrowser()
        .from('guestbook')
        .select('*, profiles!guestbook_user_id_fkey(nickname, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(1000)
      setGuestbook((data ?? []) as unknown as GuestbookItem[])
    } catch (e) {
      setError(errMsg('读取留言失败', e))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setError('')
    void refreshGuestbook().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [refreshGuestbook])

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
        await refreshGuestbook()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [user, refreshGuestbook],
  )

  const value = useMemo<GuestbookContextValue>(
    () => ({ ready, error, guestbook, refreshGuestbook, addGuestbook, deleteGuestbook }),
    [ready, error, guestbook, refreshGuestbook, addGuestbook, deleteGuestbook],
  )

  return <GuestbookContext.Provider value={value}>{children}</GuestbookContext.Provider>
}

export function useGuestbook(): GuestbookContextValue {
  const value = useContext(GuestbookContext)
  if (!value) throw new Error('useGuestbook 必须在 GuestbookProvider 内使用')
  return value
}
