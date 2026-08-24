import { act, cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import ScrollUnfold from '@/components/ScrollUnfold'
import { UNFOLD_VERSION_KEY } from '@/lib/motion-policy'

const standardMotion = {
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
}

const startAnimationClock = () => act(() => vi.advanceTimersByTime(16))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('unfold-live', 'unfold-returning')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', vi.fn(() => standardMotion))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('shows the first-visit overlay and marks the document as actively unfolding', () => {
  document.documentElement.classList.add('unfold-preload')
  render(<ScrollUnfold />)

  expect(document.querySelector('.scroll-unfold')).toBeInTheDocument()
  expect(document.documentElement).toHaveClass('unfold-live')
})

test('plays the overlay again for returning visitors', () => {
  localStorage.setItem(UNFOLD_VERSION_KEY, UNFOLD_VERSION_KEY)

  render(<ScrollUnfold />)

  expect(document.querySelector('.scroll-unfold')).toBeInTheDocument()
  expect(document.documentElement).toHaveClass('unfold-live')
  expect(document.documentElement).not.toHaveClass('unfold-preload')
})

test('does not add moving unfold states when reduced motion is preferred', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ ...standardMotion, matches: true })))

  render(<ScrollUnfold />)

  expect(document.querySelector('.scroll-unfold')).not.toBeInTheDocument()
  expect(document.documentElement).not.toHaveClass('unfold-live')
  expect(document.documentElement).not.toHaveClass('unfold-returning')
})

test('does not persist a skip marker after the three-second overlay completes', () => {
  vi.useFakeTimers()

  render(<ScrollUnfold />)
  startAnimationClock()
  act(() => vi.advanceTimersByTime(3600))

  expect(localStorage.getItem(UNFOLD_VERSION_KEY)).toBeNull()
  expect(document.querySelector('.scroll-unfold')).not.toBeInTheDocument()
})

test('cleans up the active unfold class at the content-complete boundary', () => {
  vi.useFakeTimers()

  render(<ScrollUnfold />)
  startAnimationClock()
  act(() => vi.advanceTimersByTime(4199))
  expect(document.documentElement).toHaveClass('unfold-live')

  act(() => vi.advanceTimersByTime(1))
  expect(document.documentElement).not.toHaveClass('unfold-live')
})
