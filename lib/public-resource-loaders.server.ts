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
import { readMoments, readAlbums, readGuestbook, readComments } from '@/lib/public-resource-queries'

function createSnapshot<T>(data: T): ServerSnapshot<T> {
  return { data, generatedAt: Date.now() }
}

async function readMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>> {
  return createSnapshot(await readMoments(supabaseAdmin()))
}

async function readAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>> {
  return createSnapshot(await readAlbums(supabaseAdmin()))
}

async function readGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>> {
  return createSnapshot(await readGuestbook(supabaseAdmin()))
}

async function readCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>> {
  return createSnapshot(await readComments(supabaseAdmin(), slug))
}

const cachedMomentsSnapshot = unstable_cache(readMomentsSnapshot, ['public-resource-moments'], { revalidate: 60 })
const cachedAlbumsSnapshot = unstable_cache(readAlbumsSnapshot, ['public-resource-albums'], { revalidate: 300 })
const cachedGuestbookSnapshot = unstable_cache(readGuestbookSnapshot, ['public-resource-guestbook'], { revalidate: 30 })

export async function loadMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>> {
  return isSupabaseConfigured() ? cachedMomentsSnapshot() : createSnapshot({ moments: [], momentComments: [], momentLikes: [] })
}

export async function loadAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>> {
  return isSupabaseConfigured() ? cachedAlbumsSnapshot() : createSnapshot({ albums: [], photos: [] })
}

export async function loadGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>> {
  return isSupabaseConfigured() ? cachedGuestbookSnapshot() : createSnapshot({ guestbook: [] })
}

export async function loadCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>> {
  if (!isSupabaseConfigured()) return createSnapshot({ comments: [] })
  return unstable_cache(() => readCommentsSnapshot(slug), ['public-resource-comments', slug], { revalidate: 30 })()
}

export async function readInitialSnapshot<T>(loader: () => Promise<ServerSnapshot<T>>, fallback: string) {
  try {
    return { initialSnapshot: await loader(), initialError: '' }
  } catch (error) {
    return { initialSnapshot: null, initialError: error instanceof Error ? error.message : fallback }
  }
}
