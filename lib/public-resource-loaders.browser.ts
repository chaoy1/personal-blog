import { supabaseBrowser } from '@/lib/supabase-browser'
import { readMoments, readAlbums, readGuestbook, readComments } from '@/lib/public-resource-queries'

export async function loadMoments() {
  return readMoments(supabaseBrowser())
}

export async function loadAlbums() {
  return readAlbums(supabaseBrowser())
}

export async function loadGuestbook() {
  return readGuestbook(supabaseBrowser())
}

export async function loadComments(slug?: string) {
  return readComments(supabaseBrowser(), slug || undefined)
}
