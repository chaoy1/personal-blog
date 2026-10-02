import { supabaseAdmin } from './supabase'
import { isTrashedPostSlug } from './posts'
import type { AdminOverviewData, DeskPost, OverviewSource } from './admin-overview-types'

// Read narrow rows in pages so the Supabase row cap does not become a false total.
async function articles(): Promise<NonNullable<AdminOverviewData['articles']>> {
  const rows: DeskPost[] = []
  const db = supabaseAdmin()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('posts')
      .select('id,title,slug,excerpt,published,updated_at')
      .order('updated_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 999)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as DeskPost[]
    rows.push(...batch)
    if (batch.length < 1000) break
  }
  const active = rows.filter(p => !isTrashedPostSlug(p.slug))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
  const drafts = active.filter(p => !p.published)
  return { total: active.length, published: active.length - drafts.length, draft: drafts.length, trash: rows.length - active.length, recent: active.slice(0, 6), unfinished: drafts.slice(0, 2) }
}
async function count(table: 'moments' | 'photos' | 'albums'): Promise<number> {
  const { count: value, error } = await supabaseAdmin().from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  if (value === null) throw new Error('未能读取统计数量')
  return value
}
async function profile(): Promise<AdminOverviewData['profile']> {
  const { data, error } = await supabaseAdmin().from('profiles').select('nickname,avatar_url,bio').eq('role', 'owner').maybeSingle()
  if (error) throw new Error(error.message)
  return data
}
export async function readAdminOverview(): Promise<AdminOverviewData> {
  const sources: OverviewSource[] = ['articles', 'moments', 'photos', 'albums', 'profile']
  const results = await Promise.allSettled([articles(), count('moments'), count('photos'), count('albums'), profile()])
  const result: AdminOverviewData = { articles: null, moments: null, photos: null, albums: null, profile: null, errors: {}, generatedAt: new Date().toISOString() }
  results.forEach((value, i) => {
    if (value.status === 'rejected') result.errors[sources[i]] = value.reason instanceof Error ? value.reason.message : '读取失败'
  })
  if (results[0].status === 'fulfilled') result.articles = results[0].value as AdminOverviewData['articles']
  for (const [i, key] of [[1, 'moments'], [2, 'photos'], [3, 'albums']] as const) if (results[i].status === 'fulfilled') result[key] = results[i].value as number
  if (results[4].status === 'fulfilled') result.profile = results[4].value as AdminOverviewData['profile']
  return result
}
