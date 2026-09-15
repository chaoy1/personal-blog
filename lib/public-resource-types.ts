import type {
  AlbumsSnapshot,
  CommentsSnapshot,
  GuestbookSnapshot,
  MomentsSnapshot,
} from '@/lib/store-types'

export type ServerSnapshot<T> = {
  data: T
  generatedAt: number
  error?: string
}

export type PublicResourceKey =
  | 'moments'
  | 'albums'
  | 'guestbook'
  | `comments:${string}`

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ResourceEntry<T> = {
  data: T | null
  status: ResourceStatus
  error: string
  updatedAt: number
  promise: Promise<T> | null
}

export type {
  AlbumsSnapshot,
  CommentsSnapshot,
  GuestbookSnapshot,
  MomentsSnapshot,
}
