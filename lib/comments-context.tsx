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
import { loadComments } from '@/lib/public-resource-loaders.browser'
import { usePublicResourceCache, useResourceEntry } from '@/lib/public-resource-cache'
import type { CommentsSnapshot, ServerSnapshot } from '@/lib/public-resource-types'
import type { CommentItem } from '@/lib/store-types'

export type CommentsContextValue = {
  ready: boolean
  hasData: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  error: string
  comments: CommentItem[]
  refreshComments: () => Promise<void>
  addComment: (postSlug: string, content: string, parentId?: string | null) => Promise<string | null>
}

export const CommentsContext = createContext<CommentsContextValue | null>(null)

const EMPTY_SNAPSHOT: CommentsSnapshot = { comments: [] }

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function CommentsProvider({
  children,
  slug,
  initialSnapshot,
  initialError = '',
}: {
  children: ReactNode
  slug?: string
  initialSnapshot?: ServerSnapshot<CommentsSnapshot> | null
  initialError?: string
}) {
  const { user } = useAuth()
  const cache = usePublicResourceCache()
  const key = `comments:${slug ?? '*'}` as `comments:${string}`
  const seededRef = useRef<ServerSnapshot<CommentsSnapshot> | null>(null)

  if (initialSnapshot && seededRef.current !== initialSnapshot) {
    cache.seed(key, initialSnapshot)
    seededRef.current = initialSnapshot
  }

  const entry = useResourceEntry<CommentsSnapshot>(key)

  const refreshComments = useCallback(async () => {
    await cache.revalidate(key, () => loadComments(slug)).catch(() => undefined)
  }, [cache, key, slug])

  useEffect(() => {
    void cache.preload(key, () => loadComments(slug)).catch(() => undefined)
  }, [cache, key, slug])

  const addComment = useCallback(
    async (postSlug: string, content: string, parentId?: string | null) => {
      if (!user) return '未登录'
      const text = content.trim()
      if (!text) return '内容不能为空'
      try {
        const { error: err } = await supabaseBrowser()
          .from('comments')
          .insert({ post_slug: postSlug, user_id: user.id, parent_id: parentId ?? null, content: text })
        if (err) return err.message
        await refreshComments()
        return null
      } catch (e) {
        return errMsg('发表失败', e)
      }
    },
    [user, refreshComments],
  )

  const data = entry.data ?? EMPTY_SNAPSHOT
  const hasData = entry.data !== null
  const isInitialLoading = !hasData && (entry.status === 'idle' || entry.status === 'loading')
  const isRefreshing = hasData && entry.status === 'loading'
  const error = entry.error || (!hasData ? initialError : '')
  const ready = hasData || (!isInitialLoading && !error)

  const value = useMemo<CommentsContextValue>(
    () => ({ ready, hasData, isInitialLoading, isRefreshing, error, comments: data.comments, refreshComments, addComment }),
    [ready, hasData, isInitialLoading, isRefreshing, error, data, refreshComments, addComment],
  )

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}

export function useComments(): CommentsContextValue {
  const value = useContext(CommentsContext)
  if (!value) throw new Error('useComments 必须在 CommentsProvider 内使用')
  return value
}
