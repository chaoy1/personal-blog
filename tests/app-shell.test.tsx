import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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

  it('keeps public ambient layers only on public routes', () => {
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
