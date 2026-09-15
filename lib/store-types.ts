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
  parent_id: string | null
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

export type MomentsSnapshot = {
  moments: MomentItem[]
  momentComments: MomentCommentItem[]
  momentLikes: MomentLikeItem[]
}

export type AlbumsSnapshot = {
  albums: AlbumItem[]
  photos: PhotoItem[]
}

export type GuestbookSnapshot = {
  guestbook: GuestbookItem[]
}

export type CommentsSnapshot = {
  comments: CommentItem[]
}

export type StoreUser = { id: string; email?: string }
