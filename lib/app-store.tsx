'use client'

import { useCallback, useContext, useMemo, type ReactNode } from 'react'
import { AuthContext, AuthProvider, useAuth } from '@/lib/auth-context'
import { AlbumsContext, AlbumsProvider } from '@/lib/albums-context'
import { CommentsContext, CommentsProvider } from '@/lib/comments-context'
import { GuestbookContext, GuestbookProvider } from '@/lib/guestbook-context'
import { MomentsContext, MomentsProvider } from '@/lib/moments-context'
import type {
  AlbumItem,
  CommentItem,
  GuestbookItem,
  MomentCommentItem,
  MomentItem,
  MomentLikeItem,
  PhotoItem,
  StoreProfile,
  StoreUser,
} from '@/lib/store-types'

export type {
  AlbumItem,
  CommentItem,
  GuestbookItem,
  MomentCommentItem,
  MomentItem,
  MomentLikeItem,
  PhotoItem,
  StoreProfile,
  StoreUser,
} from '@/lib/store-types'
export { AuthProvider, useAuth } from '@/lib/auth-context'
export { AlbumsProvider, useAlbums } from '@/lib/albums-context'
export { CommentsProvider, useComments } from '@/lib/comments-context'
export { GuestbookProvider, useGuestbook } from '@/lib/guestbook-context'
export { MomentsProvider, useMoments } from '@/lib/moments-context'

export type AppStore = {
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
  addMomentComment: (momentId: string, content: string, parentId?: string | null) => Promise<string | null>
  toggleMomentLike: (momentId: string) => Promise<string | null>
  createAlbum: (title: string, description: string) => Promise<AlbumItem | null>
  updateAlbum: (id: string, patch: { title: string; description: string }) => Promise<string | null>
  deleteAlbum: (id: string) => Promise<string | null>
  deletePhoto: (id: string) => Promise<string | null>
  addComment: (postSlug: string, content: string, parentId?: string | null) => Promise<string | null>
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MomentsProvider>
        <AlbumsProvider>
          <GuestbookProvider>
            <CommentsProvider>{children}</CommentsProvider>
          </GuestbookProvider>
        </AlbumsProvider>
      </MomentsProvider>
    </AuthProvider>
  )
}

export function useAppStore(): AppStore {
  const auth = useAuth()
  const moments = useContext(MomentsContext)
  const albums = useContext(AlbumsContext)
  const guestbook = useContext(GuestbookContext)
  const comments = useContext(CommentsContext)

  if (!moments || !albums || !guestbook || !comments) {
    throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  }

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      moments.refreshMoments(),
      albums.refreshAlbums(),
      guestbook.refreshGuestbook(),
      comments.refreshComments(),
    ])
  }, [moments, albums, guestbook, comments])

  return useMemo(
    () => ({
      ready: auth.ready && moments.ready && albums.ready && guestbook.ready && comments.ready,
      error: [auth.error, moments.error, albums.error, guestbook.error, comments.error]
        .filter(Boolean)
        .join('\n'),
      user: auth.user,
      profile: auth.profile,
      isOwner: auth.isOwner,
      moments: moments.moments,
      momentComments: moments.momentComments,
      momentLikes: moments.momentLikes,
      albums: albums.albums,
      photos: albums.photos,
      guestbook: guestbook.guestbook,
      comments: comments.comments,
      refresh,
      refreshGuestbook: guestbook.refreshGuestbook,
      refreshMoments: moments.refreshMoments,
      refreshAlbums: albums.refreshAlbums,
      refreshComments: comments.refreshComments,
      signOut: auth.signOut,
      updateProfile: auth.updateProfile,
      addGuestbook: guestbook.addGuestbook,
      deleteGuestbook: guestbook.deleteGuestbook,
      postMoment: moments.postMoment,
      deleteMoment: moments.deleteMoment,
      addMomentComment: moments.addMomentComment,
      toggleMomentLike: moments.toggleMomentLike,
      createAlbum: albums.createAlbum,
      updateAlbum: albums.updateAlbum,
      deleteAlbum: albums.deleteAlbum,
      deletePhoto: albums.deletePhoto,
      addComment: comments.addComment,
    }),
    [auth, moments, albums, guestbook, comments, refresh],
  )
}
