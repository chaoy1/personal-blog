export type Quote = {
  text: string
  source: string
}

const QUOTES: Quote[] = [
  { text: '流光容易把人抛，红了樱桃，绿了芭蕉。', source: '蒋捷《一剪梅》' },
  { text: '人生如逆旅，我亦是行人。', source: '苏轼' },
  { text: '吹灭读书灯，一身都是月。', source: '桂苓' },
  { text: '我见青山多妩媚，料青山见我应如是。', source: '辛弃疾' },
  { text: '人间有味是清欢。', source: '苏轼' },
  { text: '山高月小，水落石出。', source: '苏轼' },
  { text: '且将新火试新茶，诗酒趁年华。', source: '苏轼' },
  { text: '一蓑烟雨任平生。', source: '苏轼' },
  { text: '醉后不知天在水，满船清梦压星河。', source: '唐珙' },
  { text: '柴门闻犬吠，风雪夜归人。', source: '刘长卿' },
  { text: '问渠那得清如许？为有源头活水来。', source: '朱熹' },
  { text: '落红不是无情物，化作春泥更护花。', source: '龚自珍' },
  { text: '最是人间留不住，朱颜辞镜花辞树。', source: '王国维' },
  { text: '山中何事？松花酿酒，春水煎茶。', source: '张可久' },
  { text: '浮生若梦，为欢几何。', source: '李白' },
  { text: '此心安处是吾乡。', source: '苏轼' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', source: '陆游' },
  { text: '人生到处知何似，应似飞鸿踏雪泥。', source: '苏轼' },
  { text: '采菊东篱下，悠然见南山。', source: '陶渊明' },
  { text: '桃李春风一杯酒，江湖夜雨十年灯。', source: '黄庭坚' },
  { text: '孤帆远影碧空尽，唯见长江天际流。', source: '李白' },
  { text: '千淘万漉虽辛苦，吹尽狂沙始到金。', source: '刘禹锡' },
  { text: '花有重开日，人无再少年。', source: '关汉卿' },
  { text: '岁寒，然后知松柏之后凋也。', source: '《论语》' },
  { text: '不畏浮云遮望眼，自缘身在最高层。', source: '王安石' },
  { text: '海上生明月，天涯共此时。', source: '张九龄' },
  { text: '天生我材必有用，千金散尽还复来。', source: '李白' },
  { text: '慢慢走，欣赏啊。', source: '朱光潜' },
  { text: '山回路转不见君，雪上空留马行处。', source: '岑参' },
  { text: '行到水穷处，坐看云起时。', source: '王维' },
  { text: '古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。', source: '苏轼' },
  { text: '凡是过往，皆为序章。', source: '莎士比亚' },
]

/** 按一年中的第几天取一句，每天不同 */
export function dailyQuote(now: Date = new Date()): Quote {
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return QUOTES[day % QUOTES.length]
}
