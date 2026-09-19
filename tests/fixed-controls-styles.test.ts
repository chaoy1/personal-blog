import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

const layout = readStyles('app/layout.tsx')
const fixed = readStyles('app/fixed-controls.css')

describe('fixed corner control safe area', () => {
  it('loads the safe-area stylesheet last so it can override page paddings', () => {
    const globals = layout.indexOf("import './globals.css'")
    const fixedImport = layout.indexOf("import './fixed-controls.css'")

    expect(fixedImport).toBeGreaterThan(-1)
    expect(fixedImport).toBeGreaterThan(globals)
  })

  it('reserves a right gutter wide enough for the 归 seal at narrow widths', () => {
    // 印章 46px 宽 + 右侧 26px 留白 = 72px；通道至少要覆盖印章本体
    expect(fixed).toContain('--fixed-control-gutter: 62px')
    expect(fixed).toMatch(/@media \(max-width: 960px\)/)
    expect(fixed).toMatch(/@media \(max-width: 520px\)[\s\S]*--fixed-control-gutter: 54px/)
  })

  it('moves the offending content columns aside without touching the page sheets', () => {
    const gutter = 'var(--fixed-control-gutter)'
    // 按样式表里的实际写法断言，选择器分组与声明一一对应
    const rules = [
      `.timeline-page-body {\n    padding-right: ${gutter};\n  }`,
      `.album-page {\n    padding-right: ${gutter};\n  }`,
      `.posts-list {\n    padding-right: ${gutter};\n  }`,
      `.masthead,\n  .home-hero,\n  .home-section,\n  .home-footer {\n    padding-right: ${gutter};\n  }`,
      `.guestbook-layout {\n    padding-right: ${gutter};\n  }`,
    ]

    for (const rule of rules) {
      expect(fixed).toContain(rule)
    }
  })

  it('leaves the fragile paper sheets alone', () => {
    // 这些纸面带题签栅格，641–720px 区间加内边距会连带压到题签，刻意不动
    for (const selector of ['.posts-page', '.guestbook-sheet', '.about-scroll', '.article']) {
      expect(fixed).not.toMatch(new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{`))
    }
  })
})
