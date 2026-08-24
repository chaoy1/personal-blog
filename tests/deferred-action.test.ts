import { afterEach, describe, expect, it, vi } from 'vitest'
import { scheduleDeferredAction } from '@/lib/deferred-action'

afterEach(() => {
  vi.useRealTimers()
})

describe('scheduleDeferredAction', () => {
  it('does not run a cancelled deferred action', () => {
    vi.useFakeTimers()
    const run = vi.fn()
    const action = scheduleDeferredAction(run, 5000)

    action.cancel()
    vi.advanceTimersByTime(5000)

    expect(run).not.toHaveBeenCalled()
  })

  it('flushes the deferred request exactly once', async () => {
    vi.useFakeTimers()
    const run = vi.fn().mockResolvedValue(undefined)
    const action = scheduleDeferredAction(run, 5000)

    await Promise.all([action.flush(), action.flush()])
    vi.advanceTimersByTime(5000)

    expect(run).toHaveBeenCalledTimes(1)
  })
})
