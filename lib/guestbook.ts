import { isSupabaseConfigured, supabaseAdmin } from './supabase'

export type GuestbookRow = {
  id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export async function listRecentGuestbook(limit = 6): Promise<GuestbookRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('guestbook')
    .select('*, profiles!guestbook_user_id_fkey(nickname, avatar_url)')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取留言失败：${error.message}`)
  return (data ?? []) as unknown as GuestbookRow[]
}
