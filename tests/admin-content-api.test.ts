import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const isAdminRequest = vi.fn(() => true)
  const update = vi.fn()
  const order = vi.fn()
  const builder = {
    update,
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    order,
    limit: vi.fn(),
  }
  builder.eq.mockReturnValue(builder)
  builder.select.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.update.mockImplementation(() => builder)
  builder.single.mockResolvedValue({ data: { id: 'saved' }, error: null })
  builder.limit.mockResolvedValue({ data: [], error: null })
  return {
    isAdminRequest,
    update,
    order,
    builder,
    supabaseAdmin: vi.fn(() => ({ from: vi.fn(() => builder) })),
  }
})

vi.mock('@/lib/admin', () => ({ isAdminRequest: mocks.isAdminRequest }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mocks.supabaseAdmin }))

import { PUT as updateMoment } from '@/app/api/admin/moments/[id]/route'
import { GET as listPhotos } from '@/app/api/admin/photos/route'
import { PATCH as updatePhoto } from '@/app/api/admin/photos/[id]/route'
import { PATCH as updateAlbum } from '@/app/api/admin/albums/[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isAdminRequest.mockReturnValue(true)
  mocks.builder.eq.mockReturnValue(mocks.builder)
  mocks.builder.select.mockReturnValue(mocks.builder)
  mocks.builder.order.mockReturnValue(mocks.builder)
  mocks.builder.update.mockImplementation(() => mocks.builder)
  mocks.builder.single.mockResolvedValue({ data: { id: 'saved' }, error: null })
  mocks.builder.limit.mockResolvedValue({ data: [], error: null })
})

describe('admin content update APIs', () => {
  it('trims and updates a moment while rejecting empty content', async () => {
    const empty = await updateMoment(
      new NextRequest('https://blog.test/api/admin/moments/1', {
        method: 'PUT',
        body: JSON.stringify({ content: '  ', images: [] }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(empty.status).toBe(400)

    const response = await updateMoment(
      new NextRequest('https://blog.test/api/admin/moments/1', {
        method: 'PUT',
        body: JSON.stringify({ content: '  留下此刻  ', images: ['/one.jpg', 2] }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ content: '留下此刻', images: ['/one.jpg'] })
  })

  it('updates photo metadata and validates integer ordering', async () => {
    const invalid = await updatePhoto(
      new NextRequest('https://blog.test/api/admin/photos/1', {
        method: 'PATCH',
        body: JSON.stringify({ sort_order: 1.5 }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(invalid.status).toBe(400)

    const response = await updatePhoto(
      new NextRequest('https://blog.test/api/admin/photos/1', {
        method: 'PATCH',
        body: JSON.stringify({ caption: '  山影  ', album_id: '', sort_order: 2 }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ caption: '山影', album_id: null, sort_order: 2 })
  })

  it('orders photo lists and validates album titles', async () => {
    await listPhotos(new NextRequest('https://blog.test/api/admin/photos'))
    expect(mocks.order).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true })
    expect(mocks.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false })

    const invalid = await updateAlbum(
      new NextRequest('https://blog.test/api/admin/albums/1', {
        method: 'PATCH',
        body: JSON.stringify({ title: '  ', description: 'x' }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(invalid.status).toBe(400)

    await updateAlbum(
      new NextRequest('https://blog.test/api/admin/albums/1', {
        method: 'PATCH',
        body: JSON.stringify({ title: '  江南  ', description: '  小记  ' }),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(mocks.update).toHaveBeenCalledWith({ title: '江南', description: '小记' })
  })

  it('requires admin authorization', async () => {
    mocks.isAdminRequest.mockReturnValue(false)
    const response = await updatePhoto(
      new NextRequest('https://blog.test/api/admin/photos/1', { method: 'PATCH', body: '{}' }),
      { params: Promise.resolve({ id: '1' }) },
    )
    expect(response.status).toBe(401)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
