import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BackgroundStage from '@/components/BackgroundStage'

type MotionSettings = {
  visible: boolean
  reduced: boolean
  saveData: boolean
}

const setMotionSettings = (initial: MotionSettings) => {
  const settings = { ...initial }
  const reducedListeners = new Set<(event: Event) => void>()

  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (settings.visible ? 'visible' : 'hidden'),
  })
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    get: () => ({ saveData: settings.saveData }),
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query === '(prefers-reduced-motion: reduce)' && settings.reduced
    },
    media: query,
    addEventListener: vi.fn((type: string, listener: (event: Event) => void) => {
      if (type === 'change' && query === '(prefers-reduced-motion: reduce)') reducedListeners.add(listener)
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

  return {
    update: (next: Partial<MotionSettings>) => Object.assign(settings, next),
    emitReducedMotionChange: () => reducedListeners.forEach((listener) => listener(new Event('change'))),
  }
}

describe('BackgroundStage ambient policy', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'light'
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete document.documentElement.dataset.theme
  })

  it.each<MotionSettings>([
    { visible: false, reduced: false, saveData: false },
    { visible: true, reduced: true, saveData: false },
    { visible: true, reduced: false, saveData: true },
  ])('omits ambient particles when motion must stop: %o', (settings) => {
    setMotionSettings(settings)

    const { container } = render(<BackgroundStage />)

    expect(container.querySelectorAll('canvas')).toHaveLength(0)
  })

  it('renders ambient particles only when visible, motion-safe, and not data-saving', () => {
    setMotionSettings({ visible: true, reduced: false, saveData: false })

    const { container } = render(<BackgroundStage />)

    expect(container.querySelectorAll('canvas')).toHaveLength(2)
  })

  it('stops ambient particles when the reduced-motion preference changes', () => {
    const motion = setMotionSettings({ visible: true, reduced: false, saveData: false })
    const { container } = render(<BackgroundStage />)

    act(() => {
      motion.update({ reduced: true })
      motion.emitReducedMotionChange()
    })

    expect(container.querySelectorAll('canvas')).toHaveLength(0)
  })
})
