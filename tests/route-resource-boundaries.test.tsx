import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getShellKind } from '@/components/AppShell'
import { PublicResourceCacheProvider, createPublicResourceStore } from '@/lib/public-resource-cache'

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
import { MomentsProvider, useMoments } from '@/lib/moments-context'
import { AlbumsProvider, useAlbums } from '@/lib/albums-context'
import { GuestbookProvider, useGuestbook } from '@/lib/guestbook-context'

function CommentsProbe() {
  const { ready, comments, hasData, isInitialLoading } = useComments()
  return <output data-testid="comments-state">{JSON.stringify({ ready, count: comments.length, hasData, isInitialLoading })}</output>
}

function MomentsProbe() {
  const { ready, moments, hasData, isInitialLoading } = useMoments()
  return <output data-testid="moments-state">{JSON.stringify({ ready, count: moments.length, hasData, isInitialLoading })}</output>
}

function AlbumGuestbookProbe() {
  const albums = useAlbums()
  const guestbook = useGuestbook()
  return (
    <output data-testid="album-guestbook-state">
      {JSON.stringify({ albums: albums.albums.length, photos: albums.photos.length, guestbook: guestbook.guestbook.length })}
    </output>
  )
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

  it('uses an initial moments snapshot without starting a browser request', () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    render(
      <PublicResourceCacheProvider store={store}>
        <MomentsProvider
          initialSnapshot={{
            generatedAt: 900,
            data: {
              moments: [{
                id: 'moment-1',
                user_id: 'user-1',
                content: '一段闲语',
                images: [],
                created_at: '2026-09-15T00:00:00.000Z',
                profiles: null,
              }],
              momentComments: [],
              momentLikes: [],
            },
          }}
        >
          <MomentsProbe />
        </MomentsProvider>
      </PublicResourceCacheProvider>,
    )

    expect(screen.getByTestId('moments-state')).toHaveTextContent('"count":1')
    expect(screen.getByTestId('moments-state')).toHaveTextContent('"hasData":true')
    expect(screen.getByTestId('moments-state')).toHaveTextContent('"isInitialLoading":false')
    expect(queryLog).toEqual([])
  })

  it('uses album and guestbook snapshots without starting browser requests', () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    render(
      <PublicResourceCacheProvider store={store}>
        <AlbumsProvider
          initialSnapshot={{
            generatedAt: 900,
            data: {
              albums: [{ id: 'album-1', user_id: 'user-1', title: '山行', description: '', cover_url: '', created_at: '2026-09-15' }],
              photos: [{ id: 'photo-1', user_id: 'user-1', url: '/photo.jpg', caption: '', album_id: 'album-1', created_at: '2026-09-15' }],
            },
          }}
        >
          <GuestbookProvider
            initialSnapshot={{
              generatedAt: 900,
              data: {
                guestbook: [{ id: 'note-1', user_id: 'user-2', content: '你好', parent_id: null, created_at: '2026-09-15', profiles: null }],
              },
            }}
          >
            <AlbumGuestbookProbe />
          </GuestbookProvider>
        </AlbumsProvider>
      </PublicResourceCacheProvider>,
    )

    expect(screen.getByTestId('album-guestbook-state')).toHaveTextContent('"albums":1')
    expect(screen.getByTestId('album-guestbook-state')).toHaveTextContent('"photos":1')
    expect(screen.getByTestId('album-guestbook-state')).toHaveTextContent('"guestbook":1')
    expect(queryLog).toEqual([])
  })

  it('uses the initial snapshot for one comment slug without a browser request', () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    render(
      <PublicResourceCacheProvider store={store}>
        <CommentsProvider
          slug="beta"
          initialSnapshot={{
            generatedAt: 900,
            data: {
              comments: [{
                id: 'comment-1',
                post_slug: 'beta',
                user_id: 'user-2',
                parent_id: null,
                content: '首条评论',
                created_at: '2026-09-15',
                profiles: null,
              }],
            },
          }}
        >
          <CommentsProbe />
        </CommentsProvider>
      </PublicResourceCacheProvider>,
    )

    expect(screen.getByTestId('comments-state')).toHaveTextContent('"count":1')
    expect(screen.getByTestId('comments-state')).toHaveTextContent('"hasData":true')
    expect(screen.getByTestId('comments-state')).toHaveTextContent('"isInitialLoading":false')
    expect(queryLog).toEqual([])
  })

  it('defers a moments preload while the document is hidden until visibility is restored', async () => {
    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    const store = createPublicResourceStore({ now: () => 1000 })

    render(
      <PublicResourceCacheProvider store={store}>
        <MomentsProvider><MomentsProbe /></MomentsProvider>
      </PublicResourceCacheProvider>,
    )
    expect(queryLog).toEqual([])

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(queryLog.some((entry) => entry.table === 'moments')).toBe(true))

    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility)
    else Reflect.deleteProperty(document, 'visibilityState')
  })

  it('mounts resource providers at their route boundaries', () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
    expect(read('app/moments/layout.tsx')).toContain('MomentsProvider')
    expect(read('app/album/layout.tsx')).toContain('AlbumsProvider')
    expect(read('app/guestbook/layout.tsx')).toContain('GuestbookProvider')
    expect(read('app/posts/[slug]/layout.tsx')).toContain('CommentsProvider')
    expect(read('app/layout.tsx')).toContain('PublicResourceCacheProvider')
    expect(read('app/layout.tsx')).not.toContain('AppStoreProvider')
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
