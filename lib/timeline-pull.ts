/**
 * 时间轴「续展旧卷」的拉拽手感。
 *
 * 抽成纯函数是为了能单独验证——手感调参时肉眼看动画很难判断，
 * 但这些性质是可以断言的（有台阶、台阶递增、速度越大越黏、回弹有节奏）。
 *
 * 手感由三层叠加而成：
 *   1) 台阶阻尼：位移不过连续增长，而是一格一格"咔"上去，每格都要先顶住
 *   2) 速度阻尼：甩得越快，同样滚动量换来的推进越少（像在糖浆里拉）
 *   3) 回弹节奏：回弹时长由"拉了几格 + 释放速度"共同决定，越深越沉
 */

export const PULL = {
  /** 最大可视位移（px） */
  max: 116,
  /** 阻尼台阶：位移按这个步长量化，形成一格一格的顿挫 */
  step: 22,
  /** 把台阶推上去所需的输入量（px）：这就是"阻尼"本体 */
  stepInput: 72,
  /**
   * 输入上限。台阶是 floor 出来的，所以输入略超过下一格线就够；
   * 留一点余量保证最后一格一定推得动。
   */
  maxInput: 72 * 5 + 20,
  /** 到位位移（px）：拉过这么多格就展开 */
  armDisplacement: 54,
  /** 最慢回弹（ms）：慢慢松手时的"阻尼感" */
  settleMs: 760,
  settleEase: 'cubic-bezier(0.22, 0.9, 0.24, 1)',
  /** 释放展开时的回弹（ms）：更利落，像卡榫松开 */
  releaseMs: 330,
  releaseEase: 'cubic-bezier(0.16, 0.9, 0.28, 1)',
  /** 展开动画时长（ms） */
  unfoldMs: 620,
  /**
   * 速度阻尼系数：deltaY/ms 到"削减比例"的换算。
   * 取值要让"有意图的慢拉"几乎不打折（否则会显得推不动、发木），
   * 只压住真正的猛甩。
   */
  velocityDamping: 0.08,
  /** 速度阻尼上限：再快也不会完全推不动 */
  maxVelocityDamping: 0.72,
} as const

/** 归一化的"拉拽程度"，0–1，喂给 CSS 的 --drag */
export function dragRatio(displacement: number): number {
  return Math.min(1, Math.max(0, displacement / PULL.max))
}

/** 台阶总数（不含起点） */
export const STEP_COUNT = Math.floor(PULL.max / PULL.step)

/**
 * 把连续输入量化成台阶。
 *
 * 只量化位移、不量化输入累计——因为输入一旦被量化就会封顶，
 * 后面的台阶永远推不动（踩过这个坑）。
 * 这里输入可以一直涨，只有显示出来的位置是跳变的。
 */
export function quantize(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0
  const index = Math.min(STEP_COUNT, Math.floor(input / PULL.stepInput))
  return Math.min(PULL.max, index * PULL.step)
}

/** 当前在第几格（0 表示还没推上去） */
export function stepIndex(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0
  return Math.min(STEP_COUNT, Math.floor(input / PULL.stepInput))
}

/** 距离下一格还差多少输入量，用于"顶住"的张力反馈 */
export function tensionToNextStep(input: number): number {
  const current = stepIndex(input)
  if (current >= STEP_COUNT) return 0
  const nextLine = (current + 1) * PULL.stepInput
  return Math.min(1, Math.max(0, (input - current * PULL.stepInput) / PULL.stepInput))
}

/** 是否已拉到位（位移口径） */
export function isArmed(displacement: number): boolean {
  return displacement >= PULL.armDisplacement
}

/**
 * 速度阻尼：滚动越快，同样滚动量推进得越少。
 * 慢拉时接近 1（几乎不削减），猛甩时被压到 maxVelocityDamping 以下。
 */
export function velocityFactor(deltaY: number, deltaMs: number): number {
  const speed = Math.abs(deltaY) / Math.max(1, deltaMs)
  const cut = Math.min(PULL.maxVelocityDamping, speed * PULL.velocityDamping)
  return 1 - cut
}

/** 带速度阻尼地推进输入量 */
export function advance(input: number, deltaY: number, deltaMs: number): number {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return Math.max(0, input)
  const next = Math.max(0, input) + deltaY * velocityFactor(deltaY, deltaMs)
  return Math.min(PULL.maxInput, next)
}

/**
 * 回弹时长。
 * releasing 为真表示这一下是"拉到位放开"，回得利落；
 * 否则是"没拉到位松手"，回得慢一些，带出阻尼的余韵。
 * 两种情况都随拉得深、松得快而变长。
 */
export function settleDuration(distance: number, velocity: number, releasing = false): number {
  const speed = Math.min(1.2, Math.abs(velocity) / 900)
  const depth = Math.min(1, Math.max(0, distance) / PULL.max)
  const base = releasing ? PULL.releaseMs : PULL.settleMs
  const spread = releasing ? 0.24 : 0.5
  return Math.round(base * (0.82 + spread * depth + 0.18 * speed))
}

/** 回弹曲线：释放时更利落 */
export function settleEase(releasing = false): string {
  return releasing ? PULL.releaseEase : PULL.settleEase
}
