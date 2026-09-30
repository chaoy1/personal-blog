import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'app/moments.css'), 'utf8')
const sheet = postcss.parse(css)

describe('confirmed moments design accessibility and scope', () => {
  it('scopes every visual rule to the moments page', () => {
    sheet.walkRules(rule => {
      expect(rule.selectors.every(selector => selector.includes('.moments-page'))).toBe(true)
    })
  })
  it('only enables hidden entrance states after ScrollFX is ready', () => {
    const hiddenSelectors: string[] = []
    sheet.walkDecls('opacity', declaration => {
      if (declaration.value === '0') hiddenSelectors.push((declaration.parent as postcss.Rule).selector)
    })
    expect(hiddenSelectors.filter(selector => selector.includes('.moment.reveal')).every(selector => selector.includes('.motion-ready') && selector.includes(':not(.is-in)'))).toBe(true)
    expect(css).toContain('.moments-page [hidden]')
    expect(css).toContain('prefers-reduced-motion:reduce')
  })
  it('keeps the static cinnabar edge and bundled paper assets in both themes', () => {
    expect(css).toContain('--rule-span:33.3333%')
    expect(css).toContain('width:var(--rule-span)')
    expect(css).toContain('/bg/guestbook-paper-fibers.svg')
    expect(css).toContain('/fonts/hongleixingshu/font.css')
    expect(css).toContain(':root[data-theme="dark"] .moments-page')
  })
})
