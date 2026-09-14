import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  })
})
