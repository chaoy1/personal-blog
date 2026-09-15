import { supabaseBrowser } from '@/lib/supabase-browser'
import type { AlbumsSnapshot, CommentsSnapshot, GuestbookSnapshot, MomentsSnapshot } from '@/lib/public-resource-types'
import type { AlbumItem, CommentItem, GuestbookItem, MomentCommentItem, MomentItem, MomentLikeItem, PhotoItem } from '@/lib/store-types'

function queryError(prefix: string, error: { message: string } | null | undefined): never | void {
  if (error) throw new Error(`${prefix}：${error.message}`)
}

export async function loadMoments(): Promise<MomentsSnapshot> {
  const sb = supabaseBrowser()
  const momentsResult = await sb
    .from('moments')
    .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200)
  queryError('读取闲语失败', momentsResult.error)
  const moments = (momentsResult.data ?? []) as unknown as MomentItem[]
  const ids = moments.map((moment) => moment.id)
  if (ids.length === 0) return { moments, momentComments: [], momentLikes: [] }

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
    moments,
    momentComments: (commentsResult.data ?? []) as unknown as MomentCommentItem[],
    momentLikes: (likesResult.data ?? []) as unknown as MomentLikeItem[],
  }
}

export async function loadAlbums(): Promise<AlbumsSnapshot> {
  const sb = supabaseBrowser()
  const [albumsResult, photosResult] = await Promise.all([
    sb.from('albums').select('*').order('created_at', { ascending: false }),
    sb.from('photos').select('*').order('created_at', { ascending: false }).limit(2000),
  ])
  queryError('读取相册失败', albumsResult.error)
  queryError('读取照片失败', photosResult.error)
  return {
    albums: (albumsResult.data ?? []) as unknown as AlbumItem[],
    photos: (photosResult.data ?? []) as unknown as PhotoItem[],
  }
}

export async function loadGuestbook(): Promise<GuestbookSnapshot> {
  const result = await supabaseBrowser()
    .from('guestbook')
    .select('*, profiles!guestbook_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(1000)
  queryError('读取留言失败', result.error)
  return { guestbook: (result.data ?? []) as unknown as GuestbookItem[] }
}

export async function loadComments(slug?: string): Promise<CommentsSnapshot> {
  let query = supabaseBrowser()
    .from('comments')
    .select(
      'id, post_slug, user_id, parent_id, content, created_at, profiles!comments_user_id_fkey(nickname, avatar_url)',
    )
  if (slug) query = query.eq('post_slug', slug)
  const result = await query.order('created_at', { ascending: true }).limit(3000)
  queryError('读取评论失败', result.error)
  return { comments: (result.data ?? []) as unknown as CommentItem[] }
}
