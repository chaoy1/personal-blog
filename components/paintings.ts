export type BgName = 'qianli' | 'xiaoxiang' | 'quehua' | 'fuchun' | 'qingyuan'

export const BG_NAMES: BgName[] = ['qianli', 'xiaoxiang', 'quehua', 'fuchun', 'qingyuan']

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
  xiaoxiang: {
    label: '潇湘',
    full: '潇湘奇观图 · 南宋 米友仁',
    src: '/bg/xiaoxiang.jpg',
    pos: '50% 55%',
  },
  quehua: {
    label: '鹊华',
    full: '鹊华秋色图 · 元 赵孟頫',
    src: '/bg/quehua.jpg',
    pos: '50% 42%',
  },
  fuchun: {
    label: '富春',
    full: '富春山居图 · 元 黄公望',
    src: '/bg/fuchun.jpg',
    pos: '50% 45%',
  },
  qingyuan: {
    label: '清远',
    full: '溪山清远图 · 南宋 夏圭',
    src: '/bg/qingyuan.jpg',
    pos: '50% 50%',
  },
}

export function isBgName(v: unknown): v is BgName {
  return typeof v === 'string' && (BG_NAMES as string[]).includes(v)
}
