import { describe, expect, it, vi } from 'vitest'
import { AdminActionError, runAdminAction } from '@/lib/admin-action'

describe('runAdminAction', () => {
  it('returns the parsed JSON payload from a successful response', async () => {
    const result = await runAdminAction<{ id: string }>(
      Promise.resolve(new Response(JSON.stringify({ id: 'post-1' }), { status: 200 })),
    )

    expect(result).toEqual({ id: 'post-1' })
  })

  it('throws the JSON error message with its HTTP status', async () => {
    const request = runAdminAction(
      Promise.resolve(new Response(JSON.stringify({ error: '保存失败' }), { status: 422 })),
    )

    await expect(request).rejects.toMatchObject({
      name: 'AdminActionError',
      status: 422,
      message: '保存失败',
    } satisfies Partial<AdminActionError>)
  })

  it('notifies the caller about an unauthorized response before throwing its message', async () => {
    const onUnauthorized = vi.fn()
    const request = runAdminAction(
      Promise.resolve(new Response(JSON.stringify({ error: '登录已过期' }), { status: 401 })),
      { onUnauthorized },
    )

    await expect(request).rejects.toMatchObject({
      name: 'AdminActionError',
      status: 401,
      message: '登录已过期',
    } satisfies Partial<AdminActionError>)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
