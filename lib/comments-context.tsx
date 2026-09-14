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
import type { CommentItem } from '@/lib/store-types'

export type CommentsContextValue = {
  ready: boolean
  error: string
  comments: CommentItem[]
  refreshComments: () => Promise<void>
  addComment: (postSlug: string, content: string, parentId?: string | null) => Promise<string | null>
}

export const CommentsContext = createContext<CommentsContextValue | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function CommentsProvider({ children, slug }: { children: ReactNode; slug?: string }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([])

  const refreshComments = useCallback(async () => {
    try {
      let query = supabaseBrowser()
        .from('comments')
        .select(
          'id, post_slug, user_id, parent_id, content, created_at, profiles!comments_user_id_fkey(nickname, avatar_url)',
        )
      if (slug) query = query.eq('post_slug', slug)
      const { data } = await query.order('created_at', { ascending: true }).limit(3000)
      setComments((data ?? []) as unknown as CommentItem[])
    } catch (e) {
      setError(errMsg('读取评论失败', e))
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false
    setError('')
    setReady(false)
    void refreshComments().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [refreshComments])

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

  const value = useMemo<CommentsContextValue>(
    () => ({ ready, error, comments, refreshComments, addComment }),
    [ready, error, comments, refreshComments, addComment],
  )

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}

export function useComments(): CommentsContextValue {
  const value = useContext(CommentsContext)
  if (!value) throw new Error('useComments 必须在 CommentsProvider 内使用')
  return value
}
