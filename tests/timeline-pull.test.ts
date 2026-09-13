import { describe, expect, it } from 'vitest'
import {
  PULL,
  STEP_COUNT,
  advance,
  dragRatio,
  isArmed,
  quantize,
  settleDuration,
  settleEase,
  stepIndex,
  tensionToNextStep,
  velocityFactor,
} from '@/lib/timeline-pull'

/**
 * 这些是阻尼手感的性质，不是具体数值。
 * 调参时（比如把台阶步长从 22 改成 28）只要性质还成立，测试就该继续过。
 */
describe('timeline pull damping', () => {
  it('produces no displacement without a downward pull', () => {
    expect(quantize(0)).toBe(0)
    expect(quantize(-40)).toBe(0)
    expect(quantize(Number.NaN)).toBe(0)
  })

  /**
   * 有节奏感的前提是"跳变"，不是连续增长。
   * 所以同一格之内位移必须完全不动。
   */
  it('holds still inside a step and jumps only at the breakpoints', () => {
    const seen: number[] = []
    for (let input = 0; input <= PULL.maxInput; input += 1) {
      const value = quantize(input)
      if (seen[seen.length - 1] !== value) seen.push(value)
    }
    // 位移只取台阶上的值，且逐级递增：0, 22, 44, ...
    expect(seen[0]).toBe(0)
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i] - seen[i - 1]).toBe(PULL.step)
    }
    expect(seen.length).toBeGreaterThanOrEqual(4)
  })

  it('never exceeds the cap and stays on a step boundary', () => {
    for (let input = 0; input <= PULL.maxInput * 3; input += 13) {
      const value = quantize(input)
      expect(value).toBeLessThanOrEqual(PULL.max)
      expect(value % PULL.step).toBe(0)
    }
  })

  it('reports the step index and never beyond the last step', () => {
    expect(stepIndex(0)).toBe(0)
    expect(stepIndex(PULL.stepInput - 1)).toBe(0)
    expect(stepIndex(PULL.stepInput)).toBe(1)
    expect(stepIndex(PULL.maxInput)).toBe(STEP_COUNT)
    expect(stepIndex(PULL.maxInput * 10)).toBe(STEP_COUNT)
  })

  /** 张力：一格之内从 0 涨到 1，跳格后归零——这就是"顶住再松开"的节奏 */
  it('ramps tension inside a step and resets it on each jump', () => {
    expect(tensionToNextStep(0)).toBe(0)
    expect(tensionToNextStep(PULL.stepInput / 2)).toBeCloseTo(0.5, 5)
    expect(tensionToNextStep(PULL.stepInput - 1)).toBeGreaterThan(0.98)
    // 刚过格线：新一格从 0 重新开始拉紧
    expect(tensionToNextStep(PULL.stepInput)).toBe(0)
    expect(tensionToNextStep(PULL.stepInput * 1.5)).toBeCloseTo(0.5, 5)
    // 推满之后不再有下一格
    expect(tensionToNextStep(PULL.maxInput)).toBe(0)
  })

  /** 阻尼本体：滚得越快，同样的滚动量推进得越少 */
  it('resists harder the faster the wheel moves', () => {
    const slow = velocityFactor(30, 32) // 有意图的慢拉
    const brisk = velocityFactor(60, 16) // 快拉
    const flung = velocityFactor(600, 16) // 猛甩

    expect(slow).toBeGreaterThan(brisk)
    expect(brisk).toBeGreaterThan(flung)
    // 慢拉几乎不打折（否则会显得发木、推不动）
    expect(slow).toBeGreaterThan(0.9)
    expect(flung).toBeLessThan(0.4)
    // 再快也不会完全推不动
    expect(flung).toBeGreaterThanOrEqual(1 - PULL.maxVelocityDamping - 1e-9)
  })

  it('advances input with damping and clamps at both ends', () => {
    // 同一次滚动量，间隔越长（越慢）推进越多
    const slow = advance(0, 60, 40)
    const fast = advance(0, 60, 4)
    expect(slow).toBeGreaterThan(fast)

    // 向上滚不推进（交给回弹处理）
    expect(advance(100, -40, 16)).toBe(100)
    expect(advance(-10, 40, 16)).toBeGreaterThan(0)
    // 有上限，避免无限累加
    expect(advance(PULL.maxInput, 9999, 100)).toBe(PULL.maxInput)
  })

  /**
   * 这一条是针对一个真实 bug 的回归测试：
   * 早期版本按"位移"截断输入累计，位移在 53px 就饱和，
   * 而阈值定在 80px 以上，于是纸签永远拉不到底 —— 功能完全失效。
   * 现在的口径是：输入按阻尼累加且有天花板，位移按输入量化，
   * 所以"到位"必须是在输入上限之内可达的。
   */
  it('reaches the arm threshold before the input ceiling', () => {
    // 推满整个输入上限，最终位移必须已经过线
    const full = quantize(PULL.maxInput)
    expect(isArmed(full)).toBe(true)
    // 而且一开始一定没过线（留出"拉拽过程"）
    expect(isArmed(quantize(PULL.stepInput))).toBe(false)
    // 到位所需的输入量要在上限之内，否则又是一个死区
    const needed = Math.ceil(PULL.armDisplacement / PULL.step) * PULL.stepInput
    expect(needed).toBeLessThanOrEqual(PULL.maxInput)
    // 慢拉（不打折）时，到位所需的滚动量是现实可达的
    const inputs: number[] = []
    let input = 0
    while (!isArmed(quantize(input)) && input < PULL.maxInput) {
      input = advance(input, 60, 40)
      inputs.push(input)
    }
    expect(isArmed(quantize(input))).toBe(true)
    expect(inputs.length).toBeLessThanOrEqual(6)
  })

  it('arms exactly at the arm displacement', () => {
    expect(isArmed(PULL.armDisplacement - 1)).toBe(false)
    expect(isArmed(PULL.armDisplacement)).toBe(true)
  })

  it('keeps the normalised drag inside 0–1', () => {
    expect(dragRatio(-10)).toBe(0)
    expect(dragRatio(0)).toBe(0)
    expect(dragRatio(PULL.max / 2)).toBeCloseTo(0.5, 5)
    expect(dragRatio(PULL.max)).toBe(1)
    expect(dragRatio(PULL.max * 3)).toBe(1)
  })

  /** 节奏：回弹要有可感的时长差，否则弹几下就麻木了 */
  it('settles slower when released gently and deeper, and crisp when released', () => {
    const shallow = settleDuration(PULL.step, 100)
    const deep = settleDuration(PULL.max, 100)
    const flung = settleDuration(PULL.max, 1400)
    expect(deep).toBeGreaterThan(shallow)
    expect(flung).toBeGreaterThan(deep)

    // 阻尼感要求回弹本身是可感的慢动作，不能一瞬归位
    expect(settleDuration(0, 0)).toBeGreaterThan(500)
    // 但也不能拖到像卡住
    expect(settleDuration(PULL.max, 99999)).toBeLessThan(1200)
    // 每深一格的时长差要能看出来（>15ms），否则节奏被抹平
    expect(settleDuration(PULL.max, 100) - settleDuration(PULL.max - PULL.step, 100)).toBeGreaterThan(15)
  })

  it('releases crisply when the pull actually lands', () => {
    const gentle = settleDuration(PULL.armDisplacement, 0, false)
    const released = settleDuration(PULL.armDisplacement, 0, true)
    // 拉到位是"卡榫松开"，必须比没拉到位松手更利落
    expect(released).toBeLessThan(gentle)
    expect(settleEase(false)).toBe(PULL.settleEase)
    expect(settleEase(true)).toBe(PULL.releaseEase)
    expect(settleEase(true)).not.toBe(settleEase(false))
  })
})
