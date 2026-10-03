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
import { loadComments } from '@/lib/public-resource-loaders.browser'
import { usePublicResource } from '@/lib/use-public-resource'
import { resourceError } from '@/lib/resource-error'
import type { CommentsSnapshot, ServerSnapshot, PublicResourceState } from '@/lib/public-resource-types'
import type { CommentItem } from '@/lib/store-types'

export type CommentsContextValue = PublicResourceState & {
  comments: CommentItem[]
  refreshComments: () => Promise<void>
  addComment: (postSlug: string, content: string, parentId?: string | null) => Promise<string | null>
}

export const CommentsContext = createContext<CommentsContextValue | null>(null)

const EMPTY_SNAPSHOT: CommentsSnapshot = { comments: [] }

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
  const loader = useCallback(() => loadComments(slug), [slug])
  const { data, refresh: refreshComments, ready, hasData, isInitialLoading, isRefreshing, error } = usePublicResource({
    key: `comments:${slug ?? '*'}` as `comments:${string}`,
    loader,
    emptySnapshot: EMPTY_SNAPSHOT,
    initialSnapshot,
    initialError,
  })

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
        return resourceError('发表失败', e)
      }
    },
    [user, refreshComments],
  )

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
