import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const globals = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')
const refinement = readFileSync(resolve(process.cwd(), 'app/refinement.css'), 'utf8')
const studio = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')

describe('design system foundation', () => {
  it('defines semantic tokens and retains legacy compatibility variables', () => {
    expect(globals).toContain('--color-primary:')
    expect(globals).toContain('--color-background:')
    expect(globals).toContain('--color-surface:')
    expect(globals).toContain('--color-text-primary:')
    expect(globals).toContain('--color-text-secondary:')
    expect(globals).toContain('--color-text-muted:')
    expect(globals).toContain('--space-1: 4px')
    expect(globals).toContain('--space-16: 64px')
    expect(globals).toContain('--radius-pill: 999px')
    expect(globals).toContain('--container-readable: 680px')
    expect(globals).toContain('--container-wide: 1080px')
    expect(globals).toContain('--paper:')
    expect(globals).toContain('--ink:')
    expect(globals).toContain('--seal:')
    expect(globals).toContain('--rule:')
  })

  it('assigns the shared component rules to refinement.css only', () => {
    expect(refinement).toMatch(/\.article-nav > a\.article-nav-home,[\s\S]*min-height:\s*44px/)
    expect(refinement).toMatch(/\.page-intro\s*\{[\s\S]*var\(--container-default\)/)
    expect(studio.match(/(^|\n)\.article-nav\s*\{/g) ?? []).toHaveLength(0)
    expect(studio.match(/(^|\n)\.page-intro\s*\{/g) ?? []).toHaveLength(0)
  })

  it('keeps the migrated shared rules free of new important declarations', () => {
    const migratedSharedRules = [
      refinement.match(/\.article-nav\s*\{[\s\S]*?(?=\n\/\*|$)/)?.[0] ?? '',
      refinement.match(/\.page-intro\s*\{[\s\S]*?(?=\n\/\*|$)/)?.[0] ?? '',
    ].join('\n')

    expect(migratedSharedRules).not.toContain('!important')
  })

  it('uses semantic state tokens for the selected feedback and control styles', () => {
    expect(studio).toContain('background: var(--color-success)')
    expect(studio).toContain('background: var(--color-error)')
    expect(studio).toContain('background: var(--color-secondary)')
    expect(refinement).toContain('outline: 2px solid var(--color-primary)')
  })
})
