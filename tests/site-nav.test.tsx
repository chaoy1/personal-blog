import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/app-store', () => ({
  useAppStore: () => ({ user: null, profile: null, signOut: vi.fn() }),
}))

vi.mock('@/components/SearchPalette', () => ({ default: () => null }))
vi.mock('@/components/ThemeToggle', () => ({ default: () => null }))

import SiteNav from '@/components/SiteNav'

describe('SiteNav mobile menu', () => {
  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('focuses the first menu link after opening', async () => {
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: '展开导航' }))

    const panel = document.getElementById('mobile-site-menu')!
    await waitFor(() => {
      expect(within(panel).getByRole('link', { name: /首页/ })).toHaveFocus()
    })
  })

  it('cycles Tab focus within the mobile menu', async () => {
    render(<SiteNav />)
    fireEvent.click(screen.getByRole('button', { name: '展开导航' }))

    const panel = document.getElementById('mobile-site-menu')!
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
    const firstLink = within(panel).getAllByRole('link')[0]
    const lastControl = focusable[focusable.length - 1]

    await waitFor(() => expect(firstLink).toHaveFocus())
    lastControl.focus()
    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(firstLink).toHaveFocus()

    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true })
    expect(lastControl).toHaveFocus()
  })

  it('keeps a working language switch inside the mobile menu', async () => {
    render(<SiteNav />)
    fireEvent.click(screen.getByRole('button', { name: '展开导航' }))

    const panel = document.getElementById('mobile-site-menu')!
    await waitFor(() => {
      expect(within(panel).getByRole('button', { name: /切换到(?:繁体|简体)/ })).toBeInTheDocument()
    })
  })

  it('marks the current page in both desktop and mobile navigation', async () => {
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: '展开导航' }))

    const desktopLink = document.querySelector<HTMLAnchorElement>('.nav-links a[href="/"]')
    const panel = document.getElementById('mobile-site-menu')!
    const mobileLink = within(panel).getByRole('link', { name: /首页/ })

    expect(desktopLink).toHaveAttribute('aria-current', 'page')
    expect(mobileLink).toHaveAttribute('aria-current', 'page')
  })

  it('closes with Escape and restores toggle focus', async () => {
    render(<SiteNav />)
    const toggle = screen.getByRole('button', { name: '展开导航' })
    fireEvent.click(toggle)

    await waitFor(() => expect(screen.getByRole('button', { name: '收起导航' })).toBeInTheDocument())
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '展开导航' })).toHaveFocus()
    })
  })
})
