export type BgName = 'qianli' | 'qingming' | 'fuchun' | 'zaochun' | 'xishan'

export const BG_NAMES: BgName[] = ['qianli', 'qingming', 'fuchun', 'zaochun', 'xishan']

export type Painting = {
  label: string
  full: string
  src: string
  pos: string
}

export const PAINTINGS: Record<BgName, Painting> = {
  qianli: {
    label: '千里',
    full: '千里江山图 · 北宋 王希孟',
    src: '/bg/qianli-bridge.jpg',
    pos: '50% 62%',
  },
  qingming: {
    label: '上河',
    full: '清明上河图 · 北宋 张择端',
    src: '/bg/qingming.jpg',
    pos: '50% 50%',
  },
  fuchun: {
    label: '富春',
    full: '富春山居图 · 元 黄公望',
    src: '/bg/fuchun.jpg',
    pos: '50% 52%',
  },
  zaochun: {
    label: '早春',
    full: '早春图 · 北宋 郭熙',
    src: '/bg/zaochun.jpg',
    pos: '50% 42%',
  },
  xishan: {
    label: '行旅',
    full: '溪山行旅图 · 北宋 范宽',
    src: '/bg/xishan.jpg',
    pos: '50% 38%',
  },
}

export function isBgName(v: unknown): v is BgName {
  return typeof v === 'string' && (BG_NAMES as string[]).includes(v)
}
