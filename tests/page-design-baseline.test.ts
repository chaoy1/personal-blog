import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BASELINE_STATES,
  BASELINE_THEMES,
  BASELINE_VIEWPORTS,
  PAGE_DESIGN_ENTRIES,
  PAGE_SPEC_SECTIONS,
} from '@/tests/fixtures/page-design-baseline'

const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

describe('Phase 4 page design baseline', () => {
  it('freezes the required viewport, theme, and state matrix', () => {
    expect(BASELINE_VIEWPORTS.map(({ width }) => width)).toEqual([1440, 1024, 768, 390, 375, 360, 1280])
    expect(BASELINE_THEMES).toEqual(['light', 'dark'])
    expect(BASELINE_STATES).toEqual(['normal', 'loading', 'empty', 'error', 'success', 'permission'])
  })

  it('maps every indexed route to a local spec and source file', () => {
    const index = read('docs/superpowers/specs/pages/2026-09-15-page-design-index.md')
    for (const entry of PAGE_DESIGN_ENTRIES) {
      expect(index).toContain(`| ${entry.id} | \`${entry.route}\` | \`${entry.specFile}\``)
      expect(existsSync(resolve(root, `docs/superpowers/specs/pages/${entry.specFile}`))).toBe(true)
      expect(existsSync(resolve(root, entry.sourceFile))).toBe(true)
    }
    expect(PAGE_DESIGN_ENTRIES).toHaveLength(17)
  })

  it('requires every page spec to state its task, states, responsive rules, and acceptance', () => {
    for (const entry of PAGE_DESIGN_ENTRIES) {
      const spec = read(`docs/superpowers/specs/pages/${entry.specFile}`)
      for (const section of PAGE_SPEC_SECTIONS) expect(spec).toContain(`## ${section}`)
    }
  })
})
