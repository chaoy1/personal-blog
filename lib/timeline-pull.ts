/**
 * 时间轴「续展旧卷」的拉拽手感。
 *
 * 抽成纯函数是为了能单独验证——弹簧系数调错时，肉眼看动画很难判断，
 * 但位移曲线的性质是可以断言的（单调、有上界、越拉越沉）。
 */

export const PULL = {
  /** 最大可视位移（px）：拉到头也不会无限伸长 */
  max: 116,
  /** 软度：越大越"沉"，同样的下拉量换来的位移越少 */
  softness: 190,
  /** 位移到达这个值就算"拉到位"，开始展开 */
  armDisplacement: 56,
  /** 一次回弹的基准时长（ms） */
  settleMs: 520,
  settleEase: 'cubic-bezier(0.2, 0.8, 0.24, 1)',
  /** 展开动画时长（ms） */
  unfoldMs: 620,
} as const

/**
 * 触发所需的输入量。
 * 由 armDisplacement 反推，不单独手写——两个数一旦不一致，
 * 就会出现"看着拉满了却永远不触发"的死区
 * （早期版本正是这个 bug：位移 53px 就饱和，阈值却要 80px 以上）。
 */
export const ARM_INPUT = -PULL.softness * Math.log(1 - PULL.armDisplacement / PULL.max)

/**
 * 位移曲线：越拉越沉，渐近逼近 max。
 * d(p) = max · (1 − e^(−p/softness))
 *
 * 注意这也是输入累计方式——每多拉一点，位移增量都在变小，
 * 所以 p 会一路涨到阈值以上，而位移始终不超过 max。
 * （踩过的坑：若按位移截断，位移会在远低于阈值处饱和，永远拉不到位。）
 */
export function displacedBy(pull: number): number {
  if (!Number.isFinite(pull) || pull <= 0) return 0
  return PULL.max * (1 - Math.exp(-pull / PULL.softness))
}

/** 把位移反推回所需的输入量，便于按"位移"设定阈值 */
export function pullForDisplacement(displacement: number): number {
  const clamped = Math.min(PULL.max - 0.001, Math.max(0, displacement))
  return -PULL.softness * Math.log(1 - clamped / PULL.max)
}


/**
 * 回弹时长：拽得越深、松手越快，回弹越久。
 * 释放速度参与计算，所以"猛地一拽"松手会比"慢慢停住"更有余韵。
 */
export function settleDuration(distance: number, velocity: number): number {
  // 速度上限 1.2：再快的甩动也不该拖到近一秒，否则像卡住
  const speed = Math.min(1.2, Math.abs(velocity) / 900)
  const depth = Math.min(0.5, Math.max(0, distance) / PULL.max)
  return Math.round(PULL.settleMs * (0.62 + 0.4 * speed + depth))
}

/** 归一化的"拉拽程度"，0–1，喂给 CSS 的 --drag */
export function dragRatio(displacement: number): number {
  return Math.min(1, Math.max(0, displacement / PULL.max))
}

/** 是否已拉到位（位移口径） */
export function isArmed(displacement: number): boolean {
  return displacement >= PULL.armDisplacement
}
