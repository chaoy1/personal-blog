import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollFX from '@/components/ScrollFX'
import { supportsFinePointer } from '@/components/useAmbientMotion'

function setInactiveMotion() {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'hidden',
  })
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: false },
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('ScrollFX inactive motion policy', () => {
  afterEach(() => {
    cleanup()
    document.documentElement.classList.remove('motion-static')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps nav scroll state synchronized while ambient motion is inactive', () => {
    setInactiveMotion()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 24 })
    const { container } = render(
      <>
        <nav className="site-nav" />
        <ScrollFX />
      </>
    )

    act(() => fireEvent.scroll(window))

    expect(container.querySelector('.site-nav')).toHaveClass('nav-scrolled')
  })

  it('uses a static CSS fallback without observing inactive content', () => {
    setInactiveMotion()
    const mutationObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }))
    vi.stubGlobal('MutationObserver', mutationObserver)
    const { container } = render(
      <>
        <div className="item" />
        <ScrollFX />
      </>
    )

    const inserted = document.createElement('div')
    inserted.className = 'reveal'
    container.append(inserted)

    expect(mutationObserver).not.toHaveBeenCalled()
    expect(document.documentElement).toHaveClass('motion-static')
    expect(inserted).not.toHaveClass('is-in')
  })

  it('recognizes a fine secondary pointer on hybrid devices', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(any-hover: hover) and (any-pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    expect(supportsFinePointer()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(any-hover: hover) and (any-pointer: fine)')
  })
})
