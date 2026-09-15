import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getShellKind } from '@/components/AppShell'

const queryLog = vi.hoisted(() => [] as Array<{ table: string; filters: Array<[string, unknown]> }>)

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    ready: true,
    error: '',
    user: { id: 'user-1' },
    profile: { id: 'user-1', nickname: '旅人', avatar_url: '', role: 'owner', bio: '' },
    isOwner: true,
  }),
}))

vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: () => ({
    from: (table: string) => {
      const entry = { table, filters: [] as Array<[string, unknown]> }
      queryLog.push(entry)
      const query: Record<string, (...args: never[]) => unknown> = {
        select: () => query,
        eq: (column, value) => {
          entry.filters.push([String(column), value])
          return query
        },
        order: () => query,
        limit: async () => ({ data: [], error: null }),
        insert: () => query,
        update: () => query,
        delete: () => query,
        match: () => query,
        single: async () => ({ data: null, error: null }),
      }
      return query
    },
  }),
}))

import { CommentsProvider, useComments } from '@/lib/comments-context'

function CommentsProbe() {
  const { ready, comments } = useComments()
  return <output data-testid="comments-state">{JSON.stringify({ ready, count: comments.length })}</output>
}

describe('route-scoped resource boundaries', () => {
  afterEach(() => {
    cleanup()
    queryLog.length = 0
  })

  it('queries only the current post comments', async () => {
    render(
      <CommentsProvider slug="alpha">
        <CommentsProbe />
      </CommentsProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('comments-state')).toHaveTextContent('"ready":true'))
    expect(queryLog).toEqual([
      {
        table: 'comments',
        filters: [['post_slug', 'alpha']],
      },
    ])
  })

  it('mounts resource providers at their route boundaries', () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
    expect(read('app/moments/layout.tsx')).toContain('MomentsProvider')
    expect(read('app/album/layout.tsx')).toContain('AlbumsProvider')
    expect(read('app/guestbook/layout.tsx')).toContain('GuestbookProvider')
    expect(read('app/posts/[slug]/layout.tsx')).toContain('CommentsProvider')
    expect(read('lib/app-store.tsx')).toContain('export function AppStoreProvider')
    expect(read('lib/app-store.tsx')).toContain('export function useAppStore')
  })

  it('keeps server snapshots and browser revalidation loaders in separate modules', () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
    const serverLoader = read('lib/public-resource-loaders.server.ts')
    const browserLoader = read('lib/public-resource-loaders.browser.ts')

    expect(serverLoader).toContain("import 'server-only'")
    expect(serverLoader).toContain('loadMomentsSnapshot')
    expect(serverLoader).toContain('loadAlbumsSnapshot')
    expect(serverLoader).toContain('loadGuestbookSnapshot')
    expect(serverLoader).toContain('loadCommentsSnapshot')
    expect(serverLoader).toContain('revalidate: 60')
    expect(serverLoader).toContain('revalidate: 30')
    expect(serverLoader).toContain('revalidate: 300')
    expect(browserLoader).toContain('loadMoments')
    expect(browserLoader).toContain('loadAlbums')
    expect(browserLoader).toContain('loadGuestbook')
    expect(browserLoader).toContain('loadComments')
    expect(browserLoader).not.toContain("import 'server-only'")
  })

  it('keeps every target route in one explicit shell category', () => {
    expect(getShellKind('/')).toBe('public')
    expect(getShellKind('/posts')).toBe('public')
    expect(getShellKind('/moments')).toBe('public')
    expect(getShellKind('/album')).toBe('public')
    expect(getShellKind('/timeline')).toBe('public')
    expect(getShellKind('/guestbook')).toBe('public')
    expect(getShellKind('/about')).toBe('public')
    expect(getShellKind('/posts/phase-two')).toBe('public')
    expect(getShellKind('/login')).toBe('auth')
    expect(getShellKind('/account')).toBe('auth')
    expect(getShellKind('/admin')).toBe('admin')
    expect(getShellKind('/admin/editor')).toBe('admin')
  })
})
