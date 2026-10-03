import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  authorized: vi.fn(() => true),
  from: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  result: { data: null as unknown, error: null as { message: string } | null },
}))
vi.mock('@/lib/admin', () => ({ isAdminRequest: mocks.authorized }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: () => ({ from: mocks.from }) }))
vi.mock('@/lib/posts', () => ({
  listAllPosts: vi.fn(), createPost: vi.fn(), getPostById: vi.fn(), updatePost: vi.fn(),
  deletePost: vi.fn(), movePostToTrash: vi.fn(), restorePost: vi.fn(),
}))
vi.mock('@/lib/admin-overview', () => ({ readAdminOverview: vi.fn() }))

import * as albums from '@/app/api/admin/albums/route'
import * as album from '@/app/api/admin/albums/[id]/route'
import * as moments from '@/app/api/admin/moments/route'
import * as moment from '@/app/api/admin/moments/[id]/route'
import * as photos from '@/app/api/admin/photos/route'
import * as photo from '@/app/api/admin/photos/[id]/route'
import * as posts from '@/app/api/admin/posts/route'
import * as post from '@/app/api/admin/posts/[id]/route'
import * as profile from '@/app/api/admin/profile/route'
import * as overview from '@/app/api/admin/overview/route'
import * as upload from '@/app/api/admin/upload/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorized.mockReturnValue(true)
  mocks.result = { data: null, error: null }
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    delete: mocks.remove.mockImplementation(() => query),
    eq: mocks.eq.mockImplementation(() => query),
    then: (resolve: (value: typeof mocks.result) => unknown) => Promise.resolve(mocks.result).then(resolve),
  }
  mocks.from.mockReturnValue(query)
})

const protectedRoutes = [
  ['albums GET', albums.GET], ['albums POST', albums.POST],
  ['album PATCH', album.PATCH], ['album DELETE', album.DELETE],
  ['moments GET', moments.GET], ['moments POST', moments.POST],
  ['moment PUT', moment.PUT], ['moment DELETE', moment.DELETE],
  ['photos GET', photos.GET], ['photos POST', photos.POST],
  ['photo PATCH', photo.PATCH], ['photo DELETE', photo.DELETE],
  ['posts GET', posts.GET], ['posts POST', posts.POST],
  ['post GET', post.GET], ['post PUT', post.PUT], ['post PATCH', post.PATCH], ['post DELETE', post.DELETE],
  ['profile GET', profile.GET], ['profile POST', profile.POST], ['overview GET', overview.GET], ['upload POST', upload.POST],
] as const

describe('admin authorization and response contracts', () => {
  it.each(protectedRoutes)('guards %s before reading input or data', async (_name, handler) => {
    mocks.authorized.mockReturnValue(false)
    const request = new NextRequest('https://blog.test/api/admin/resource')
    const readJson = vi.spyOn(request, 'json')
    const readForm = vi.spyOn(request, 'formData')
    const response = await handler(request, { params: Promise.resolve({ id: 'record-1' }) })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: '未登录' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(readJson).not.toHaveBeenCalled()
    expect(readForm).not.toHaveBeenCalled()
  })

  it.each([
    ['albums', albums.GET], ['moments', moments.GET], ['photos', photos.GET],
  ] as const)('preserves empty %s lists and database failures', async (_table, handler) => {
    const request = new NextRequest('https://blog.test/api/admin/resource')
    const empty = await handler(request)
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual([])
    mocks.result = { data: [{ id: 'ignored' }], error: { message: '数据库暂时不可用' } }
    const failed = await handler(request)
    expect(failed.status).toBe(500)
    expect(await failed.json()).toEqual({ error: '数据库暂时不可用' })
  })

  it.each([
    ['albums', album.DELETE], ['moments', moment.DELETE], ['photos', photo.DELETE],
  ] as const)('deletes only the requested %s record and propagates failures', async (table, handler) => {
    const request = new NextRequest('https://blog.test/api/admin/resource/record-1', { method: 'DELETE' })
    const context = { params: Promise.resolve({ id: 'record-1' }) }
    const response = await handler(request, context)
    expect(mocks.from).toHaveBeenCalledWith(table)
    expect(mocks.eq).toHaveBeenCalledWith('id', 'record-1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    mocks.result.error = { message: '删除失败' }
    const failed = await handler(request, context)
    expect(failed.status).toBe(500)
    expect(await failed.json()).toEqual({ error: '删除失败' })
  })
})
