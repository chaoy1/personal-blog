import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))

import SearchPalette from '@/components/SearchPalette'

function renderSearchPalette() {
  render(
    <>
      <button type="button">先前焦点</button>
      <SearchPalette />
    </>,
  )
}

describe('SearchPalette modal focus management', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    document.body.style.overflow = ''
  })

  it('wraps Shift+Tab and Tab within the search dialog', async () => {
    renderSearchPalette()
    const trigger = screen.getByRole('button', { name: '搜索文章与页面' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: '寻迹' })
    const input = within(dialog).getByLabelText('寻一篇旧文，或去往一处')
    await waitFor(() => expect(input).toHaveFocus())
    const options = within(dialog).getAllByRole('option')
    const lastOption = options[options.length - 1]

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(lastOption).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(input).toHaveFocus()
  })

  it('restores the trigger after Escape closes the dialog', async () => {
    renderSearchPalette()
    const trigger = screen.getByRole('button', { name: '搜索文章与页面' })
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByLabelText('寻一篇旧文，或去往一处')).toHaveFocus())

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '寻迹' })).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('restores the trigger after a background click closes the dialog', async () => {
    renderSearchPalette()
    const trigger = screen.getByRole('button', { name: '搜索文章与页面' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: '寻迹' })

    fireEvent.mouseDown(dialog.parentElement!)

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '寻迹' })).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('restores the previously focused element after Ctrl+K opens the dialog', async () => {
    renderSearchPalette()
    const previous = screen.getByRole('button', { name: '先前焦点' })
    previous.focus()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    await waitFor(() => expect(screen.getByLabelText('寻一篇旧文，或去往一处')).toHaveFocus())
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(previous).toHaveFocus())
  })
})
