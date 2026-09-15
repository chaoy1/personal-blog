import 'server-only'

import { unstable_cache } from 'next/cache'
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase'
import type {
  AlbumsSnapshot,
  CommentsSnapshot,
  GuestbookSnapshot,
  MomentsSnapshot,
  ServerSnapshot,
} from '@/lib/public-resource-types'
import type { AlbumItem, CommentItem, GuestbookItem, MomentCommentItem, MomentItem, MomentLikeItem, PhotoItem } from '@/lib/store-types'

function emptySnapshot<T>(data: T): ServerSnapshot<T> {
  return { data, generatedAt: Date.now() }
}

function queryError(prefix: string, error: { message: string } | null | undefined): never | void {
  if (error) throw new Error(`${prefix}：${error.message}`)
}

async function readMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>> {
  const sb = supabaseAdmin()
  const momentsResult = await sb
    .from('moments')
    .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200)
  queryError('读取闲语失败', momentsResult.error)
  const moments = (momentsResult.data ?? []) as unknown as MomentItem[]
  const ids = moments.map((moment) => moment.id)

  if (ids.length === 0) {
    return {
      data: { moments, momentComments: [], momentLikes: [] },
      generatedAt: Date.now(),
    }
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
  queryError('读取闲语评论失败', commentsResult.error)
  queryError('读取闲语点赞失败', likesResult.error)

  return {
    data: {
      moments,
      momentComments: (commentsResult.data ?? []) as unknown as MomentCommentItem[],
      momentLikes: (likesResult.data ?? []) as unknown as MomentLikeItem[],
    },
    generatedAt: Date.now(),
  }
}

async function readAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>> {
  const sb = supabaseAdmin()
  const [albumsResult, photosResult] = await Promise.all([
    sb.from('albums').select('*').order('created_at', { ascending: false }),
    sb.from('photos').select('*').order('created_at', { ascending: false }).limit(2000),
  ])
  queryError('读取相册失败', albumsResult.error)
  queryError('读取照片失败', photosResult.error)
  return {
    data: {
      albums: (albumsResult.data ?? []) as unknown as AlbumItem[],
      photos: (photosResult.data ?? []) as unknown as PhotoItem[],
    },
    generatedAt: Date.now(),
  }
}

async function readGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>> {
  const result = await supabaseAdmin()
    .from('guestbook')
    .select('*, profiles!guestbook_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(1000)
  queryError('读取留言失败', result.error)
  return {
    data: { guestbook: (result.data ?? []) as unknown as GuestbookItem[] },
    generatedAt: Date.now(),
  }
}

async function readCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>> {
  const result = await supabaseAdmin()
    .from('comments')
    .select(
      'id, post_slug, user_id, parent_id, content, created_at, profiles!comments_user_id_fkey(nickname, avatar_url)',
    )
    .eq('post_slug', slug)
    .order('created_at', { ascending: true })
    .limit(3000)
  queryError('读取评论失败', result.error)
  return {
    data: { comments: (result.data ?? []) as unknown as CommentItem[] },
    generatedAt: Date.now(),
  }
}

const cachedMomentsSnapshot = unstable_cache(readMomentsSnapshot, ['public-resource-moments'], { revalidate: 60 })
const cachedAlbumsSnapshot = unstable_cache(readAlbumsSnapshot, ['public-resource-albums'], { revalidate: 300 })
const cachedGuestbookSnapshot = unstable_cache(readGuestbookSnapshot, ['public-resource-guestbook'], { revalidate: 30 })

export async function loadMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>> {
  return isSupabaseConfigured() ? cachedMomentsSnapshot() : emptySnapshot({ moments: [], momentComments: [], momentLikes: [] })
}

export async function loadAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>> {
  return isSupabaseConfigured() ? cachedAlbumsSnapshot() : emptySnapshot({ albums: [], photos: [] })
}

export async function loadGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>> {
  return isSupabaseConfigured() ? cachedGuestbookSnapshot() : emptySnapshot({ guestbook: [] })
}

export async function loadCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>> {
  if (!isSupabaseConfigured()) return emptySnapshot({ comments: [] })
  return unstable_cache(() => readCommentsSnapshot(slug), ['public-resource-comments', slug], { revalidate: 30 })()
}
