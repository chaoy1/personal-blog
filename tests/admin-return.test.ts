import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { safeAdminNext } from '@/lib/admin-return'
import { middleware } from '@/middleware'

describe('safe admin return paths', () => {
  it('allows only local admin paths', () => {
    expect(safeAdminNext('/admin/photos?album=1')).toBe('/admin/photos?album=1')
    expect(safeAdminNext('https://evil.example/admin')).toBe('/admin')
    expect(safeAdminNext('//evil.example/admin')).toBe('/admin')
    expect(safeAdminNext('/posts/hello')).toBe('/admin')
    expect(safeAdminNext(null)).toBe('/admin')
  })

  it('preserves the requested admin path in the login redirect', () => {
    const response = middleware(new NextRequest('https://blog.example/admin/photos?album=1'))
    expect(response.headers.get('location')).toBe(
      'https://blog.example/admin/login?next=%2Fadmin%2Fphotos%3Falbum%3D1',
    )
  })

  it('sends an authenticated login visit to its safe destination', () => {
    const request = new NextRequest('https://blog.example/admin/login?next=%2Fadmin%2Fprofile', {
      headers: { cookie: 'blog_admin_session=1' },
    })
    expect(middleware(request).headers.get('location')).toBe('https://blog.example/admin/profile')
  })
})
