import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdminRequest: vi.fn(() => true),
  updatePost: vi.fn(),
}))

vi.mock('@/lib/admin', () => ({ isAdminRequest: mocks.isAdminRequest }))
vi.mock('@/lib/posts', () => ({
  getPostById: vi.fn(),
  updatePost: mocks.updatePost,
  deletePost: vi.fn(),
  movePostToTrash: vi.fn(),
  restorePost: vi.fn(),
}))

import { PUT } from '@/app/api/admin/posts/[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isAdminRequest.mockReturnValue(true)
})

describe('admin post conflict response', () => {
  it('returns 409 for an optimistic concurrency conflict', async () => {
    mocks.updatePost.mockRejectedValue(new Error('文章已在其他位置更新，请刷新后比较版本'))

    const response = await PUT(
      new NextRequest('https://blog.test/api/admin/posts/post-1', {
        method: 'PUT',
        body: JSON.stringify({ title: '新标题', expectedUpdatedAt: 'old' }),
      }),
      { params: Promise.resolve({ id: 'post-1' }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: '文章已在其他位置更新，请刷新后比较版本',
    })
  })

  it('still requires admin authorization', async () => {
    mocks.isAdminRequest.mockReturnValue(false)
    const response = await PUT(
      new NextRequest('https://blog.test/api/admin/posts/post-1', { method: 'PUT' }),
      { params: Promise.resolve({ id: 'post-1' }) },
    )
    expect(response.status).toBe(401)
    expect(mocks.updatePost).not.toHaveBeenCalled()
  })
})
