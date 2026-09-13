import { describe, expect, it } from 'vitest'
import {
  ARM_INPUT,
  PULL,
  displacedBy,
  dragRatio,
  isArmed,
  pullForDisplacement,
  settleDuration,
} from '@/lib/timeline-pull'

/**
 * 这些是弹簧手感的性质，不是具体数值。
 * 调参时（比如把软度从 190 改成 260）只要性质还成立，测试就该继续过。
 */
describe('timeline pull spring', () => {
  it('produces no displacement without a downward pull', () => {
    expect(displacedBy(0)).toBe(0)
    expect(displacedBy(-40)).toBe(0)
    expect(displacedBy(Number.NaN)).toBe(0)
  })

  it('grows monotonically and never overshoots the cap', () => {
    let previous = -1
    for (let pull = 1; pull <= 600; pull += 7) {
      const d = displacedBy(pull)
      expect(d).toBeGreaterThan(previous)
      expect(d).toBeLessThanOrEqual(PULL.max)
      previous = d
    }
    // 拉到头也仍然小于上限（渐近，不触顶）
    expect(displacedBy(PULL.max * 10)).toBeLessThan(PULL.max)
  })

  it('gets stiffer the further you pull', () => {
    // 同样加 40px 下拉量，后期换来的位移必须比前期少
    const early = displacedBy(40) - displacedBy(0)
    const mid = displacedBy(200) - displacedBy(160)
    const late = displacedBy(400) - displacedBy(360)
    expect(mid).toBeLessThan(early)
    expect(late).toBeLessThan(mid)
    expect(late).toBeGreaterThan(0)
  })

  /**
   * 这一条是针对一个真实 bug 的回归测试：
   * 早期版本按"位移"截断输入累计，位移在 53px 左右就饱和，
   * 而阈值定在 80px 以上，于是纸签永远拉不到底 —— 功能完全失效。
   * 现在的口径是：按输入累计、按位移判阈值，所以拉到阈值必然是可达的。
   */
  it('reaches the arm threshold within a realistic amount of wheel input', () => {
    // 触发所需的输入量由 armDisplacement 反推，两者不可能不一致
    expect(ARM_INPUT).toBeCloseTo(pullForDisplacement(PULL.armDisplacement), 6)
    // 滚轮一格约 45–100，两格内应当能拉到位
    expect(ARM_INPUT).toBeLessThan(200)
    expect(ARM_INPUT).toBeGreaterThan(60)

    // 按该输入量拉，位移必须已经过线
    expect(isArmed(displacedBy(ARM_INPUT))).toBe(true)
    // 而且一开始一定没过线（留出"拉拽过程"）
    expect(isArmed(displacedBy(ARM_INPUT * 0.3))).toBe(false)
  })

  it('arms exactly at the arm displacement', () => {
    expect(isArmed(PULL.armDisplacement - 0.01)).toBe(false)
    expect(isArmed(PULL.armDisplacement)).toBe(true)
    expect(isArmed(PULL.max)).toBe(true)
  })

  it('keeps the normalised drag inside 0–1', () => {
    expect(dragRatio(-10)).toBe(0)
    expect(dragRatio(0)).toBe(0)
    expect(dragRatio(PULL.max / 2)).toBeCloseTo(0.5, 5)
    expect(dragRatio(PULL.max)).toBe(1)
    expect(dragRatio(PULL.max * 3)).toBe(1)
  })

  it('settles longer when released deeper and faster', () => {
    const slow = settleDuration(20, 100)
    const deep = settleDuration(PULL.max, 100)
    const fast = settleDuration(20, 1400)
    expect(deep).toBeGreaterThan(slow)
    expect(fast).toBeGreaterThan(slow)
    // 上下都有界，避免出现"回弹一秒多"或"瞬间归位"
    expect(settleDuration(0, 0)).toBeGreaterThan(200)
    expect(settleDuration(PULL.max, 99999)).toBeLessThan(900)
  })
})
