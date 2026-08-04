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

export async function listAllPhotos(limit = 1000): Promise<TimelinePhoto[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('photos')
    .select('id,url,caption,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取相册失败：${error.message}`)
  return data ?? []
}

export async function listAllMoments(limit = 1000): Promise<TimelineMoment[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('moments')
    .select('id,content,images,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取说说失败：${error.message}`)
  return data ?? []
}

export async function countMoments(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const { count, error } = await supabaseAdmin()
    .from('moments')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`统计说说失败：${error.message}`)
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
