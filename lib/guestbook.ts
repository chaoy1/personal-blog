import { isSupabaseConfigured, supabaseAdmin } from './supabase'

export type GuestbookMessage = {
  id: string
  content: string
  nickname: string | null
  created_at: string
}

export async function listLatestGuestbook(limit = 3): Promise<GuestbookMessage[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabaseAdmin()
    .from('guestbook')
    .select('id, content, created_at, profiles!guestbook_user_id_fkey(nickname)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`读取留言失败：${error.message}`)
  return (data ?? []).map((r: { id: string; content: string; created_at: string; profiles?: unknown }) => {
    const rel = r.profiles
    const nickname =
      Array.isArray(rel)
        ? (rel[0] as { nickname?: string | null } | undefined)?.nickname ?? null
        : (rel as { nickname?: string | null } | null)?.nickname ?? null
    return {
    id: r.id,
    content: r.content,
    nickname,
    created_at: r.created_at,
    }
  })
}

export async function countGuestbook(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const { count, error } = await supabaseAdmin()
    .from('guestbook')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`统计留言失败：${error.message}`)
  return count ?? 0
}
