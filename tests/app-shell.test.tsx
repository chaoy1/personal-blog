import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pathnameState = vi.hoisted(() => ({ value: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameState.value,
}))

vi.mock('@/components/BackgroundStage', () => ({ default: () => <div data-testid="background-stage" /> }))
vi.mock('@/components/ScrollTop', () => ({ default: () => <div data-testid="scroll-top" /> }))
vi.mock('@/components/SiteNav', () => ({ default: () => <div data-testid="site-nav" /> }))
vi.mock('@/components/Lightbox', () => ({ default: () => <div data-testid="lightbox" /> }))

import AppShell, { getShellKind } from '@/components/AppShell'

describe('AppShell route boundaries', () => {
  afterEach(() => {
    cleanup()
    pathnameState.value = '/'
  })

  it('classifies public, auth, and admin routes explicitly', () => {
    expect(getShellKind('/')).toBe('public')
    expect(getShellKind('/posts/example')).toBe('public')
    expect(getShellKind('/login')).toBe('auth')
    expect(getShellKind('/account')).toBe('auth')
    expect(getShellKind('/account/settings')).toBe('auth')
    expect(getShellKind('/admin')).toBe('admin')
    expect(getShellKind('/admin/posts')).toBe('admin')
  })

  it('covers the Phase 2 route matrix and removes the legacy root provider', () => {
    const matrix: Record<'public' | 'auth' | 'admin', string[]> = {
      public: ['/', '/posts', '/moments', '/album', '/timeline', '/guestbook', '/about', '/posts/example'],
      auth: ['/login', '/account'],
      admin: ['/admin', '/admin/editor'],
    }
    for (const [kind, routes] of Object.entries(matrix)) {
      for (const route of routes) expect(getShellKind(route)).toBe(kind)
    }

    const rootLayout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8')
    expect(rootLayout).not.toContain('AppStoreProvider')
    expect(rootLayout).toContain('AuthProvider')
    expect(rootLayout).toContain('AppShell')
  })

  it('restores public ambient layers for both login routes', () => {
    const { rerender } = render(
      <AppShell>
        <main data-testid="content">content</main>
      </AppShell>,
    )

    expect(screen.getByTestId('background-stage')).toBeInTheDocument()
    expect(screen.getByTestId('scroll-top')).toBeInTheDocument()
    expect(screen.getByTestId('site-nav')).toBeInTheDocument()
    expect(screen.getByTestId('lightbox')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()

    pathnameState.value = '/login'
    rerender(<AppShell><main data-testid="content">content</main></AppShell>)

    expect(screen.getByTestId('background-stage')).toBeInTheDocument()
    expect(screen.getByTestId('site-nav')).toBeInTheDocument()

    pathnameState.value = '/admin/login'
    rerender(<AppShell><main data-testid="content">content</main></AppShell>)

    expect(screen.getByTestId('background-stage')).toBeInTheDocument()
    expect(screen.getByTestId('site-nav')).toBeInTheDocument()

    pathnameState.value = '/account'
    rerender(<AppShell><main data-testid="content">content</main></AppShell>)

    expect(screen.queryByTestId('background-stage')).not.toBeInTheDocument()
    expect(screen.queryByTestId('scroll-top')).not.toBeInTheDocument()
    expect(screen.getByTestId('site-nav')).toBeInTheDocument()
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument()

    pathnameState.value = '/admin/posts'
    rerender(<AppShell><main data-testid="content">content</main></AppShell>)

    expect(screen.queryByTestId('background-stage')).not.toBeInTheDocument()
    expect(screen.queryByTestId('site-nav')).not.toBeInTheDocument()
  })
})
