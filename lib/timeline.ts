import { isSupabaseConfigured, supabaseAdmin } from './supabase'

export type TimelinePhoto = {
  id: string
  url: string
  caption: string
  created_at: string
}

export type TimelineMoment = {
  id: string
  content: string
  images: string[]
  created_at: string
}

export type HomeAlbumPreview = {
  id: string
  title: string
  description: string
  cover_url: string
  created_at: string
  photoCount: number
  photos: { id: string; url: string; caption: string }[]
}

export async function listRecentAlbumPreviews(limit = 3): Promise<HomeAlbumPreview[]> {
  if (!isSupabaseConfigured()) return []
  const sb = supabaseAdmin()
  const albumsResult = await sb
    .from('albums')
    .select('id,title,description,cover_url,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (albumsResult.error) throw new Error(`读取最近相册失败：${albumsResult.error.message}`)

  return Promise.all((albumsResult.data ?? []).map(async (album) => {
    const photosResult = await sb
      .from('photos')
      .select('id,url,caption', { count: 'exact' })
      .eq('album_id', album.id)
      .order('created_at', { ascending: false })
      .limit(3)
    if (photosResult.error) throw new Error(`读取相册照片失败：${photosResult.error.message}`)
    return {
      ...album,
      photoCount: photosResult.count ?? photosResult.data?.length ?? 0,
      photos: photosResult.data ?? [],
    }
  }))
}

export async function listAllPhotos(limit = 1000): Promise<TimelinePhoto[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('photos')
    .select('id,url,caption,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取光影失败：${error.message}`)
  return data ?? []
}

export async function listAllMoments(limit = 1000): Promise<TimelineMoment[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('moments')
    .select('id,content,images,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取闲语失败：${error.message}`)
  return data ?? []
}

export async function countMoments(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const { count, error } = await supabaseAdmin()
    .from('moments')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`统计闲语失败：${error.message}`)
  return count ?? 0
}

export async function countPhotos(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const { count, error } = await supabaseAdmin()
    .from('photos')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`统计照片失败：${error.message}`)
  return count ?? 0
}
