import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ResourcePrefetchLink from '@/components/ResourcePrefetchLink'
import { publicResourceCache } from '@/lib/public-resource-cache'

vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean | null }) => (
    <a href={href} data-prefetch={prefetch === undefined ? 'unset' : String(prefetch)} {...props}>{children}</a>
  ),
}))

describe('public route prefetch policy', () => {
  const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection')

  afterEach(() => {
    cleanup()
    publicResourceCache.invalidate('moments')
    publicResourceCache.invalidate('guestbook')
    publicResourceCache.invalidate('comments:alpha')
    if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection)
    else Reflect.deleteProperty(navigator, 'connection')
    vi.restoreAllMocks()
  })

  it('keeps fixed public route prefetch enabled on a normal connection without running a loader during render', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false, effectiveType: '4g' },
    })
    const loader = vi.fn(async () => [])

    render(
      <ResourcePrefetchLink href="/moments" prefetch resourceKey="moments" resourceLoader={loader}>
        闲语
      </ResourcePrefetchLink>,
    )

    expect(screen.getByRole('link', { name: '闲语' })).toHaveAttribute('data-prefetch', 'true')
    expect(loader).not.toHaveBeenCalled()
  })

  it('falls back to route-only prefetch on Save-Data and slow networks', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '2g' },
    })

    render(
      <ResourcePrefetchLink href="/guestbook" prefetch resourceKey="guestbook">
        留言
      </ResourcePrefetchLink>,
    )

    expect(screen.getByRole('link', { name: '留言' })).toHaveAttribute('data-prefetch', 'false')
  })

  it('preloads only the article slug receiving the first intent event', () => {
    const loader = vi.fn(async () => ({ comments: [] }))
    const preload = vi.spyOn(publicResourceCache, 'preload')

    render(
      <ResourcePrefetchLink
        href="/posts/alpha"
        resourceKey="comments:alpha"
        resourceLoader={loader}
        intentPrefetch
      >
        文章甲
      </ResourcePrefetchLink>,
    )

    const link = screen.getByRole('link', { name: '文章甲' })
    fireEvent.pointerEnter(link)
    fireEvent.focus(link)
    fireEvent.pointerDown(link)

    expect(preload).toHaveBeenCalledTimes(1)
    expect(preload.mock.calls[0][0]).toBe('comments:alpha')
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
