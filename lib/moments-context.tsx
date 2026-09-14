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
import type { MomentCommentItem, MomentItem, MomentLikeItem } from '@/lib/store-types'

export type MomentsContextValue = {
  ready: boolean
  error: string
  moments: MomentItem[]
  momentComments: MomentCommentItem[]
  momentLikes: MomentLikeItem[]
  refreshMoments: () => Promise<void>
  postMoment: (content: string, images: string[]) => Promise<string | null>
  deleteMoment: (id: string) => Promise<string | null>
  addMomentComment: (momentId: string, content: string, parentId?: string | null) => Promise<string | null>
  toggleMomentLike: (momentId: string) => Promise<string | null>
}

export const MomentsContext = createContext<MomentsContextValue | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function MomentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [moments, setMoments] = useState<MomentItem[]>([])
  const [momentComments, setMomentComments] = useState<MomentCommentItem[]>([])
  const [momentLikes, setMomentLikes] = useState<MomentLikeItem[]>([])

  const refreshMoments = useCallback(async () => {
    try {
      const sb = supabaseBrowser()
      const { data } = await sb
        .from('moments')
        .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(200)
      const list = (data ?? []) as unknown as MomentItem[]
      setMoments(list)
      const ids = list.map((moment) => moment.id)
      if (ids.length === 0) {
        setMomentComments([])
        setMomentLikes([])
        return
      }
      const [commentsResult, likesResult] = await Promise.all([
        sb
          .from('moment_comments')
          .select('*, profiles!moment_comments_user_id_fkey(nickname, avatar_url)')
          .in('moment_id', ids)
          .order('created_at', { ascending: true })
          .limit(2000),
        sb.from('moment_likes').select('moment_id, user_id').in('moment_id', ids).limit(5000),
      ])
      setMomentComments((commentsResult.data ?? []) as unknown as MomentCommentItem[])
      setMomentLikes((likesResult.data ?? []) as unknown as MomentLikeItem[])
    } catch (e) {
      setError(errMsg('读取闲语失败', e))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setError('')
    void refreshMoments().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [refreshMoments])

  const postMoment = useCallback(
    async (content: string, images: string[]) => {
      if (!user) return '未登录'
      try {
        const { error: err } = await supabaseBrowser()
          .from('moments')
          .insert({ user_id: user.id, content: content.trim(), images })
        if (err) return err.message
        await refreshMoments()
        return null
      } catch (e) {
        return errMsg('发布失败', e)
      }
    },
    [user, refreshMoments],
  )

  const deleteMoment = useCallback(
    async (id: string) => {
      if (!user) return '未登录'
      try {
        const { error: err } = await supabaseBrowser().from('moments').delete().eq('id', id)
        if (err) return err.message
        await refreshMoments()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [user, refreshMoments],
  )

  const addMomentComment = useCallback(
    async (momentId: string, content: string, parentId?: string | null) => {
      if (!user) return '未登录'
      const text = content.trim()
      if (!text) return '内容不能为空'
      try {
        const sb = supabaseBrowser()
        const select = '*, profiles!moment_comments_user_id_fkey(nickname, avatar_url)'
        let { data, error: err } = await sb
          .from('moment_comments')
          .insert({ moment_id: momentId, user_id: user.id, content: text, parent_id: parentId ?? null })
          .select(select)
          .single()
        if (err && parentId && /parent_id|column/i.test(err.message || '')) {
          const retry = await sb
            .from('moment_comments')
            .insert({ moment_id: momentId, user_id: user.id, content: text })
            .select(select)
            .single()
          data = retry.data
          err = retry.error
        }
        if (err) return err.message
        const row = data as unknown as MomentCommentItem | null
        if (row) setMomentComments((previous) => [...previous, row])
        else await refreshMoments()
        return null
      } catch (e) {
        return errMsg('评论失败', e)
      }
    },
    [user, refreshMoments],
  )

  const toggleMomentLike = useCallback(
    async (momentId: string) => {
      if (!user) return '未登录'
      try {
        const sb = supabaseBrowser()
        const mine = momentLikes.some((like) => like.moment_id === momentId && like.user_id === user.id)
        let dbError: { message: string } | null = null
        if (mine) {
          const { error } = await sb
            .from('moment_likes')
            .delete()
            .match({ moment_id: momentId, user_id: user.id })
          dbError = error
        } else {
          const { error } = await sb
            .from('moment_likes')
            .insert({ moment_id: momentId, user_id: user.id })
          dbError = error
        }
        if (dbError) return dbError.message
        setMomentLikes((previous) =>
          mine
            ? previous.filter((like) => !(like.moment_id === momentId && like.user_id === user.id))
            : [...previous, { moment_id: momentId, user_id: user.id }],
        )
        return null
      } catch (e) {
        return errMsg('点赞失败', e)
      }
    },
    [user, momentLikes],
  )

  const value = useMemo<MomentsContextValue>(
    () => ({
      ready,
      error,
      moments,
      momentComments,
      momentLikes,
      refreshMoments,
      postMoment,
      deleteMoment,
      addMomentComment,
      toggleMomentLike,
    }),
    [
      ready,
      error,
      moments,
      momentComments,
      momentLikes,
      refreshMoments,
      postMoment,
      deleteMoment,
      addMomentComment,
      toggleMomentLike,
    ],
  )

  return <MomentsContext.Provider value={value}>{children}</MomentsContext.Provider>
}

export function useMoments(): MomentsContextValue {
  const value = useContext(MomentsContext)
  if (!value) throw new Error('useMoments 必须在 MomentsProvider 内使用')
  return value
}
