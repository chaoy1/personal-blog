import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { DeskPost } from '@/lib/admin-overview-types'

const mocks = vi.hoisted(() => ({ rows: [] as DeskPost[], failures: {} as Record<string, string>, counts: { moments: 1205, photos: 2801, albums: 4 } as Record<string, number | null>, range: vi.fn(), select: vi.fn(), isAdminRequest: vi.fn(() => true), supabaseAdmin: vi.fn() }))
vi.mock('@/lib/admin', () => ({ isAdminRequest: mocks.isAdminRequest }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mocks.supabaseAdmin }))
import { readAdminOverview } from '@/lib/admin-overview'
import { GET } from '@/app/api/admin/overview/route'

const row = (id: string, published = true, date = '2026-10-02T03:00:00Z', slug = id): DeskPost => ({ id, title: id, slug, excerpt: '小序', published, updated_at: date })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.rows = []; mocks.failures = {}; mocks.counts = { moments: 1205, photos: 2801, albums: 4 }; mocks.isAdminRequest.mockReturnValue(true)
  mocks.supabaseAdmin.mockImplementation(() => ({ from: (table: string) => {
    const error = mocks.failures[table] ? { message: mocks.failures[table] } : null
    const chain = { select: (fields: string, options?: object) => { mocks.select(table, fields, options); return options ? Promise.resolve({ count: mocks.counts[table], error }) : chain }, order: () => chain, eq: () => chain, range: async (start: number, end: number) => { mocks.range(start, end); return { data: mocks.rows.slice(start, end + 1), error } }, maybeSingle: async () => ({ data: null, error }) }
    return chain
  } }))
})

describe('admin overview read model', () => {
  it('reads beyond the row cap and excludes only actual trash slugs', async () => {
    mocks.rows = Array.from({ length: 1000 }, (_, n) => row(`p-${n}`, true, '2026-09-01T00:00:00Z'))
    mocks.rows.push(row('recent', true), row('legitimate', false, '2026-10-01T00:00:00Z', 'trashbin-not-an-archived-post'), row('trash', false, '2026-10-03T00:00:00Z', 'trashbin-1720000000000-old-slug'), row('older-draft', false, '2026-08-01T00:00:00Z'))
    const result = await readAdminOverview()
    expect(mocks.range.mock.calls).toEqual([[0, 999], [1000, 1999]])
    expect(result.articles).toMatchObject({ total: 1003, published: 1001, draft: 2, trash: 1 })
    expect(result.articles?.recent.map(p => p.id)).toEqual(['recent', 'legitimate', 'p-0', 'p-1', 'p-10', 'p-100'])
    expect(result.articles?.unfinished.map(p => p.id)).toEqual(['legitimate', 'older-draft'])
    expect(result.photos).toBe(2801); expect(result.moments).toBe(1205)
    expect(mocks.select).toHaveBeenCalledWith('photos', '*', { count: 'exact', head: true })
  })
  it('preserves available sources and marks missing totals unavailable', async () => {
    mocks.failures.posts = '文章读取失败'; mocks.counts.photos = null
    const result = await readAdminOverview()
    expect(result.articles).toBeNull(); expect(result.photos).toBeNull()
    expect(result.errors).toEqual({ articles: '文章读取失败', photos: '未能读取统计数量' })
    expect(result.moments).toBe(1205); expect(result.albums).toBe(4)
    expect(result.profile).toBeNull(); expect(result.errors.profile).toBeUndefined()
  })
  it('distinguishes a genuinely empty archive from failed reads', async () => {
    mocks.counts = { moments: 0, photos: 0, albums: 0 }
    const result = await readAdminOverview()
    expect(result.articles).toEqual({ total: 0, published: 0, draft: 0, trash: 0, recent: [], unfinished: [] })
    expect(result.errors).toEqual({}); expect(result.photos).toBe(0)
  })
  it('does not query private data without the admin guard', async () => {
    mocks.isAdminRequest.mockReturnValue(false)
    expect((await GET(new NextRequest('https://blog.test/api/admin/overview'))).status).toBe(401)
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled()
  })
  it('serves protected data with no shared cache', async () => {
    const response = await GET(new NextRequest('https://blog.test/api/admin/overview'))
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toMatchObject({ moments: 1205, photos: 2801 })
  })
})
