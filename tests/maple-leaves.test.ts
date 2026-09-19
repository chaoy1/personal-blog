import { describe, expect, it } from 'vitest'
import { leafCount } from '@/components/MapleLeaves'

describe('枫叶密度', () => {
  it('手机上一屏只留一小把叶子', () => {
    expect(leafCount(375, 780, false)).toBe(18)
    expect(leafCount(375, 780, true)).toBe(11)
  })

  it('随视口变大而增加，但撞到上限就不再变密', () => {
    expect(leafCount(1440, 900, false)).toBe(19)
    expect(leafCount(1920, 1080, false)).toBe(30)
    expect(leafCount(2560, 1440, false)).toBe(36)
    // 4K 及以上同样停在上限，不会把山水糊满。
    expect(leafCount(3840, 2160, false)).toBe(36)
  })

  it('夜里比白天疏', () => {
    expect(leafCount(1440, 900, true)).toBe(12)
    expect(leafCount(2560, 1440, true)).toBe(21)
    expect(leafCount(1440, 900, true)).toBeLessThan(leafCount(1440, 900, false))
  })

  it('比过去那档更疏，但没有少到看不出飘落', () => {
    // 旧档：density 1 / 0.62，上下限 22-44 / 14-26。
    const previous = (w: number, h: number, night: boolean) =>
      Math.max(night ? 14 : 22, Math.min(night ? 26 : 44, Math.round(((w * h) / 56000) * (night ? 0.62 : 1))))

    for (const [w, h] of [
      [375, 780],
      [1440, 900],
      [1920, 1080],
      [2560, 1440],
    ]) {
      for (const night of [false, true]) {
        const now = leafCount(w, h, night)
        expect(now).toBeLessThan(previous(w, h, night))
        expect(now).toBeGreaterThanOrEqual(night ? 11 : 18)
      }
    }
  })
})
