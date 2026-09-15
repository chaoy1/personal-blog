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
import { loadMoments } from '@/lib/public-resource-loaders.browser'
import { usePublicResourceCache, useResourceEntry } from '@/lib/public-resource-cache'
import type { MomentsSnapshot, ServerSnapshot } from '@/lib/public-resource-types'
import type { MomentCommentItem, MomentItem, MomentLikeItem } from '@/lib/store-types'

export type MomentsContextValue = {
  ready: boolean
  hasData: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  error: string
  isOwner: boolean
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

const EMPTY_SNAPSHOT: MomentsSnapshot = { moments: [], momentComments: [], momentLikes: [] }
const MOMENTS_KEY = 'moments' as const

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function MomentsProvider({
  children,
  initialSnapshot,
  initialError = '',
}: {
  children: ReactNode
  initialSnapshot?: ServerSnapshot<MomentsSnapshot> | null
  initialError?: string
}) {
  const { user, isOwner } = useAuth()
  const cache = usePublicResourceCache()
  const seededRef = useRef<ServerSnapshot<MomentsSnapshot> | null>(null)

  if (initialSnapshot && seededRef.current !== initialSnapshot) {
    cache.seed(MOMENTS_KEY, initialSnapshot)
    seededRef.current = initialSnapshot
  }

  const entry = useResourceEntry<MomentsSnapshot>(MOMENTS_KEY)

  const refreshMoments = useCallback(async () => {
    await cache.revalidate(MOMENTS_KEY, loadMoments).catch(() => undefined)
  }, [cache])

  useEffect(() => {
    void cache.preload(MOMENTS_KEY, loadMoments).catch(() => undefined)
  }, [cache])

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
        cache.setData<MomentsSnapshot>(MOMENTS_KEY, (current) => ({
          moments: current.moments.filter((moment) => moment.id !== id),
          momentComments: current.momentComments.filter((comment) => comment.moment_id !== id),
          momentLikes: current.momentLikes.filter((like) => like.moment_id !== id),
        }))
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [user, cache],
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
        if (row) {
          cache.setData<MomentsSnapshot>(MOMENTS_KEY, (current) => ({
            ...current,
            momentComments: [...current.momentComments, row],
          }))
        }
        else await refreshMoments()
        return null
      } catch (e) {
        return errMsg('评论失败', e)
      }
    },
    [user, cache, refreshMoments],
  )

  const toggleMomentLike = useCallback(
    async (momentId: string) => {
      if (!user) return '未登录'
      const before = cache.read<MomentsSnapshot>(MOMENTS_KEY).data
      if (!before) return '闲语尚未加载'
      const mine = before.momentLikes.some((like) => like.moment_id === momentId && like.user_id === user.id)
      const after: MomentsSnapshot = {
        ...before,
        momentLikes: mine
          ? before.momentLikes.filter((like) => !(like.moment_id === momentId && like.user_id === user.id))
          : [...before.momentLikes, { moment_id: momentId, user_id: user.id }],
      }
      cache.setData(MOMENTS_KEY, after)
      try {
        const sb = supabaseBrowser()
        const result = mine
          ? await sb.from('moment_likes').delete().match({ moment_id: momentId, user_id: user.id })
          : await sb.from('moment_likes').insert({ moment_id: momentId, user_id: user.id })
        if (result.error) {
          cache.setData(MOMENTS_KEY, before)
          return result.error.message
        }
        return null
      } catch (e) {
        cache.setData(MOMENTS_KEY, before)
        return errMsg('点赞失败', e)
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

  const value = useMemo<MomentsContextValue>(
    () => ({
      ready,
      hasData,
      isInitialLoading,
      isRefreshing,
      error,
      isOwner,
      moments: data.moments,
      momentComments: data.momentComments,
      momentLikes: data.momentLikes,
      refreshMoments,
      postMoment,
      deleteMoment,
      addMomentComment,
      toggleMomentLike,
    }),
    [
      ready,
      hasData,
      isInitialLoading,
      isRefreshing,
      error,
      isOwner,
      data,
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
