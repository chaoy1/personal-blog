import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ guard: vi.fn(() => true), read: vi.fn(), upsert: vi.fn() }))
vi.mock('@/lib/admin', () => ({ isAdminRequest: mocks.guard }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }), upsert: mocks.upsert }) }) }))
import { GET, POST } from '@/app/api/admin/profile/route'
beforeEach(() => { vi.clearAllMocks(); mocks.guard.mockReturnValue(true); mocks.read.mockResolvedValue({ data: { id: 'owner-1', nickname: '旅人' }, error: null }); mocks.upsert.mockResolvedValue({ error: null }) })
describe('owner Markdown persistence', () => {
  it('keeps Markdown whitespace and code fences intact in storage', async () => {
    const bio = '## 自序\n\n```js\n  const x = 1\n```\n\n- 山路\n- 光影\n'
    const response = await POST(new NextRequest('https://blog.test/api/admin/profile', { method: 'POST', body: JSON.stringify({ nickname: '  旅人  ', bio, avatar_url: '/portrait.jpg' }) }))
    expect(response.status).toBe(200); expect(mocks.upsert).toHaveBeenCalledWith({ id: 'owner-1', nickname: '旅人', bio, avatar_url: '/portrait.jpg', role: 'owner' })
  })
  it('does not mistake a failed lookup for a missing owner account', async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: 'database temporarily unavailable' } })
    expect((await GET(new NextRequest('https://blog.test/api/admin/profile'))).status).toBe(500)
    expect((await POST(new NextRequest('https://blog.test/api/admin/profile', { method: 'POST', body: JSON.stringify({ bio: '# 自序' }) }))).status).toBe(500)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('guards profile reads and writes before accessing the database', async () => {
    mocks.guard.mockReturnValue(false)
    expect((await GET(new NextRequest('https://blog.test/api/admin/profile'))).status).toBe(401)
    expect((await POST(new NextRequest('https://blog.test/api/admin/profile', { method: 'POST' }))).status).toBe(401)
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
