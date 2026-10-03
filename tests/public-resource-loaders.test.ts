import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  browser: vi.fn(),
  admin: vi.fn(),
  configured: vi.fn(() => true),
  cache: vi.fn((read: (...args: never[]) => unknown, _keys: string[], _options: object) => read),
}))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: mocks.cache }))
vi.mock('@/lib/supabase-browser', () => ({ supabaseBrowser: mocks.browser }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mocks.admin, isSupabaseConfigured: mocks.configured }))

import * as browser from '@/lib/public-resource-loaders.browser'
import * as server from '@/lib/public-resource-loaders.server'

type Result = { data: unknown; error: { message: string } | null }
let results: Record<string, Result>
let calls: Array<[string, string, ...unknown[]]>

function client() {
  return {
    from(table: string) {
      calls.push([table, 'from'])
      const query = {
        select: (...args: unknown[]) => record('select', args),
        eq: (...args: unknown[]) => record('eq', args),
        in: (...args: unknown[]) => record('in', args),
        order: (...args: unknown[]) => record('order', args),
        limit: (...args: unknown[]) => record('limit', args),
        then: (resolve: (result: Result) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(results[table] ?? { data: null, error: null }).then(resolve, reject),
      }
      function record(method: string, args: unknown[]) {
        calls.push([table, method, ...args])
        return query
      }
      return query
    },
  }
}

beforeEach(() => {
  calls = []
  results = {}
  mocks.browser.mockClear().mockImplementation(client)
  mocks.admin.mockClear().mockImplementation(client)
  mocks.configured.mockReturnValue(true)
})

describe('public data query contracts', () => {
  it('keeps server/client moments identical, including joins, related filters and limits', async () => {
    results = {
      moments: { data: [{ id: 'moment-1', content: '此刻' }], error: null },
      moment_comments: { data: [{ id: 'reply-1' }], error: null },
      moment_likes: { data: [{ moment_id: 'moment-1', user_id: 'visitor' }], error: null },
    }
    const data = await browser.loadMoments()
    const browserCalls = [...calls]
    calls = []
    expect((await server.loadMomentsSnapshot()).data).toEqual(data)
    expect(calls).toEqual(browserCalls)
    expect(calls).toContainEqual(['moments', 'order', 'created_at', { ascending: false }])
    expect(calls).toContainEqual(['moments', 'limit', 200])
    expect(calls).toContainEqual(['moment_comments', 'in', 'moment_id', ['moment-1']])
    expect(calls).toContainEqual(['moment_comments', 'limit', 2000])
    expect(calls).toContainEqual(['moment_likes', 'limit', 5000])
  })

  it('does not fetch related records when there are no moments', async () => {
    expect(await browser.loadMoments()).toEqual({ moments: [], momentComments: [], momentLikes: [] })
    expect(calls.filter(([, method]) => method === 'from')).toEqual([['moments', 'from']])
  })

  it('keeps albums and photos in descending creation order', async () => {
    results.albums = { data: [{ id: 'album-1' }], error: null }
    results.photos = { data: [{ id: 'photo-1' }], error: null }
    const data = await browser.loadAlbums()
    const browserCalls = [...calls]
    calls = []
    expect((await server.loadAlbumsSnapshot()).data).toEqual(data)
    expect(calls).toEqual(browserCalls)
    expect(calls).toContainEqual(['photos', 'limit', 2000])
  })

  it('retains guestbook joins, ordering and row cap in both entry points', async () => {
    const data = await browser.loadGuestbook()
    const browserCalls = [...calls]
    calls = []
    expect((await server.loadGuestbookSnapshot()).data).toEqual(data)
    expect(calls).toEqual(browserCalls)
    expect(calls).toContainEqual(['guestbook', 'select', '*, profiles!guestbook_user_id_fkey(nickname, avatar_url)'])
    expect(calls).toContainEqual(['guestbook', 'limit', 1000])
  })

  it('filters comments for the requested article while retaining the unscoped browser query', async () => {
    results.comments = { data: [{ id: 'comment-1' }], error: null }
    const data = await browser.loadComments('山中小记')
    const browserCalls = [...calls]
    calls = []
    expect((await server.loadCommentsSnapshot('山中小记')).data).toEqual(data)
    expect(calls).toEqual(browserCalls)
    expect(calls).toContainEqual(['comments', 'eq', 'post_slug', '山中小记'])
    expect(calls).toContainEqual(['comments', 'order', 'created_at', { ascending: true }])
    expect(calls).toContainEqual(['comments', 'limit', 3000])
    calls = []
    await browser.loadComments()
    expect(calls.some(([, method]) => method === 'eq')).toBe(false)
    calls = []
    await browser.loadComments('')
    expect(calls.some(([, method]) => method === 'eq')).toBe(false)
    calls = []
    await server.loadCommentsSnapshot('')
    expect(calls).toContainEqual(['comments', 'eq', 'post_slug', ''])
  })

  it.each([
    ['moments', '读取闲语失败', browser.loadMoments, server.loadMomentsSnapshot],
    ['albums', '读取相册失败', browser.loadAlbums, server.loadAlbumsSnapshot],
    ['guestbook', '读取留言失败', browser.loadGuestbook, server.loadGuestbookSnapshot],
    ['comments', '读取评论失败', () => browser.loadComments('post'), () => server.loadCommentsSnapshot('post')],
  ] as const)('preserves %s query errors in both environments', async (table, prefix, load, snapshot) => {
    results[table] = { data: null, error: { message: '暂时不可用' } }
    await expect(load()).rejects.toThrow(`${prefix}：暂时不可用`)
    await expect(snapshot()).rejects.toThrow(`${prefix}：暂时不可用`)
  })

  it('retains the service-side cache keys and lifetimes', async () => {
    await server.loadCommentsSnapshot('post')
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ['public-resource-moments'], { revalidate: 60 })
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ['public-resource-albums'], { revalidate: 300 })
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ['public-resource-guestbook'], { revalidate: 30 })
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ['public-resource-comments', 'post'], { revalidate: 30 })
  })

  it('returns timestamped empty snapshots without touching admin data when unconfigured', async () => {
    mocks.configured.mockReturnValue(false)
    const snapshot = await server.loadMomentsSnapshot()
    expect(snapshot.data).toEqual({ moments: [], momentComments: [], momentLikes: [] })
    expect(snapshot.generatedAt).toBeGreaterThan(0)
    expect((await server.loadAlbumsSnapshot()).data).toEqual({ albums: [], photos: [] })
    expect((await server.loadGuestbookSnapshot()).data).toEqual({ guestbook: [] })
    expect((await server.loadCommentsSnapshot('post')).data).toEqual({ comments: [] })
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.browser).not.toHaveBeenCalled()
  })

  it('keeps initial page data and preserves original or fallback load errors', async () => {
    const snapshot = { data: { comments: [] }, generatedAt: 123 }
    expect(await server.readInitialSnapshot(async () => snapshot, '读取评论失败'))
      .toEqual({ initialSnapshot: snapshot, initialError: '' })
    expect(await server.readInitialSnapshot(async () => { throw new Error('网络不可用') }, '读取评论失败'))
      .toEqual({ initialSnapshot: null, initialError: '网络不可用' })
    expect(await server.readInitialSnapshot(async () => { throw 'offline' }, '读取评论失败'))
      .toEqual({ initialSnapshot: null, initialError: '读取评论失败' })
  })
})
