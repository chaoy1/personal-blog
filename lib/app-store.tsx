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

export type StoreProfile = {
  id: string
  nickname: string
  avatar_url: string
  role: string
  bio: string
}

export type MomentItem = {
  id: string
  user_id: string
  content: string
  images: string[]
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export type MomentCommentItem = {
  id: string
  moment_id: string
  user_id: string
  content: string
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export type MomentLikeItem = {
  moment_id: string
  user_id: string
}

export type AlbumItem = {
  id: string
  user_id: string
  title: string
  description: string
  cover_url: string
  created_at: string
}

export type PhotoItem = {
  id: string
  user_id: string
  url: string
  caption: string
  album_id: string | null
  created_at: string
}

export type GuestbookItem = {
  id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export type CommentItem = {
  id: string
  post_slug: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export type StoreUser = { id: string; email?: string }

type AppStore = {
  ready: boolean
  error: string
  user: StoreUser | null
  profile: StoreProfile | null
  isOwner: boolean
  moments: MomentItem[]
  momentComments: MomentCommentItem[]
  momentLikes: MomentLikeItem[]
  albums: AlbumItem[]
  photos: PhotoItem[]
  guestbook: GuestbookItem[]
  comments: CommentItem[]
  refresh: () => Promise<void>
  refreshGuestbook: () => Promise<void>
  refreshMoments: () => Promise<void>
  refreshAlbums: () => Promise<void>
  refreshComments: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (patch: { nickname?: string; avatar_url?: string }) => Promise<string | null>
  addGuestbook: (content: string, parentId?: string | null) => Promise<string | null>
  deleteGuestbook: (id: string) => Promise<string | null>
  postMoment: (content: string, images: string[]) => Promise<string | null>
  deleteMoment: (id: string) => Promise<string | null>
  addMomentComment: (momentId: string, content: string) => Promise<string | null>
  toggleMomentLike: (momentId: string) => Promise<string | null>
  createAlbum: (title: string, description: string) => Promise<AlbumItem | null>
  updateAlbum: (id: string, patch: { title: string; description: string }) => Promise<string | null>
  deleteAlbum: (id: string) => Promise<string | null>
  deletePhoto: (id: string) => Promise<string | null>
  addComment: (
    postSlug: string,
    content: string,
    parentId?: string | null
  ) => Promise<string | null>
}

const Ctx = createContext<AppStore | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<StoreUser | null>(null)
  const [profile, setProfile] = useState<StoreProfile | null>(null)
  const [moments, setMoments] = useState<MomentItem[]>([])
  const [momentComments, setMomentComments] = useState<MomentCommentItem[]>([])
  const [momentLikes, setMomentLikes] = useState<MomentLikeItem[]>([])
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [guestbook, setGuestbook] = useState<GuestbookItem[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const { data } = await supabaseBrowser()
        .from('profiles')
        .select('id, nickname, avatar_url, role, bio')
        .eq('id', uid)
        .maybeSingle()
      setProfile((data as unknown as StoreProfile | null) ?? null)
    } catch {
      setProfile(null)
    }
  }, [])

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
      const ids = list.map((m) => m.id)
      if (ids.length === 0) {
        setMomentComments([])
        setMomentLikes([])
        return
      }
      const [cRes, lRes] = await Promise.all([
        sb
          .from('moment_comments')
          .select('*, profiles!moment_comments_user_id_fkey(nickname, avatar_url)')
          .in('moment_id', ids)
          .order('created_at', { ascending: true })
          .limit(2000),
        sb.from('moment_likes').select('moment_id, user_id').in('moment_id', ids).limit(5000),
      ])
      setMomentComments((cRes.data ?? []) as unknown as MomentCommentItem[])
      setMomentLikes((lRes.data ?? []) as unknown as MomentLikeItem[])
    } catch (e) {
      setError(errMsg('读取说说失败', e))
    }
  }, [])

  const refreshAlbums = useCallback(async () => {
    try {
      const sb = supabaseBrowser()
      const [aRes, pRes] = await Promise.all([
        sb.from('albums').select('*').order('created_at', { ascending: false }),
        sb.from('photos').select('*').order('created_at', { ascending: false }).limit(2000),
      ])
      setAlbums((aRes.data ?? []) as unknown as AlbumItem[])
      setPhotos((pRes.data ?? []) as unknown as PhotoItem[])
    } catch (e) {
      setError(errMsg('读取相册失败', e))
    }
  }, [])

  const refreshComments = useCallback(async () => {
    try {
      const { data } = await supabaseBrowser()
        .from('comments')
        .select(
          'id, post_slug, user_id, parent_id, content, created_at, profiles!comments_user_id_fkey(nickname, avatar_url)'
        )
        .order('created_at', { ascending: true })
        .limit(3000)
      setComments((data ?? []) as unknown as CommentItem[])
    } catch (e) {
      setError(errMsg('读取评论失败', e))
    }
  }, [])

  const refresh = useCallback(async () => {
    setError('')
    await Promise.allSettled([
      refreshGuestbook(),
      refreshMoments(),
      refreshAlbums(),
      refreshComments(),
    ])
  }, [refreshGuestbook, refreshMoments, refreshAlbums, refreshComments])

  useEffect(() => {
    let cancelled = false
    let sub: { subscription: { unsubscribe: () => void } } | null = null
    async function init() {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const u = (data.session?.user as StoreUser | undefined) ?? null
        if (cancelled) return
        setUser(u)
        if (u) await loadProfile(u.id)
        await refresh()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          setError(errMsg('初始化失败', e))
          setReady(true)
        }
      }
      try {
        const sb = supabaseBrowser()
        const r = sb.auth.onAuthStateChange((_event, session) => {
          const u = (session?.user as StoreUser | undefined) ?? null
          setUser(u)
          if (u) loadProfile(u.id).catch(() => {})
          else setProfile(null)
        })
        sub = r.data
      } catch {
        // ignore
      }
    }
    init()
    return () => {
      cancelled = true
      sub?.subscription.unsubscribe()
    }
  }, [loadProfile, refresh])

  const signOut = useCallback(async () => {
    try {
      await supabaseBrowser().auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (patch: { nickname?: string; avatar_url?: string }) => {
      if (!user) return '未登录'
      try {
        const { error: err } = await supabaseBrowser()
          .from('profiles')
          .upsert({ id: user.id, ...patch })
        if (err) return err.message
        await loadProfile(user.id)
        return null
      } catch (e) {
        return errMsg('保存失败', e)
      }
    },
    [user, loadProfile]
  )

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
    [user, refreshGuestbook]
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
    [user, refreshGuestbook]
  )

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
    [user, refreshMoments]
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
    [user, refreshMoments]
  )

  const addMomentComment = useCallback(
    async (momentId: string, content: string) => {
      if (!user) return '未登录'
      const text = content.trim()
      if (!text) return '内容不能为空'
      try {
        const { error: err } = await supabaseBrowser()
          .from('moment_comments')
          .insert({ moment_id: momentId, user_id: user.id, content: text })
        if (err) return err.message
        await refreshMoments()
        return null
      } catch (e) {
        return errMsg('评论失败', e)
      }
    },
    [user, refreshMoments]
  )

  const toggleMomentLike = useCallback(
    async (momentId: string) => {
      if (!user) return '未登录'
      try {
        const sb = supabaseBrowser()
        const mine = momentLikes.some((l) => l.moment_id === momentId && l.user_id === user.id)
        if (mine) {
          await sb.from('moment_likes').delete().match({ moment_id: momentId, user_id: user.id })
        } else {
          await sb.from('moment_likes').insert({ moment_id: momentId, user_id: user.id })
        }
        await refreshMoments()
        return null
      } catch (e) {
        return errMsg('点赞失败', e)
      }
    },
    [user, momentLikes, refreshMoments]
  )

  const createAlbum = useCallback(
    async (title: string, description: string) => {
      if (!user) return null
      try {
        const { data, error: err } = await supabaseBrowser()
          .from('albums')
          .insert({ user_id: user.id, title, description })
          .select('*')
          .single()
        if (err) return null
        await refreshAlbums()
        return (data ?? null) as unknown as AlbumItem | null
      } catch {
        return null
      }
    },
    [user, refreshAlbums]
  )

  const updateAlbum = useCallback(
    async (id: string, patch: { title: string; description: string }) => {
      try {
        const { error: err } = await supabaseBrowser()
          .from('albums')
          .update(patch)
          .eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('保存失败', e)
      }
    },
    [refreshAlbums]
  )

  const deleteAlbum = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('albums').delete().eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [refreshAlbums]
  )

  const deletePhoto = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('photos').delete().eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [refreshAlbums]
  )

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
    [user, refreshComments]
  )

  const value = useMemo<AppStore>(
    () => ({
      ready,
      error,
      user,
      profile,
      isOwner: profile?.role === 'owner',
      moments,
      momentComments,
      momentLikes,
      albums,
      photos,
      guestbook,
      comments,
      refresh,
      refreshGuestbook,
      refreshMoments,
      refreshAlbums,
      refreshComments,
      signOut,
      updateProfile,
      addGuestbook,
      deleteGuestbook,
      postMoment,
      deleteMoment,
      addMomentComment,
      toggleMomentLike,
      createAlbum,
      updateAlbum,
      deleteAlbum,
      deletePhoto,
      addComment,
    }),
    [
      ready,
      error,
      user,
      profile,
      moments,
      momentComments,
      momentLikes,
      albums,
      photos,
      guestbook,
      comments,
      refresh,
      refreshGuestbook,
      refreshMoments,
      refreshAlbums,
      refreshComments,
      signOut,
      updateProfile,
      addGuestbook,
      deleteGuestbook,
      postMoment,
      deleteMoment,
      addMomentComment,
      toggleMomentLike,
      createAlbum,
      updateAlbum,
      deleteAlbum,
      deletePhoto,
      addComment,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppStore(): AppStore {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  return v
}
