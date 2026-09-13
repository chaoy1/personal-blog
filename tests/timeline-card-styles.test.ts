import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cards = readFileSync(resolve(process.cwd(), 'components/TimelineReveal.css'), 'utf8')
const reveal = readFileSync(resolve(process.cwd(), 'components/TimelineReveal.tsx'), 'utf8')

/**
 * 时间轴三种内容卡片的差异化契约。
 *
 * 基线是这样的：globals.css 末尾给 .tl-card 统一加了
 *   朱红左边（border-left: 3px solid var(--seal-deep)）
 *   84×84 带 4px 卡纸边的缩略图
 *   右下角一枚极大的淡水印「录」
 * 所以三种内容"本来就长得一样"。
 *
 * 因此差异化的关键是**让出**：朱红边只留给文章，另外两种换成自己的记号。
 * 这组断言就是守这一点——如果哪天又给三者加上同一条边，这里会红。
 */
describe('timeline card differentiation', () => {
  it('keeps the vermilion rule for articles only', () => {
    // 文章不覆写边，沿用基线的朱红压边
    expect(cards).not.toMatch(/\.tl-post \.tl-card \{[\s\S]*?border-left/)
    // 光影与闲语显式让出
    expect(cards).toMatch(/\.tl-photo \.tl-card \{[\s\S]*?border-left-color: transparent;/)
    expect(cards).toMatch(/\.tl-moment \.tl-card \{[\s\S]*?border-left-color: transparent;/)
  })

  it('gives the article a heavier title and nothing else', () => {
    expect(cards).toMatch(/\.tl-post \.tl-title \{[\s\S]*?font-weight: 600;/)
    // 文章体不应改布局：不出现 padding / display / grid 之类的改写
    const block = cards.slice(
      cards.indexOf('.tl-post .tl-title {'),
      cards.indexOf('.tl-photo .tl-card {'),
    )
    expect(block).not.toMatch(/padding|display|grid-template|margin/)
  })

  it('lets the photo stand on its framed thumbnail instead of a rule', () => {
    // 缩略图的卡纸边来自基线，这里只加强投影，不重画尺寸与圆角
    expect(cards).toMatch(/\.tl-photo \.tl-thumb \{[\s\S]*?box-shadow:/)
    const block = cards.slice(cards.indexOf('.tl-photo .tl-thumb {'))
    const thumbRule = block.slice(0, block.indexOf('}'))
    expect(thumbRule).not.toMatch(/border\s*:|width:|height:|border-radius:/)
  })

  it('gives the moment a folded corner instead of a rule', () => {
    const block = cards.slice(
      cards.indexOf('.tl-moment .tl-card {'),
      cards.indexOf('/* 闲语不再用基线那枚大「录」水印'),
    )
    // 折角靠 clip-path 切出来
    expect(block).toMatch(/clip-path: polygon\(/)
    expect(block).toMatch(/--fold:/)
    // 折角要探出卡片，必须放行 overflow
    expect(block).toMatch(/overflow: visible;/)
    // clip-path 会把 box-shadow 一起裁掉，所以投影必须用 filter
    expect(block).toMatch(/box-shadow: none;/)
    expect(block).toMatch(/filter: drop-shadow\(/)
    // 基线那枚大「录」水印让给折角，不能两边都画
    expect(cards).toMatch(/\.tl-moment \.tl-card::after \{[\s\S]*?width: var\(--fold\);/)
    expect(cards).toMatch(/\.tl-moment \.tl-card::after \{[\s\S]*?content: "";/)
  })

  it('plays four entrance effects on the moment', () => {
    // fx1 折角落下
    expect(cards).toMatch(/animation: moment-drop /)
    expect(cards).toMatch(/@keyframes moment-drop/)
    // fx2 墨迹写就（揭字，不是扫过高亮带）
    expect(cards).toMatch(/@keyframes moment-write \{[\s\S]*?clip-path: inset\(0 100% 0 0\)/)
    // fx3 朱线随写
    expect(cards).toMatch(/@keyframes moment-rule-grow/)
    // fx4 落款盖印
    expect(cards).toMatch(/@keyframes moment-stamp/)
    // 四处都要挂上错峰
    for (const name of ['moment-drop', 'moment-corner', 'moment-write', 'moment-rule-grow', 'moment-stamp']) {
      expect(cards).toMatch(new RegExp(`${name}[^;]*var\\(--stagger`))
    }
  })

  it('staggers the notes in one year instead of firing them together', () => {
    expect(cards).toMatch(/\.tl-year-group > \.tl-item:nth-child\(2\) \{ --stagger: 0ms; \}/)
    expect(cards).toMatch(/\.tl-year-group > \.tl-item:nth-child\(3\) \{ --stagger: 110ms; \}/)
    // 越靠后的条目错峰越大
    expect(cards).toMatch(/nth-child\(n \+ 9\) \{ --stagger: 770ms; \}/)
    // 默认值只能写在 var() 的兜底位，写在 .tl-card 上会盖掉继承来的错峰
    const cardBlock = cards.slice(cards.indexOf('.tl-moment .tl-card {'), cards.indexOf('/* 闲语不再用基线'))
    expect(cardBlock).not.toMatch(/--stagger:/)
  })

  it('falls back to the final state when motion is reduced', () => {
    expect(cards).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.tl-moment \.tl-card,[\s\S]*?animation: none;/)
    expect(cards).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.tl-moment \.tl-tag::after \{[\s\S]*?height: calc\(100% \+ 46px\);/)
  })

  it('adds no markup: the card still uses the original element set', () => {
    // 三种差异全靠 CSS，组件里不应出现 tl-plate / tl-frame / tl-tail 之类的新结构
    for (const cls of ['tl-plate', 'tl-frame', 'tl-caption', 'tl-tail', 'tl-photo-frame']) {
      expect(reveal).not.toContain(cls)
    }
    // 原有的元素集合保持
    for (const cls of ['tl-card', 'tl-tag', 'tl-body', 'tl-thumb', 'tl-text', 'tl-kicker', 'tl-title', 'tl-excerpt', 'tl-more']) {
      expect(reveal).toContain(cls)
    }
  })
})
